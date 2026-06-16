'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { BarChart3, PieChart, Clock } from 'lucide-react'
import { LoadingOverlay } from '@/components/layout/loading-overlay'
import { UsageOverTimeChart } from '@/components/overview/usage-over-time-chart'
import { ModelBreakdownDonut } from '@/components/overview/model-breakdown-donut'
import { ProjectActivityDonut } from '@/components/overview/project-activity-donut'
import { PeakHoursChart } from '@/components/overview/peak-hours-chart'
import { OverviewConversationTable } from '@/components/overview/conversation-table'
import { StatCard } from '@/components/overview/stat-card'
import { formatTokens, formatBytes } from '@/lib/decode'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DateRangeSelector, DEFAULT_DATE_RANGE, resolveDateRange } from '@/components/layout/date-range-selector'
import type { StatsCache, DailyActivity, DailyTokens, CostAnalytics } from '@/types/claude'
import type { SessionWithFacet, ProjectSummary } from '@/types/claude'
import { format } from 'date-fns'
import { useTheme } from '@/components/theme-provider'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiResponse {
  stats: StatsCache
  computed: {
    totalCost: number
    totalCacheSavings: number
    totalTokens: number
    totalInputTokens: number
    totalOutputTokens: number
    totalCacheReadTokens: number
    totalCacheWriteTokens: number
    totalToolCalls: number
    activeDays: number
    avgSessionMinutes: number
    sessionsThisMonth: number
    sessionsThisWeek: number
    storageBytes: number
    sessionCount: number
  }
}

const fetcher = (url: string) =>
  fetch(url).then(r => {
    if (!r.ok) throw new Error(`API error ${r.status}`)
    return r.json()
  })

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeTrend(
  dailyActivity: DailyActivity[],
  field: 'messageCount' | 'sessionCount',
  days = 7,
): number | undefined {
  const sorted = [...dailyActivity].sort((a, b) => a.date.localeCompare(b.date))
  const recent = sorted.slice(-days)
  const previous = sorted.slice(-(days * 2), -days)
  if (!recent.length || !previous.length) return undefined
  const recentSum = recent.reduce((s, d) => s + (d[field] ?? 0), 0)
  const prevSum = previous.reduce((s, d) => s + (d[field] ?? 0), 0)
  if (prevSum === 0) return undefined
  return ((recentSum - prevSum) / prevSum) * 100
}

function getActivitySpark(dailyActivity: DailyActivity[], field: 'messageCount' | 'sessionCount', days = 14): number[] {
  return [...dailyActivity]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-days)
    .map(d => d[field] ?? 0)
}

function getTokenSpark(tokensByDate: DailyTokens[], days = 14): number[] {
  return [...tokensByDate]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-days)
    .map(d => Object.values(d.tokensByModel ?? {}).reduce((s, v) => s + v, 0))
}

/** Generic % trend over the last N days vs the previous N days for any per-day numeric series. */
function computeTrendFromSeries(series: { date: string; value: number }[], days = 7): number | undefined {
  const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date))
  const recent = sorted.slice(-days)
  const previous = sorted.slice(-(days * 2), -days)
  if (!recent.length || !previous.length) return undefined
  const recentSum = recent.reduce((s, d) => s + d.value, 0)
  const prevSum = previous.reduce((s, d) => s + d.value, 0)
  if (prevSum === 0) return undefined
  return ((recentSum - prevSum) / prevSum) * 100
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OverviewClient() {
  const { theme } = useTheme()
  const [range, setRange] = useState(resolveDateRange('30d', {}))

  const { data, error, isLoading } = useSWR<ApiResponse>('/api/stats', fetcher, {
    refreshInterval: 60_000,
  })
  const { data: sessionsData } = useSWR<{ sessions: SessionWithFacet[] }>('/api/sessions', fetcher, {
    refreshInterval: 60_000,
  })
  const { data: projectsData } = useSWR<{ projects: ProjectSummary[] }>('/api/projects', fetcher, {
    refreshInterval: 60_000,
  })
  const { data: costsData } = useSWR<CostAnalytics>('/api/costs', fetcher, {
    refreshInterval: 60_000,
  })

  const sessions = sessionsData?.sessions ?? []
  const projects = projectsData?.projects ?? []
  const projectCount = projects.length

  const chartDays = range.days
  const effectiveDateFrom = format(range.from, 'MM/dd/yyyy')
  const effectiveDateTo = format(range.to, 'MM/dd/yyyy')

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading || !data || !data.computed) {
    return <LoadingOverlay isLoading={true} label="Overview" />
  }

  if (error) {
    return (
      <div className="px-6 py-6 text-destructive text-sm font-mono">
        ✗ error loading data: {String(error)}
      </div>
    )
  }

  const { stats, computed } = data

  // Indigo for the main figure, semantic accents for cache, neutrals for the rest
  const indigo = theme === 'light' ? '#6366F1' : '#818CF8'
  const teal   = theme === 'light' ? '#14B8A6' : '#2DD4BF'
  const success = '#22C55E'
  const neutralStrong = theme === 'light' ? '#4B5563' : '#9CA0AB'
  const tokenSegs = [
    { label: 'input',       value: computed.totalInputTokens,      color: neutralStrong },
    { label: 'output',      value: computed.totalOutputTokens,     color: indigo },
    { label: 'cache read',  value: computed.totalCacheReadTokens,  color: success },
    { label: 'cache write', value: computed.totalCacheWriteTokens, color: teal },
  ]
  const totalTokens =
    computed.totalInputTokens +
    computed.totalOutputTokens +
    computed.totalCacheReadTokens +
    computed.totalCacheWriteTokens

  const tokensByDate = stats.dailyModelTokens ?? stats.tokensByDate ?? []

  // Windowed metrics: filter daily series by the selected date range so every
  // stat card reacts to the 7d/30d/90d/custom selector. Fall back to all-time
  // totals while the underlying data is still loading.
  const fromISO = format(range.from, 'yyyy-MM-dd')
  const toISO = format(range.to, 'yyyy-MM-dd')

  const dailyInRange = stats.dailyActivity.filter(d => d.date >= fromISO && d.date <= toISO)
  const windowedSessions = dailyInRange.reduce((s, d) => s + (d.sessionCount ?? 0), 0)
  const windowedMessages = dailyInRange.reduce((s, d) => s + (d.messageCount ?? 0), 0)
  const windowedActiveDays = dailyInRange.filter(d => (d.sessionCount ?? 0) > 0).length

  const tokensInRange = tokensByDate.filter(d => d.date >= fromISO && d.date <= toISO)
  const windowedTokens = tokensInRange.reduce(
    (s, d) => s + Object.values(d.tokensByModel ?? {}).reduce((a, b) => a + b, 0),
    0,
  )

  const dailyCostsInRange = costsData?.daily.filter(d => d.date >= fromISO && d.date <= toISO) ?? []
  const windowedCost = costsData
    ? dailyCostsInRange.reduce((sum, d) => sum + (d.total ?? 0), 0)
    : computed.totalCost
  const windowedSavings = costsData
    ? dailyCostsInRange.reduce((sum, d) => sum + (Number(d.costs?.savings ?? 0)), 0)
    : computed.totalCacheSavings

  // Trends compare last N days vs previous N days (capped at 30 to avoid sparse data)
  const trendWindow = Math.min(Math.max(chartDays, 7), 30)

  return (
    <div className="px-6 py-6 space-y-6 bg-background">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {projectCount} projects · {formatBytes(computed.storageBytes)} stored
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangeSelector value={range} onChange={setRange} presets={['7d', '30d', '90d']} />
        </div>
      </div>

      {/* ── Stat cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Sessions"
          value={windowedSessions.toLocaleString()}
          description={`${windowedActiveDays} active days · last ${chartDays}d`}
          trend={computeTrend(stats.dailyActivity, 'sessionCount', trendWindow)}
          sparkData={getActivitySpark(stats.dailyActivity, 'sessionCount')}
          accentColor="var(--foreground)"
        />
        <StatCard
          title="Messages"
          value={windowedMessages.toLocaleString()}
          description={`${windowedActiveDays} active days · last ${chartDays}d`}
          trend={computeTrend(stats.dailyActivity, 'messageCount', trendWindow)}
          sparkData={getActivitySpark(stats.dailyActivity, 'messageCount')}
          accentColor={indigo}
        />
        <StatCard
          title="Tokens Used"
          value={formatTokens(windowedTokens)}
          description={`~¾ word per token · last ${chartDays}d`}
          trend={computeTrendFromSeries(
            tokensByDate.map(d => ({
              date: d.date,
              value: Object.values(d.tokensByModel ?? {}).reduce((a, b) => a + b, 0),
            })),
            trendWindow,
          )}
          sparkData={getTokenSpark(tokensByDate)}
          accentColor={indigo}
        />
        <StatCard
          title="Estimated Cost"
          value={`$${windowedCost.toFixed(2)}`}
          description={`$${windowedSavings.toFixed(2)} saved via prompt cache · last ${chartDays}d`}
          trend={computeTrendFromSeries(
            (costsData?.daily ?? []).map(d => ({ date: d.date, value: d.total ?? 0 })),
            trendWindow,
          )}
          sparkData={getTokenSpark(tokensByDate)}
          accentColor={indigo}
        />
      </div>

      {/* ── Main charts row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Usage Over Time</CardTitle>
                <CardDescription>
                  Messages and sessions — last {chartDays} days
                </CardDescription>
              </div>
              <BarChart3 className="w-4 h-4 text-muted-foreground mt-0.5" />
            </div>
          </CardHeader>
          <CardContent>
            <UsageOverTimeChart
              data={stats.dailyActivity}
              days={chartDays}
              dateFrom={effectiveDateFrom}
              dateTo={effectiveDateTo}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Model Distribution</CardTitle>
                <CardDescription>Token usage by model</CardDescription>
              </div>
              <PieChart className="w-4 h-4 text-muted-foreground mt-0.5" />
            </div>
          </CardHeader>
          <CardContent>
            <ModelBreakdownDonut modelUsage={stats.modelUsage} />
          </CardContent>
        </Card>
      </div>

      {/* ── Secondary charts row ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Peak Hours</CardTitle>
                <CardDescription>Activity by hour of day</CardDescription>
              </div>
              <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
            </div>
          </CardHeader>
          <CardContent>
            <PeakHoursChart hourCounts={stats.hourCounts ?? {}} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Project Activity</CardTitle>
                <CardDescription>Distribution across projects</CardDescription>
              </div>
              <PieChart className="w-4 h-4 text-muted-foreground mt-0.5" />
            </div>
          </CardHeader>
          <CardContent>
            <ProjectActivityDonut projects={projects} />
          </CardContent>
        </Card>
      </div>

      {/* ── Token breakdown ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Token Breakdown</CardTitle>
          <CardDescription>
            All-time distribution — <span className="font-medium">Input</span>: tokens you send &nbsp;·&nbsp;
            <span className="font-medium">Output</span>: Claude&apos;s response &nbsp;·&nbsp;
            <span className="font-medium">Cache Write</span>: context stored (1st time, +25%) &nbsp;·&nbsp;
            <span className="font-medium">Cache Read</span>: reused from cache (10× cheaper)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {totalTokens > 0 ? (
            <>
              <div className="flex h-2 rounded-full overflow-hidden w-full bg-muted/40">
                {tokenSegs.map(({ label, value, color }) => (
                  <div
                    key={label}
                    title={`${label}: ${formatTokens(value)}`}
                    style={{
                      width: `${(value / totalTokens) * 100}%`,
                      minWidth: value > 0 ? 2 : 0,
                      backgroundColor: color,
                    }}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-8 gap-y-2">
                {tokenSegs.map(({ label, value, color }) => (
                  <span key={label} className="inline-flex items-center gap-2">
                    <span
                      className="inline-block w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-[12px] text-muted-foreground">{label}</span>
                    <span className="text-[13px] font-bold tabular-nums font-mono" style={{ color }}>
                      {formatTokens(value)}
                    </span>
                    <span className="text-[12px] text-muted-foreground/60">
                      {Math.round((value / totalTokens) * 100)}%
                    </span>
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No token usage recorded yet.</p>
          )}
        </CardContent>
      </Card>

      {/* ── Recent sessions ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
          <CardDescription>Your latest Claude Code conversations</CardDescription>
        </CardHeader>
        <CardContent>
          <OverviewConversationTable sessions={sessions} />
        </CardContent>
      </Card>

    </div>
  )
}
