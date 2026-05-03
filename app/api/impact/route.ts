import { NextRequest, NextResponse } from 'next/server'
import { readStatsCache, getSessions } from '@/lib/claude-reader'
import {
  blendedEnergyFactors,
  impactFromBlended,
  computeImpact,
  EMPTY_IMPACT,
  addImpact,
  type Region,
} from '@/lib/impact'
import type {
  ImpactAnalytics,
  ModelImpact,
  DailyImpact,
  TokenTypeImpact,
  ImpactBreakdown,
} from '@/types/claude'

export const dynamic = 'force-dynamic'

function parseRegion(r: string | null): Region {
  if (r === 'eu' || r === 'fr') return r
  return 'us'
}

export async function GET(req: NextRequest) {
  const region = parseRegion(req.nextUrl.searchParams.get('region'))

  const [stats, sessions] = await Promise.all([readStatsCache(), getSessions()])
  if (!stats) {
    return NextResponse.json({ error: 'stats-cache.json not found' }, { status: 404 })
  }

  // Model mix comes from stats.modelUsage (snapshot, may be stale), session
  // volumes come from the live on-disk sessions. Blended factors weight the
  // Wh-per-token-type by the user's actual Opus/Sonnet/Haiku ratios so that
  // applying them to session tokens gives a realistic number.
  const factors = blendedEnergyFactors(stats.modelUsage)

  // ── Aggregate session tokens + per-day impact ─────────────────────────────
  const dailyMap = new Map<string, ImpactBreakdown>()
  const totalTokens = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
  const byType: TokenTypeImpact = {
    input: { ...EMPTY_IMPACT },
    output: { ...EMPTY_IMPACT },
    cache_read: { ...EMPTY_IMPACT },
    cache_write: { ...EMPTY_IMPACT },
  }
  let total: ImpactBreakdown = { ...EMPTY_IMPACT }

  for (const s of sessions) {
    const day = (s.start_time ?? '').slice(0, 10)
    const tokens = {
      input: s.input_tokens ?? 0,
      output: s.output_tokens ?? 0,
      cacheRead: s.cache_read_input_tokens ?? 0,
      cacheWrite: s.cache_creation_input_tokens ?? 0,
    }
    totalTokens.input += tokens.input
    totalTokens.output += tokens.output
    totalTokens.cacheRead += tokens.cacheRead
    totalTokens.cacheWrite += tokens.cacheWrite

    const sessionImpact = impactFromBlended(tokens, factors, region)
    total = addImpact(total, sessionImpact)

    if (day) {
      const existing = dailyMap.get(day) ?? { ...EMPTY_IMPACT }
      dailyMap.set(day, addImpact(existing, sessionImpact))
    }

    // Per-token-type buckets (for the donut)
    byType.input = addImpact(byType.input,
      impactFromBlended({ input: tokens.input, output: 0, cacheRead: 0, cacheWrite: 0 }, factors, region))
    byType.output = addImpact(byType.output,
      impactFromBlended({ input: 0, output: tokens.output, cacheRead: 0, cacheWrite: 0 }, factors, region))
    byType.cache_read = addImpact(byType.cache_read,
      impactFromBlended({ input: 0, output: 0, cacheRead: tokens.cacheRead, cacheWrite: 0 }, factors, region))
    byType.cache_write = addImpact(byType.cache_write,
      impactFromBlended({ input: 0, output: 0, cacheRead: 0, cacheWrite: tokens.cacheWrite }, factors, region))
  }

  const daily: DailyImpact[] = [...dailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, impact]) => ({ date, ...impact }))

  // ── Per-model breakdown ──────────────────────────────────────────────────
  // Use modelUsage per-type ratios to allocate session tokens to each model,
  // then compute each model's impact with its real size multiplier. This keeps
  // the per-model chart aligned with the total (Σ models = total).
  const usage = stats.modelUsage ?? {}
  const modelTotals = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
  for (const u of Object.values(usage)) {
    modelTotals.input     += u.inputTokens ?? 0
    modelTotals.output    += u.outputTokens ?? 0
    modelTotals.cacheRead += u.cacheReadInputTokens ?? 0
    modelTotals.cacheWrite += u.cacheCreationInputTokens ?? 0
  }

  const models: ModelImpact[] = Object.entries(usage).map(([model, u]) => {
    const share = {
      input:     modelTotals.input      > 0 ? (u.inputTokens ?? 0)              / modelTotals.input      : 0,
      output:    modelTotals.output     > 0 ? (u.outputTokens ?? 0)             / modelTotals.output     : 0,
      cacheRead: modelTotals.cacheRead  > 0 ? (u.cacheReadInputTokens ?? 0)     / modelTotals.cacheRead  : 0,
      cacheWrite: modelTotals.cacheWrite > 0 ? (u.cacheCreationInputTokens ?? 0) / modelTotals.cacheWrite : 0,
    }
    const allocated = {
      input:     totalTokens.input      * share.input,
      output:    totalTokens.output     * share.output,
      cacheRead: totalTokens.cacheRead  * share.cacheRead,
      cacheWrite: totalTokens.cacheWrite * share.cacheWrite,
    }
    const impact = computeImpact(model, allocated, region)
    return {
      model,
      ...impact,
      input_tokens: allocated.input,
      output_tokens: allocated.output,
      cache_read_tokens: allocated.cacheRead,
      cache_write_tokens: allocated.cacheWrite,
    }
  }).sort((a, b) => b.energy_wh - a.energy_wh)

  // Tiny numerical drift fixup so the sum of models exactly matches total.
  // (The blended factor is a weighted mean → by construction the two are equal
  // up to rounding; this enforces it at the display layer.)
  const modelSumEnergy = models.reduce((s, m) => s + m.energy_wh, 0)
  if (modelSumEnergy > 0 && Math.abs(modelSumEnergy - total.energy_wh) / total.energy_wh > 0.005) {
    const k = total.energy_wh / modelSumEnergy
    for (const m of models) {
      m.energy_wh *= k
      m.water_ml *= k
      m.co2_g *= k
    }
  }
  const result: ImpactAnalytics = {
    ...total,
    region,
    models,
    daily,
    by_token_type: byType,
  }
  return NextResponse.json(result)
}
