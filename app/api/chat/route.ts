import Anthropic, { APIError } from '@anthropic-ai/sdk'
import type { ApiChatRequest } from '@/lib/types'
import { webSearchTool, executeSearch } from '@/lib/web-search'
import { readUrlTool, executeReadUrl } from '@/lib/fetch-page'
import { calculatorTool, executeCalculate } from '@/lib/calculator'
import { saveNoteTool, readNotesTool, executeSaveNote, executeReadNotes } from '@/lib/note-store'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MAX_RETRIES = 3
const MAX_TOOL_TURNS = 5
const RETRY_STATUSES = new Set([429, 529])

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function backoff(attempt: number): number {
  const base = 1000 * Math.pow(2, attempt)
  return base + Math.random() * 500
}

export async function POST(request: Request) {
  const body: ApiChatRequest = await request.json()
  const { messages, model, temperature, systemPrompt, searchEngine } = body

  const encoder = new TextEncoder()
  const searchTools = searchEngine && searchEngine !== 'none' ? [webSearchTool] : []
  const tools = [...searchTools, readUrlTool, calculatorTool, saveNoteTool, readNotesTool]

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))

      let currentMessages: Anthropic.MessageParam[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }))

      for (let toolTurn = 0; toolTurn <= MAX_TOOL_TURNS; toolTurn++) {
        let toolUseId: string | null = null
        let toolName: string | null = null
        let toolInputJson = ''
        let stopReason: string | null = null
        let msgStream: ReturnType<typeof client.messages.stream> | null = null

        // Retry loop (rate limit / 529)
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          try {
            msgStream = client.messages.stream({
              model,
              max_tokens: 8192,
              temperature,
              system: systemPrompt || undefined,
              messages: currentMessages,
              ...(tools.length ? { tools } : {}),
            })

            for await (const event of msgStream) {
              if (event.type === 'content_block_start' && event.content_block.type === 'tool_use') {
                toolUseId = event.content_block.id
                toolName = event.content_block.name
                toolInputJson = ''
              } else if (event.type === 'content_block_delta') {
                if (event.delta.type === 'text_delta') send({ type: 'token', text: event.delta.text })
                else if (event.delta.type === 'input_json_delta') toolInputJson += event.delta.partial_json
              } else if (event.type === 'message_start') {
                send({ type: 'usage', inputTokens: event.message.usage.input_tokens, outputTokens: 0 })
              } else if (event.type === 'message_delta') {
                send({ type: 'usage', inputTokens: 0, outputTokens: event.usage.output_tokens })
                stopReason = event.delta.stop_reason ?? null
              }
            }
            break // success — exit retry loop
          } catch (err) {
            const status = (err as APIError)?.status
            if (typeof status === 'number' && RETRY_STATUSES.has(status) && attempt < MAX_RETRIES) {
              const wait = backoff(attempt)
              send({ type: 'retry', attempt: attempt + 1, waitMs: Math.round(wait) })
              await sleep(wait)
              continue
            }
            send({ type: 'error', message: err instanceof APIError ? err.message : 'Unexpected error' })
            controller.close()
            return
          }
        }

        if (stopReason === 'tool_use' && toolUseId && toolName) {
          const input = JSON.parse(toolInputJson || '{}') as Record<string, string>
          let result: string
          if (toolName === 'web_search') {
            const query = input.query ?? ''
            send({ type: 'tool_search', query })
            result = await executeSearch(query, searchEngine ?? 'none')
            send({ type: 'tool_result', result: result.slice(0, 2000), kind: 'search' })
          } else if (toolName === 'read_url') {
            const url = input.url ?? ''
            send({ type: 'tool_fetch', url })
            result = await executeReadUrl(url)
            send({ type: 'tool_result', result: result.slice(0, 600), kind: 'fetch' })
          } else if (toolName === 'calculate') {
            const expression = input.expression ?? ''
            send({ type: 'tool_calculate', expression })
            result = executeCalculate(expression)
            send({ type: 'tool_result', result, kind: 'calculate' })
          } else if (toolName === 'save_note') {
            const content = input.content ?? ''
            const tags = (input.tags as unknown as string[] | undefined) ?? []
            send({ type: 'tool_save_note', content })
            result = executeSaveNote(content, tags)
            send({ type: 'tool_result', result, kind: 'save_note' })
          } else if (toolName === 'read_notes') {
            const filter = input.filter
            send({ type: 'tool_read_notes', filter: filter ?? '' })
            result = executeReadNotes(filter)
            send({ type: 'tool_result', result: result.slice(0, 1000), kind: 'read_notes' })
          } else {
            result = `Unknown tool: ${toolName}`
          }
          const finalMsg = await msgStream!.finalMessage()
          currentMessages = [
            ...currentMessages,
            { role: 'assistant', content: finalMsg.content },
            { role: 'user', content: [{ type: 'tool_result' as const, tool_use_id: toolUseId, content: result }] },
          ]
          continue
        }

        send({ type: 'done' })
        controller.close()
        return
      }

      send({ type: 'error', message: 'Max tool turns exceeded' })
      controller.close()
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  })
}
