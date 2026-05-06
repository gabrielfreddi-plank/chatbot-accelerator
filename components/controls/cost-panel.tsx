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
        <h3 className="font-medium flex items-center gap-1.5">
          <DollarSign className="h-4 w-4" aria-hidden="true" />
          Token Usage &amp; Cost
        </h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose} aria-label="Close cost panel">
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
              <dl className="grid grid-cols-3 gap-1 text-xs text-muted-foreground">
                <div>
                  <dt className="sr-only">Input tokens</dt>
                  <dd>Input: {u.inputTokens.toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="sr-only">Output tokens</dt>
                  <dd>Output: {u.outputTokens.toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="sr-only">Cost</dt>
                  <dd className="text-foreground font-medium">
                    {formatCost(calcCost(key as ChatModel, u.inputTokens, u.outputTokens))}
                  </dd>
                </div>
              </dl>
            </div>
          ))}

          <Separator />

          <dl className="space-y-1 text-xs">
            <div className="flex justify-between font-medium">
              <dt>Total tokens</dt>
              <dd>
                {usage.totalInputTokens.toLocaleString()} in /{' '}
                {usage.totalOutputTokens.toLocaleString()} out
              </dd>
            </div>
            <div className="flex justify-between font-medium">
              <dt>Estimated cost</dt>
              <dd>{formatCost(total)}</dd>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <dt>Context now</dt>
              <dd>~{contextTokens.toLocaleString()} tokens</dd>
            </div>
          </dl>
        </>
      )}
    </div>
  )
}
