'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ResponsiveContainer } from 'recharts'

interface Props {
  data: Array<{ day: string; count: number }>
}

export function DayOfWeekChart({ data }: Props) {
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Day of Week</h3>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} width={30} tickFormatter={v => v === 0 ? '' : String(v)} />
          <Tooltip
            contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11 }}
            formatter={(val: number | undefined) => [(val ?? 0).toLocaleString(), 'messages']}
          />
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.count === max ? '#d97706' : d.count > max * 0.6 ? '#d97706aa' : '#d9770640'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
