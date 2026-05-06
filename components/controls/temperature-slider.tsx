'use client'

import { Slider } from '@/components/ui/slider'

interface Props {
  value: number
  onChange: (val: number) => void
  disabled?: boolean
}

export function TemperatureSlider({ value, onChange, disabled }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-16 shrink-0">Temp {value.toFixed(1)}</span>
      <Slider
        value={[value]}
        onValueChange={(v) => {
          const next = Array.isArray(v) ? (v as number[])[0] : (v as number)
          onChange(next)
        }}
        min={0}
        max={1}
        step={0.1}
        disabled={disabled}
        className="w-28"
        aria-label="Temperature"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuetext={`Temperature: ${value.toFixed(1)}`}
      />
    </div>
  )
}
