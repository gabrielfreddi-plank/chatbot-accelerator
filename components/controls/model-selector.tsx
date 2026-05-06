'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ChatModel } from '@/lib/types'
import { MODEL_LABELS } from '@/lib/cost'

const MODELS: ChatModel[] = ['opus', 'sonnet', 'haiku']

const MODEL_HINTS: Record<ChatModel, string> = {
  opus: 'Most capable · $$$',
  sonnet: 'Balanced · $$',
  haiku: 'Fastest · $',
}

interface Props {
  value: ChatModel
  onChange: (model: ChatModel) => void
  disabled?: boolean
}

export function ModelSelector({ value, onChange, disabled }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ChatModel)} disabled={disabled}>
      <SelectTrigger className="w-44 h-8 text-xs">
        <SelectValue>{MODEL_LABELS[value]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {MODELS.map((m) => (
          <SelectItem key={m} value={m} className="text-xs">
            <div className="flex flex-col gap-0.5">
              <span>{MODEL_LABELS[m]}</span>
              <span className="text-[11px] text-muted-foreground/60">{MODEL_HINTS[m]}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
