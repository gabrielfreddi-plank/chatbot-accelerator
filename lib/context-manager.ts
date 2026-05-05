import Anthropic from '@anthropic-ai/sdk'
import { countTokens } from './tokenizer'
import { MODEL_IDS } from './models'

const SUMMARIZE_THRESHOLD = 60_000
const SUMMARIZE_CHUNK_TOKENS = 40_000

type SimpleMsg = { role: 'user' | 'assistant'; content: string }

// Summarize the oldest chunk of messages when the context exceeds the threshold.
// Inserts a synthetic user+assistant pair carrying the summary so the alternating
// message structure stays valid. Transparent to the client.
export async function manageContext(
  messages: SimpleMsg[],
  client: Anthropic,
): Promise<SimpleMsg[]> {
  const total = countTokens(messages)
  if (total <= SUMMARIZE_THRESHOLD) return messages

  // Find the cutoff at an assistant boundary so rest[0] is always a user message.
  let accumulated = 0
  let cutoff = 0
  for (let i = 0; i < messages.length - 1; i++) {
    accumulated += countTokens([messages[i]]) - 2 // subtract per-call overhead
    if (accumulated >= SUMMARIZE_CHUNK_TOKENS && messages[i].role === 'assistant') {
      cutoff = i + 1
      break
    }
  }

  if (cutoff === 0) return messages

  const toSummarize = messages.slice(0, cutoff)
  const rest = messages.slice(cutoff)

  const transcript = toSummarize
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n')

  const resp = await client.messages.create({
    model: MODEL_IDS.haiku,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Summarize the following conversation segment concisely. Preserve all key facts, decisions, preferences, and context that would be needed to continue the conversation:\n\n${transcript}`,
      },
    ],
  })

  const summary = resp.content[0].type === 'text' ? resp.content[0].text : ''

  return [
    { role: 'user', content: `[SUMMARY of earlier conversation]\n${summary}` },
    { role: 'assistant', content: 'Understood. I have the context from the earlier part of our conversation.' },
    ...rest,
  ]
}
