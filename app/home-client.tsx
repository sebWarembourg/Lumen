'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { Coffee, Leaf, ArrowRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatCo2 } from '@/lib/impact'
// ─── Types ────────────────────────────────────────────────────────────────────

interface HomeData {
  week: {
    sessions: number
    messages: number
    active_days: number
    cost_usd: number
    cost_delta_pct: number | null
  }
  top_project: { name: string; sessions: number } | null
  cache_efficiency_pct: number
  last_disconnection: { from: string; to: string; days: number } | null
  co2_all_time_g: number
  co2_car_km: number
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const [, month, day] = iso.split('-')
  const months = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc']
  return `${parseInt(day!)} ${months[parseInt(month!) - 1]}`
}

function formatCost(usd: number): string {
  if (usd < 0.01) return '$0'
  if (usd < 1) return `$${usd.toFixed(2)}`
  return `$${usd.toFixed(1)}`
}

function weekDateRange(): string {
  const now = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - 6)
  return `du ${formatDate(start.toISOString().slice(0, 10))} au ${formatDate(now.toISOString().slice(0, 10))}`
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function HomeClient() {
  const { data: d, isLoading } = useSWR<HomeData>('/api/home', fetcher, {
    refreshInterval: 60_000,
  })

  return (
    <div className="flex flex-col">

      {/* ── Hero ── */}
      <div className="home-hero-bg relative px-14 pb-12 pt-16 border-b border-border">
        <p className="absolute right-14 top-14 text-right text-sm text-muted-foreground max-w-[220px] leading-relaxed">
          Comprendre ton usage est la clé pour l&apos;améliorer.
        </p>

        <p className="home-hero-accent font-mono text-[11px] tracking-[0.22em] uppercase mb-1">
          Ta semaine en un chiffre
        </p>

        {!d ? (
          <Skeleton className="h-36 w-64 mb-3" />
        ) : (
          <Link href="/overview">
            <p
              className="home-hero-number font-bold leading-none tracking-[-6px] select-none cursor-pointer hover:opacity-80 transition-opacity"
              style={{ fontSize: 'clamp(96px, 14vw, 160px)' }}
            >
              {d.week.messages.toLocaleString('fr-FR')}
            </p>
          </Link>
        )}

        <p className="text-xl text-muted-foreground mt-2 font-light">
          messages échangés · {weekDateRange()}
        </p>
      </div>

      {/* ── KPI Strip ── */}
      <div className="flex border-b border-border">
        {isLoading || !d ? (
          <div className="flex flex-1 gap-0 px-14 py-7">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={cn('flex-1 px-7 space-y-1.5', i > 0 && 'border-l border-border')}>
                <Skeleton className="h-10 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <KpiItem value={String(d.week.sessions)} label="sessions" first />
            <KpiItem value={`${d.week.active_days}/7`} label="jours actifs" accentValue />
            <KpiItem value={`${d.cache_efficiency_pct}%`} label="tokens en cache" accentValue />
            <KpiItem value={formatCost(d.week.cost_usd)} label="coût semaine" />
          </>
        )}
      </div>

      {/* ── Highlights ── */}
      <div className="grid grid-cols-3 gap-4 px-14 pt-8 pb-4">
        {isLoading || !d ? (
          <>
            {[...Array(3)].map((_, i) => (
              <HighlightSkeleton key={i} />
            ))}
          </>
        ) : (
          <>
            <HighlightCard
              label="Top projet"
              value={d.top_project?.name ?? '—'}
              sub={d.top_project ? `${d.top_project.sessions} sessions` : 'Aucun projet actif'}
              href="/projects"
            />
            <HighlightCard
              label="Coût"
              value={formatCost(d.week.cost_usd)}
              sub="cette semaine"
              trend={d.week.cost_delta_pct}
              href="/costs"
            />
            <HighlightCard
              label="Cache"
              value={`${d.cache_efficiency_pct}%`}
              sub="des tokens depuis le cache"
              bar={d.cache_efficiency_pct}
              href="/costs"
            />
          </>
        )}
      </div>

      {/* ── Bien-être ── */}
      <div className="grid grid-cols-2 gap-4 px-14 pt-4 pb-14">
        {isLoading || !d ? (
          <>
            <HighlightSkeleton tall />
            <HighlightSkeleton tall />
          </>
        ) : (
          <>
            <WellbeingCard
              icon={Coffee}
              label="Dernière déconnexion"
              value={
                d.last_disconnection
                  ? `${d.last_disconnection.days} jour${d.last_disconnection.days > 1 ? 's' : ''}`
                  : '—'
              }
              sub={
                d.last_disconnection
                  ? `${formatDate(d.last_disconnection.from)} → ${formatDate(d.last_disconnection.to)}`
                  : 'Aucune pause de +24h détectée'
              }
              glow
              href="/activity"
            />
            <WellbeingCard
              icon={Leaf}
              label="Empreinte CO₂"
              value={formatCo2(d.co2_all_time_g)}
              sub={`≈ ${d.co2_car_km.toLocaleString('fr-FR')} km en voiture essence`}
              valueColor="#6ee7a0"
              href="/impact"
            />
          </>
        )}
      </div>

      {/* ── CTA ── */}
      <div className="px-14 pb-14 -mt-6">
        <Button variant="outline" asChild>
          <Link href="/overview" className="flex items-center gap-2">
            Voir le détail
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>

    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiItem({ value, label, accentValue = false, first = false }: {
  value: string; label: string; accentValue?: boolean; first?: boolean
}) {
  return (
    <>
      {!first && (
        <div className="flex items-center py-7">
          <div className="w-px h-16 bg-border" />
        </div>
      )}
      <div className="flex-1 px-8 py-7 space-y-1">
        <p
          className="font-mono text-[42px] font-bold tabular-nums tracking-[-0.025em] leading-none"
          style={accentValue ? { color: '#9d93ff' } : undefined}
        >
          {value}
        </p>
        <p className="text-[13px] text-muted-foreground">{label}</p>
      </div>
    </>
  )
}

function HighlightCard({ label, value, sub, bar, valueColor, trend, href }: {
  label: string; value: string; sub: string; bar?: number; valueColor?: string; trend?: number | null; href?: string
}) {
  const inner = (
    <div className={cn('bg-card border border-border rounded-xl px-6 py-5 space-y-3 h-full', href && 'hover:border-primary/50 transition-colors cursor-pointer')}>
      <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-muted-foreground">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p
          className="font-mono text-[34px] font-bold tabular-nums tracking-[-0.025em] leading-none text-foreground"
          style={valueColor ? { color: valueColor } : undefined}
        >
          {value}
        </p>
        {trend != null && (
          <span
            className="font-mono text-[15px] font-semibold mb-0.5"
            style={{ color: trend > 0 ? '#ff6b6b' : '#6ee7a0' }}
          >
            {trend > 0 ? '↗' : '↘'}{Math.abs(trend).toFixed(0)}%
          </span>
        )}
      </div>
      {bar != null && (
        <div className="h-[5px] rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(100, bar)}%`,
              background: 'linear-gradient(90deg, #6b5cff, #a78bff)',
            }}
          />
        </div>
      )}
      <p className="text-[13px] text-muted-foreground">{sub}</p>
    </div>
  )
  return href ? <Link href={href} className="h-full block">{inner}</Link> : inner
}

function WellbeingCard({ icon: Icon, label, value, sub, glow = false, valueColor, href }: {
  icon: React.ElementType; label: string; value: string; sub: string
  glow?: boolean; valueColor?: string; href?: string
}) {
  const inner = (
    <div
      className={cn(
        'border rounded-xl px-6 py-6 space-y-4 h-full',
        glow ? 'wellbeing-glow' : 'border-border',
        href && 'hover:border-primary/50 transition-colors cursor-pointer',
      )}
    >
      <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-muted-foreground flex items-center gap-2">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </p>
      <p
        className={cn('font-mono text-[46px] font-bold tabular-nums tracking-[-0.03em] leading-none', glow && !valueColor && 'wellbeing-glow-value')}
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </p>
      <p className="text-sm text-muted-foreground">{sub}</p>
    </div>
  )
  return href ? <Link href={href} className="h-full block">{inner}</Link> : inner
}

function HighlightSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <div className={cn('border border-border rounded-xl px-6 py-5 space-y-3', tall && 'py-7')}>
      <Skeleton className="h-3 w-20" />
      <Skeleton className={cn('w-28', tall ? 'h-12' : 'h-9')} />
      <Skeleton className="h-3 w-32" />
    </div>
  )
}
