import type { ChatModel, CumulativeUsage } from './types'

const PRICING: Record<ChatModel, { input: number; output: number }> = {
  opus: { input: 15, output: 75 },
  sonnet: { input: 3, output: 15 },
  haiku: { input: 0.8, output: 4 },
}

export function calcCost(model: ChatModel, inputTokens: number, outputTokens: number): number {
  const p = PRICING[model]
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000
}

export function calcTotalCost(usage: CumulativeUsage): number {
  return Object.entries(usage.usageByModel).reduce((sum, [model, u]) => {
    return sum + calcCost(model as ChatModel, u.inputTokens, u.outputTokens)
  }, 0)
}

export function formatCost(usd: number): string {
  if (usd < 0.01) return `$${usd.toFixed(5)}`
  return `$${usd.toFixed(4)}`
}

export const MODEL_LABELS: Record<ChatModel, string> = {
  opus: 'Claude Opus 4.7',
  sonnet: 'Claude Sonnet 4.6',
  haiku: 'Claude Haiku 4.5',
}
