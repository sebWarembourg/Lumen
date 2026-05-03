'use client'

import type { Region } from '@/lib/impact'
import { REGION_LABELS, CARBON_INTENSITY } from '@/lib/impact'

interface Props {
  value: Region
  onChange: (r: Region) => void
}

export function RegionToggle({ value, onChange }: Props) {
  return (
    <div className="inline-flex items-center gap-1 border border-border rounded-md p-0.5 bg-muted/30">
      {(Object.keys(REGION_LABELS) as Region[]).map(r => (
        <button
          key={r}
          onClick={() => onChange(r)}
          title={`${CARBON_INTENSITY[r]} kg CO₂e/kWh`}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            value === r
              ? 'bg-background text-foreground shadow-sm border border-border'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {REGION_LABELS[r]}
        </button>
      ))}
    </div>
  )
}
