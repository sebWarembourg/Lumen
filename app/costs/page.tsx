'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { TopBar } from '@/components/layout/top-bar'
import { LoadingOverlay } from '@/components/layout/loading-overlay'
import { CostOverTimeChart } from '@/components/costs/cost-over-time-chart'
import { CostByProjectChart } from '@/components/costs/cost-by-project-chart'
import { ModelTokenTable } from '@/components/costs/model-token-table'
import { CacheEfficiencyPanel } from '@/components/costs/cache-efficiency-panel'
import { DateRangeSelector, DEFAULT_DATE_RANGE } from '@/components/layout/date-range-selector'
import { formatCost } from '@/lib/decode'
import { PRICING } from '@/lib/pricing'
import type { CostAnalytics } from '@/types/claude'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertTriangle, TrendingDown, DollarSign, Banknote } from 'lucide-react'

const fetcher = (url: string) =>
  fetch(url).then(r => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json() })

export default function CostsPage() {
  const [range, setRange] = useState(DEFAULT_DATE_RANGE)

  // Pass the window to the API so totals, per-model and per-project all
  // reflect the selected range. When the preset is 'all', omit params so the
  // API returns all-time data.
  const apiUrl = useMemo(() => {
    if (range.preset === 'all' && !range.usingCustom) return '/api/costs'
    const fromISO = range.from.toISOString().slice(0, 10)
    const toISO = range.to.toISOString().slice(0, 10)
    return `/api/costs?from=${fromISO}&to=${toISO}`
  }, [range])

  const { data, error, isLoading } = useSWR<CostAnalytics>(apiUrl, fetcher, { refreshInterval: 60_000 })


  return (
    <div className="flex flex-col min-h-screen">
      <LoadingOverlay isLoading={!data && isLoading} label="Costs" />
      <TopBar title="Costs" subtitle="Estimated spend · calculated locally from token counts in ~/.claude/" />
      <div className="p-6 space-y-6">

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Error loading data: {String(error)}</AlertDescription>
          </Alert>
        )}

        {/* Date range selector */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs text-muted-foreground">
            {range.usingCustom
              ? `Custom window · ${range.days} days`
              : range.preset === 'all'
                ? 'All available data'
                : `Last ${range.days} days`}
          </p>
          <DateRangeSelector value={range} onChange={setRange} />
        </div>

        {isLoading && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
          </div>
        )}

        {data && (
          <>
            {/* Hero stat cards — all KPIs reflect the selected window */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> Estimated Cost
                  </CardDescription>
                  <CardTitle className="text-3xl font-bold tabular-nums font-mono text-primary tracking-[-0.02em]">
                    {formatCost(data.total_cost)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {range.usingCustom
                      ? `Window · ${range.days} days`
                      : range.preset === 'all'
                        ? 'All-time spend'
                        : `Last ${range.days} days`}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4" /> Cache Savings
                  </CardDescription>
                  <CardTitle className="text-3xl font-bold tabular-nums font-mono text-[var(--success)] tracking-[-0.02em]">
                    {formatCost(data.total_savings)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Saved by prompt caching · cache reads cost 10× less</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Banknote className="w-4 h-4" /> Without Cache
                  </CardDescription>
                  <CardTitle className="text-3xl font-bold tabular-nums font-mono text-[var(--error)]">
                    {formatCost(data.total_cost + data.total_savings)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">What you would have paid without prompt caching</p>
                </CardContent>
              </Card>
            </div>

            {/* Cost over time — filtered by range (API already trims daily) */}
            {data.daily.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Cost Over Time</CardTitle>
                  <CardDescription>
                    Daily estimated spend · {range.usingCustom ? `${range.days}d window` : range.preset === 'all' ? 'all-time' : `last ${range.days}d`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CostOverTimeChart daily={data.daily} />
                </CardContent>
              </Card>
            )}

            {/* Cost by project */}
            {data.by_project.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Cost by Project</CardTitle>
                  <CardDescription>Spend breakdown across projects · {range.usingCustom ? `${range.days}d window` : range.preset === 'all' ? 'all-time' : `last ${range.days}d`}</CardDescription>
                </CardHeader>
                <CardContent>
                  <CostByProjectChart projects={data.by_project} />
                </CardContent>
              </Card>
            )}

            {/* Per-model table */}
            <Card>
              <CardHeader>
                <CardTitle>Per-Model Token Breakdown</CardTitle>
                <CardDescription>Token usage and cost by model · {range.usingCustom ? `${range.days}d window` : range.preset === 'all' ? 'all-time' : `last ${range.days}d`}</CardDescription>
              </CardHeader>
              <CardContent>
                <ModelTokenTable models={data.models} />
              </CardContent>
            </Card>

            {/* Cache efficiency */}
            <Card>
              <CardHeader>
                <CardTitle>Cache Efficiency</CardTitle>
                <CardDescription>How much caching is saving you</CardDescription>
              </CardHeader>
              <CardContent>
                <CacheEfficiencyPanel models={data.models} totalSavings={data.total_savings} />
              </CardContent>
            </Card>

            {/* Pricing reference */}
            <Card>
              <CardHeader>
                <CardTitle>Pricing Reference</CardTitle>
                <CardDescription>
                  Estimates only — update rates in{' '}
                  <code className="text-xs bg-muted px-1 rounded">lib/pricing.ts</code>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Model</TableHead>
                      <TableHead className="text-right">Input /MTok</TableHead>
                      <TableHead className="text-right">Output /MTok</TableHead>
                      <TableHead className="text-right">Cache Write /MTok</TableHead>
                      <TableHead className="text-right">Cache Read /MTok</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(PRICING).map(([model, p]) => (
                      <TableRow key={model}>
                        <TableCell className="font-mono text-sm">{model}</TableCell>
                        <TableCell className="text-right font-mono text-foreground/70">${(p.input * 1_000_000).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono text-primary">${(p.output * 1_000_000).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono text-foreground/60">${(p.cacheWrite * 1_000_000).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono text-[var(--success)]">${(p.cacheRead * 1_000_000).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
