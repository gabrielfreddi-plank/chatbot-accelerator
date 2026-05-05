'use client'

import { DollarSign, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { ChatModel, CumulativeUsage, Message } from '@/lib/types'
import { calcCost, calcTotalCost, formatCost, MODEL_LABELS } from '@/lib/cost'
import { countTokens } from '@/lib/tokenizer'

interface Props {
  usage: CumulativeUsage
  messages: Message[]
  onClose: () => void
}

export function CostPanel({ usage, messages, onClose }: Props) {
  const total = calcTotalCost(usage)
  const hasData = usage.totalInputTokens + usage.totalOutputTokens > 0
  const contextTokens = countTokens(
    messages.filter((m) => m.role === 'user' || m.role === 'assistant'),
  )

  return (
    <div className="border rounded-xl bg-muted/50 mx-4 p-4 text-sm space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium flex items-center gap-1.5">
          <DollarSign className="h-4 w-4" />
          Token Usage & Cost
        </span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>

      {!hasData ? (
        <p className="text-muted-foreground text-xs">No messages yet.</p>
      ) : (
        <>
          {Object.entries(usage.usageByModel).map(([key, u]) => (
            <div key={key} className="space-y-1">
              <p className="font-medium text-xs">{MODEL_LABELS[key as ChatModel] ?? key}</p>
              <div className="grid grid-cols-3 gap-1 text-xs text-muted-foreground">
                <span>Input: {u.inputTokens.toLocaleString()}</span>
                <span>Output: {u.outputTokens.toLocaleString()}</span>
                <span className="text-foreground font-medium">
                  {formatCost(calcCost(key as ChatModel, u.inputTokens, u.outputTokens))}
                </span>
              </div>
            </div>
          ))}

          <Separator />

          <div className="flex justify-between text-xs font-medium">
            <span>
              Total: {usage.totalInputTokens.toLocaleString()} in /{' '}
              {usage.totalOutputTokens.toLocaleString()} out
            </span>
            <span>{formatCost(total)}</span>
          </div>

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Context now</span>
            <span>~{contextTokens.toLocaleString()} tokens</span>
          </div>
        </>
      )}
    </div>
  )
}
