'use client'

import { useMemo } from 'react'
import type { Message } from '@/lib/types'
import { countTokens } from '@/lib/tokenizer'

const WARN_THRESHOLD = 50_000   // yellow — context manager will kick in at 60k
const DANGER_THRESHOLD = 80_000 // red — approaching model limits

export interface ContextHealth {
  tokenCount: number
  isWarn: boolean
  isDanger: boolean
}

export function useContextHealth(messages: Message[]): ContextHealth {
  const tokenCount = useMemo(
    () =>
      countTokens(
        messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({ role: m.role, content: m.content })),
      ),
    [messages],
  )

  return {
    tokenCount,
    isWarn: tokenCount > WARN_THRESHOLD,
    isDanger: tokenCount > DANGER_THRESHOLD,
  }
}
