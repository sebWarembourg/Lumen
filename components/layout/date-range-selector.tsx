'use client'

import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'

export type DatePreset = '7d' | '30d' | '90d' | 'all'
export type CustomRange = { from?: Date; to?: Date }

export interface DateRange {
  preset: DatePreset
  custom: CustomRange
  /** Effective days in the window (derived). */
  days: number
  /** Effective from Date (derived). */
  from: Date
  /** Effective to Date (derived). */
  to: Date
  /** True when a custom range is in use. */
  usingCustom: boolean
}

const DEFAULT_ALL_DAYS = 365

/** Compute the effective date range from preset + custom. */
export function resolveDateRange(preset: DatePreset, custom: CustomRange): DateRange {
  const usingCustom = !!(custom.from && custom.to)
  const days = usingCustom
    ? Math.ceil((custom.to!.getTime() - custom.from!.getTime()) / 86_400_000)
    : preset === '7d' ? 7 : preset === '30d' ? 30 : preset === '90d' ? 90 : DEFAULT_ALL_DAYS
  const to = usingCustom ? custom.to! : new Date()
  const from = usingCustom ? custom.from! : subDays(to, days)
  return { preset, custom, days, from, to, usingCustom }
}

interface Props {
  value: DateRange
  onChange: (range: DateRange) => void
  presets?: DatePreset[]
}

export function DateRangeSelector({ value, onChange, presets = ['7d', '30d', '90d', 'all'] }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)

  const pickerLabel = value.usingCustom
    ? `${format(value.custom.from!, 'MMM d')} – ${format(value.custom.to!, 'MMM d, yyyy')}`
    : 'Pick a date'

  return (
    <div className="flex items-center gap-2">
      <Tabs
        value={value.usingCustom ? '' : value.preset}
        onValueChange={v => onChange(resolveDateRange(v as DatePreset, {}))}
      >
        <TabsList>
          {presets.map(p => (
            <TabsTrigger key={p} value={p}>{p === 'all' ? 'All' : p}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={value.usingCustom ? 'default' : 'outline'}
            size="sm"
            className="gap-2"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            {pickerLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={{ from: value.custom.from, to: value.custom.to }}
            onSelect={range => {
              const custom = { from: range?.from, to: range?.to }
              onChange(resolveDateRange(value.preset, custom))
              if (range?.from && range?.to) setPickerOpen(false)
            }}
            disabled={{ after: new Date() }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

/** Initial default — "all" so pages render non-empty on first paint. */
export const DEFAULT_DATE_RANGE: DateRange = resolveDateRange('all', {})
