// ─── Impact (énergie, eau, CO₂) ──────────────────────────────────────────────
// Factors derived from public research on LLM inference environmental cost.
// Sources cited in the Impact page UI for transparency.
//
// Energy / token — back-solved from Epoch AI ChatGPT data (0.3 Wh for 500 output
// tokens ≈ 2.5 Wh for 10k input + 530 output) and Anthropic pricing ratios
// (output costs 5× input, cache reads cost 10× less than input).

export const TOKEN_ENERGY_WH = {
  input: 0.00039,        // 390 Wh / MTok — baseline
  output: 0.00195,       // 1 950 Wh / MTok — 5× input (mirrors Anthropic pricing)
  cacheWrite: 0.00049,   // 490 Wh / MTok — slightly above input
  cacheRead: 0.000039,   // 39 Wh / MTok — 10× cheaper (cache efficiency)
} as const

/** Grid carbon intensity (kg CO₂e per kWh == g CO₂e per Wh). */
export const CARBON_INTENSITY = {
  us: 0.287,   // US moyenne (défaut — cohérent avec études académiques)
  eu: 0.25,    // EU moyenne
  fr: 0.06,    // France (mix nucléaire dominant)
} as const

export type Region = keyof typeof CARBON_INTENSITY

export const REGION_LABELS: Record<Region, string> = {
  us: '🇺🇸 US',
  eu: '🇪🇺 EU',
  fr: '🇫🇷 FR',
}

export const INFRA = {
  /** Power Usage Effectiveness — AWS datacenter overhead */
  pue: 1.14,
  /** Water Usage Effectiveness — L / kWh ≡ mL / Wh */
  water_ml_per_wh: 1.8,
} as const

/** Model-size energy multiplier, relative to Sonnet baseline. */
export function modelSizeMultiplier(model: string): number {
  if (/opus/i.test(model)) return 2.5
  if (/haiku/i.test(model)) return 0.4
  return 1.0 // sonnet + unknown default
}

export interface TokenCounts {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
}

export interface ImpactResult {
  energy_wh: number
  co2_g: number
  water_ml: number
}

/** Core formula: tokens → (energy, CO₂, water). */
export function computeImpact(
  model: string,
  tokens: TokenCounts,
  region: Region = 'us',
): ImpactResult {
  const m = modelSizeMultiplier(model)
  const rawWh =
    tokens.input * TOKEN_ENERGY_WH.input * m +
    tokens.output * TOKEN_ENERGY_WH.output * m +
    tokens.cacheWrite * TOKEN_ENERGY_WH.cacheWrite * m +
    tokens.cacheRead * TOKEN_ENERGY_WH.cacheRead * m
  const energy_wh = rawWh * INFRA.pue
  return {
    energy_wh,
    co2_g: energy_wh * CARBON_INTENSITY[region],
    water_ml: energy_wh * INFRA.water_ml_per_wh,
  }
}

/** Zero impact — convenient for reducers. */
export const EMPTY_IMPACT: ImpactResult = { energy_wh: 0, co2_g: 0, water_ml: 0 }

/**
 * Per-token-type Wh factors blended by the real model mix, computed from
 * stats.modelUsage. Each factor already includes PUE and the size multiplier.
 * Use this to compute impact from session-level token counts when the per-
 * session model is unknown — gives a realistic number anchored in the user's
 * actual mix (Opus/Sonnet/Haiku ratios).
 */
export interface BlendedEnergyFactors {
  /** Wh per input token, weighted by user's model mix + PUE applied. */
  input: number
  output: number
  cacheWrite: number
  cacheRead: number
}

interface ModelUsageLike {
  inputTokens?: number
  outputTokens?: number
  cacheReadInputTokens?: number
  cacheCreationInputTokens?: number
}

/**
 * Compute blended Wh-per-token factors from modelUsage (stats-cache).
 *
 * For each token type, we compute a weighted average of
 * `TOKEN_ENERGY_WH[type] × modelSizeMultiplier(model)` where the weights
 * are the token volumes each model contributed to that type.
 *
 * Fallback = Opus-4-6 factors if modelUsage is missing / empty.
 */
export function blendedEnergyFactors(
  modelUsage: Record<string, ModelUsageLike> | undefined | null,
): BlendedEnergyFactors {
  const totals = { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 }
  const weighted = { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 }

  for (const [model, u] of Object.entries(modelUsage ?? {})) {
    const mult = modelSizeMultiplier(model)
    const iT = u.inputTokens ?? 0
    const oT = u.outputTokens ?? 0
    const cwT = u.cacheCreationInputTokens ?? 0
    const crT = u.cacheReadInputTokens ?? 0

    totals.input += iT
    totals.output += oT
    totals.cacheWrite += cwT
    totals.cacheRead += crT

    weighted.input += iT * TOKEN_ENERGY_WH.input * mult
    weighted.output += oT * TOKEN_ENERGY_WH.output * mult
    weighted.cacheWrite += cwT * TOKEN_ENERGY_WH.cacheWrite * mult
    weighted.cacheRead += crT * TOKEN_ENERGY_WH.cacheRead * mult
  }

  // Fallback to Opus factors if modelUsage is empty
  const fallbackMult = modelSizeMultiplier('claude-opus-4-6')
  return {
    input:     totals.input      > 0 ? (weighted.input      / totals.input)      * INFRA.pue : TOKEN_ENERGY_WH.input      * fallbackMult * INFRA.pue,
    output:    totals.output     > 0 ? (weighted.output     / totals.output)     * INFRA.pue : TOKEN_ENERGY_WH.output     * fallbackMult * INFRA.pue,
    cacheWrite: totals.cacheWrite > 0 ? (weighted.cacheWrite / totals.cacheWrite) * INFRA.pue : TOKEN_ENERGY_WH.cacheWrite * fallbackMult * INFRA.pue,
    cacheRead:  totals.cacheRead  > 0 ? (weighted.cacheRead  / totals.cacheRead)  * INFRA.pue : TOKEN_ENERGY_WH.cacheRead  * fallbackMult * INFRA.pue,
  }
}

/** Apply blended factors to a token count → impact (energy, CO2, water). */
export function impactFromBlended(
  tokens: TokenCounts,
  factors: BlendedEnergyFactors,
  region: Region = 'us',
): ImpactResult {
  const energy_wh =
    tokens.input * factors.input +
    tokens.output * factors.output +
    tokens.cacheWrite * factors.cacheWrite +
    tokens.cacheRead * factors.cacheRead
  return {
    energy_wh,
    co2_g: energy_wh * CARBON_INTENSITY[region],
    water_ml: energy_wh * INFRA.water_ml_per_wh,
  }
}

export function addImpact(a: ImpactResult, b: ImpactResult): ImpactResult {
  return {
    energy_wh: a.energy_wh + b.energy_wh,
    co2_g: a.co2_g + b.co2_g,
    water_ml: a.water_ml + b.water_ml,
  }
}

// ─── Formatters ───────────────────────────────────────────────────────────────

/** Wh → display: "1.2 kWh", "430 Wh", "2.3 MWh". */
export function formatEnergy(wh: number): string {
  if (wh >= 1_000_000) return `${(wh / 1_000_000).toFixed(2)} MWh`
  if (wh >= 1_000) return `${(wh / 1_000).toFixed(2)} kWh`
  if (wh >= 1) return `${wh.toFixed(1)} Wh`
  return `${(wh * 1000).toFixed(0)} mWh`
}

/** mL → display: "4.2 L", "320 mL", "1.2 kL". */
export function formatWater(ml: number): string {
  if (ml >= 1_000_000) return `${(ml / 1_000_000).toFixed(2)} kL`
  if (ml >= 1_000) return `${(ml / 1_000).toFixed(2)} L`
  return `${ml.toFixed(0)} mL`
}

/** g CO₂ → display: "1.4 kg", "320 g", "12 t". */
export function formatCo2(g: number): string {
  if (g >= 1_000_000) return `${(g / 1_000_000).toFixed(2)} t`
  if (g >= 1_000) return `${(g / 1_000).toFixed(2)} kg`
  return `${g.toFixed(0)} g`
}

// ─── Équivalences (relatable comparisons) ────────────────────────────────────

/**
 * Reference values used for "X ≈ Y" comparisons on the Impact page.
 * Kept here so they can be cited in the factors table too.
 */
export const EQUIVALENCES = {
  energy: {
    led_hours: 10,          // Wh / h (ampoule LED 10W, 1h)
    smartphone_charge: 15,  // Wh / charge (batterie smartphone ~15 Wh)
    ev_km: 200,             // Wh / km (voiture électrique efficiente)
    washing_machine: 1000,  // Wh / cycle lave-linge
  },
  water: {
    glass: 250,             // mL / verre
    bottle: 500,            // mL / bouteille
    shower: 60_000,         // mL / douche courte (60 L)
  },
  co2: {
    petrol_car_km: 120,     // g / km voiture essence moyenne
    paris_ny_flight: 1_000_000, // g / passager vol Paris-NY (1 t)
    beef_kg: 27_000,        // g CO₂ / kg de bœuf (FAO, filière entière)
  },
} as const
