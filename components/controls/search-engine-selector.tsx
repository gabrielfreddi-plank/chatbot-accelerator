'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SearchEngine } from '@/lib/types'
import { ENGINE_LABELS } from '@/lib/search-engines'

const ENGINES: SearchEngine[] = ['none', 'brave', 'tavily']

interface Props {
  value: SearchEngine
  onChange: (engine: SearchEngine) => void
  disabled?: boolean
}

export function SearchEngineSelector({ value, onChange, disabled }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as SearchEngine)} disabled={disabled}>
      <SelectTrigger className="w-44 h-8 text-xs">
        <SelectValue>{ENGINE_LABELS[value]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {ENGINES.map((e) => (
          <SelectItem key={e} value={e} className="text-xs">
            {ENGINE_LABELS[e]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
