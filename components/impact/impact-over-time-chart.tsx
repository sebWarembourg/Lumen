'use client'

import { useMemo, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'
import { formatEnergy, formatWater, formatCo2 } from '@/lib/impact'
import type { DailyImpact } from '@/types/claude'

interface Props {
  daily: DailyImpact[]
}

type Metric = 'energy' | 'water' | 'co2'

const METRIC_CONFIG: Record<Metric, { label: string; color: string; key: keyof DailyImpact; format: (v: number) => string; axisFormat: (v: number) => string }> = {
  energy: {
    label: 'Energy',
    color: '#f59e0b',
    key: 'energy_wh',
    format: (v) => formatEnergy(v),
    axisFormat: (v) => v === 0 ? '' : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v.toFixed(0)}`,
  },
  water: {
    label: 'Water',
    color: '#60a5fa',
    key: 'water_ml',
    format: (v) => formatWater(v),
    axisFormat: (v) => v === 0 ? '' : v >= 1000 ? `${(v / 1000).toFixed(1)}L` : `${v.toFixed(0)}`,
  },
  co2: {
    label: 'CO₂',
    color: '#dc2626',
    key: 'co2_g',
    format: (v) => formatCo2(v),
    axisFormat: (v) => v === 0 ? '' : v >= 1000 ? `${(v / 1000).toFixed(1)}kg` : `${v.toFixed(0)}g`,
  },
}

export function ImpactOverTimeChart({ daily }: Props) {
  const [metric, setMetric] = useState<Metric>('energy')

  const data = useMemo(() => {
    const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date))
    return sorted.map(d => ({
      date: d.date.slice(8) + '/' + d.date.slice(5, 7),
      value: d[METRIC_CONFIG[metric].key] as number,
    }))
  }, [daily, metric])

  const cfg = METRIC_CONFIG[metric]

  return (
    <div>
      <div className="flex items-center justify-end mb-3">
        <div className="flex gap-1">
          {(Object.keys(METRIC_CONFIG) as Metric[]).map(m => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${metric === m ? 'bg-primary text-black font-semibold' : 'text-muted-foreground hover:text-foreground border border-border'}`}
            >
              {METRIC_CONFIG[m].label}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 8, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} tickFormatter={cfg.axisFormat} width={52} />
          <Tooltip
            contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11 }}
            formatter={(val: number | undefined) => [cfg.format(val ?? 0), cfg.label]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={cfg.color}
            fill={cfg.color + '30'}
            strokeWidth={1.5}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
