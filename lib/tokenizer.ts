import { getEncoding } from 'js-tiktoken'

// All Claude models use cl100k_base
let enc: ReturnType<typeof getEncoding> | null = null

function getEnc() {
  if (!enc) enc = getEncoding('cl100k_base')
  return enc
}

export function countTextTokens(text: string): number {
  if (!text) return 0
  try {
    return getEnc().encode(text).length
  } catch {
    return Math.ceil(text.length / 4)
  }
}

// Full message array token count with per-message overhead (~4 tokens each,
// matching the framing overhead Claude uses, similar to GPT-4 cl100k).
export function countTokens(messages: Array<{ role: string; content: string }>): number {
  return messages.reduce((sum, m) => sum + countTextTokens(m.content) + 4, 0) + 2
}
