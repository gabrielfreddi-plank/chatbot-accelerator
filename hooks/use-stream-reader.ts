'use client'

export type StreamEvent =
  | { type: 'token'; text: string }
  | { type: 'usage'; inputTokens: number; outputTokens: number; model?: string }
  | { type: 'retry'; attempt: number; waitMs: number }
  | { type: 'tool_search'; query: string }
  | { type: 'tool_fetch'; url: string }
  | { type: 'tool_calculate'; expression: string }
  | { type: 'tool_save_note'; content: string }
  | { type: 'tool_read_notes'; filter: string }
  | { type: 'research_step'; step: number; label: string }
  | { type: 'research_queries'; queries: string[] }
  | { type: 'research_search'; query: string }
  | { type: 'research_fetch'; url: string }
  | { type: 'tool_result'; result: string; kind: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

export async function readStream(
  response: Response,
  onEvent: (event: StreamEvent) => void,
): Promise<void> {
  if (!response.body) throw new Error('No response body')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const raw = line.slice('data: '.length).trim()
      if (!raw) continue
      try {
        onEvent(JSON.parse(raw) as StreamEvent)
      } catch {
        // malformed event — skip
      }
    }
  }
}
