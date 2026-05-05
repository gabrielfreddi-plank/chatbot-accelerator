import Anthropic, { APIError } from '@anthropic-ai/sdk'
import type { ApiChatRequest, UiSpec } from '@/lib/types'
import { webSearchTool, executeSearch } from '@/lib/web-search'
import { readUrlTool, executeReadUrl } from '@/lib/fetch-page'
import { calculatorTool, executeCalculate } from '@/lib/calculator'
import { saveNoteTool, readNotesTool, executeSaveNote, executeReadNotes } from '@/lib/note-store'
import {
  renderUiSkeletonTool,
  fillComponentTool,
  validateSkeleton,
  validateFill,
  validateUiSpec,
  skeletonToSpec,
  applyFill,
  UI_SYSTEM_PROMPT_ADDENDUM,
} from '@/lib/ui-catalog'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_RETRIES = 3
const MAX_TOOL_TURNS = 32 // higher: we expect many small fill_component calls
const RETRY_STATUSES = new Set([429, 529])

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function backoff(attempt: number): number {
  const base = 1000 * Math.pow(2, attempt)
  return base + Math.random() * 500
}

export async function POST(request: Request) {
  const body: ApiChatRequest = await request.json()
  const { messages, model, temperature, systemPrompt, searchEngine, enableUiTool } = body

  const encoder = new TextEncoder()
  const searchTools = searchEngine && searchEngine !== 'none' ? [webSearchTool] : []
  const uiTools = enableUiTool ? [renderUiSkeletonTool, fillComponentTool] : []
  const tools = [...searchTools, readUrlTool, calculatorTool, saveNoteTool, readNotesTool, ...uiTools]

  // Run the model loop in a detached IIFE so `start` returns immediately and
  // Next.js flushes response headers + each enqueued chunk to the wire as soon
  // as it's produced.
  const stream = new ReadableStream({
    start(controller) {
      let closed = false
      const send = (obj: Record<string, unknown>) => {
        if (closed) return
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
      }
      const closeOnce = () => {
        if (closed) return
        closed = true
        controller.close()
      }

      void (async () => {
        let currentMessages: Anthropic.MessageParam[] = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }))

        // Stateful spec assembled across the whole request as the model issues
        // render_ui_skeleton + repeated fill_component tool calls. After the
        // model stops calling tools, we emit it as a final ui_render so the
        // client can snapshot it as a version.
        let assembledSpec: UiSpec | null = null

        // Process one tool_use block from the assistant's content array, emit
        // any resulting SSE events, and return the string that should go into
        // the matching tool_result. Errors become validation messages so the
        // model can self-correct on the next turn.
        const handleToolUse = async (tu: {
          id: string
          name: string
          input: unknown
        }): Promise<string> => {
          const input = (tu.input ?? {}) as Record<string, unknown>
          if (tu.name === 'web_search') {
            const query = (input.query as string) ?? ''
            send({ type: 'tool_search', query })
            const r = await executeSearch(query, searchEngine ?? 'none')
            send({ type: 'tool_result', result: r.slice(0, 2000), kind: 'search' })
            return r
          }
          if (tu.name === 'read_url') {
            const url = (input.url as string) ?? ''
            send({ type: 'tool_fetch', url })
            const r = await executeReadUrl(url)
            send({ type: 'tool_result', result: r.slice(0, 600), kind: 'fetch' })
            return r
          }
          if (tu.name === 'calculate') {
            const expression = (input.expression as string) ?? ''
            send({ type: 'tool_calculate', expression })
            const r = executeCalculate(expression)
            send({ type: 'tool_result', result: r, kind: 'calculate' })
            return r
          }
          if (tu.name === 'save_note') {
            const content = (input.content as string) ?? ''
            const tags = (input.tags as string[] | undefined) ?? []
            send({ type: 'tool_save_note', content })
            const r = executeSaveNote(content, tags)
            send({ type: 'tool_result', result: r, kind: 'save_note' })
            return r
          }
          if (tu.name === 'read_notes') {
            const filter = input.filter as string | undefined
            send({ type: 'tool_read_notes', filter: filter ?? '' })
            const r = executeReadNotes(filter)
            send({ type: 'tool_result', result: r.slice(0, 1000), kind: 'read_notes' })
            return r
          }
          if (tu.name === 'render_ui_skeleton') {
            const validation = validateSkeleton(input)
            if (!validation.success) {
              return `Invalid skeleton: ${validation.error}. Fix the structure and call render_ui_skeleton again.`
            }
            assembledSpec = skeletonToSpec(validation.data)
            send({ type: 'ui_skeleton', spec: assembledSpec })
            const ids = Object.keys(assembledSpec.elements).join(', ')
            return `Skeleton accepted (${Object.keys(assembledSpec.elements).length} elements: ${ids}). Now call fill_component once per element. Do not call render_ui_skeleton again.`
          }
          if (tu.name === 'fill_component') {
            if (!assembledSpec) {
              return 'No skeleton yet. Call render_ui_skeleton FIRST, then fill_component for each element.'
            }
            const validation = validateFill(input)
            if (!validation.success) {
              return `Invalid fill_component payload: ${validation.error}. Retry with valid props.`
            }
            assembledSpec = applyFill(assembledSpec, validation.data)
            send({
              type: 'ui_fill',
              id: validation.data.id,
              props: validation.data.props,
              on: validation.data.on,
              visible: validation.data.visible,
            })
            const remaining = Object.entries(assembledSpec.elements)
              .filter(([, el]) => Object.keys(el.props).length === 0)
              .map(([id]) => id)
            if (remaining.length === 0) {
              return `Filled "${validation.data.id}". All elements complete — end your turn now.`
            }
            return `Filled "${validation.data.id}". Remaining: ${remaining.join(', ')}. Continue with the next fill_component.`
          }
          return `Unknown tool: ${tu.name}`
        }

        try {
          for (let toolTurn = 0; toolTurn <= MAX_TOOL_TURNS; toolTurn++) {
            let stopReason: string | null = null
            let msgStream: ReturnType<typeof client.messages.stream> | null = null
            let sawSkeletonStart = false

            // Retry loop (rate limit / 529)
            for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
              try {
                msgStream = client.messages.stream({
                  model,
                  max_tokens: 8192,
                  temperature,
                  system: enableUiTool
                    ? (systemPrompt ? `${systemPrompt}\n${UI_SYSTEM_PROMPT_ADDENDUM}` : UI_SYSTEM_PROMPT_ADDENDUM)
                    : (systemPrompt || undefined),
                  messages: currentMessages,
                  ...(tools.length ? { tools } : {}),
                  // For UI generation: force the model to emit ONE tool_use
                  // per assistant message. Without this, the model packs the
                  // skeleton + every fill_component into a single message and
                  // they all land in one buffered burst at the end. With it,
                  // each tool call gets its own round-trip — skeleton, then
                  // fill, then fill, then fill — and the user sees the canvas
                  // build up over the model's actual generation time.
                  ...(enableUiTool
                    ? { tool_choice: { type: 'auto' as const, disable_parallel_tool_use: true } }
                    : {}),
                })

                for await (const event of msgStream) {
                  if (event.type === 'content_block_start' && event.content_block.type === 'tool_use') {
                    // First skeleton call in this turn: announce loading state
                    // to the client immediately so the canvas shows a spinner
                    // before the (always-buffered) tool input lands.
                    if (event.content_block.name === 'render_ui_skeleton' && !sawSkeletonStart) {
                      send({ type: 'ui_loading' })
                      sawSkeletonStart = true
                    }
                  } else if (event.type === 'content_block_delta') {
                    if (event.delta.type === 'text_delta') send({ type: 'token', text: event.delta.text })
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
                closeOnce()
                return
              }
            }

            const finalMsg = await msgStream!.finalMessage()

            if (stopReason === 'tool_use') {
              // The model can pack many tool_use blocks into a single
              // assistant message (this is how the two-step protocol becomes
              // genuinely incremental — each fill_component is its own
              // small block). Process them ALL in order and respond with a
              // matching tool_result for each, otherwise the API rejects
              // the next request with "tool_use ids without tool_result".
              const toolUses: Anthropic.ToolUseBlock[] = []
              for (const block of finalMsg.content) {
                if (block.type === 'tool_use') toolUses.push(block)
              }
              const toolResults: Anthropic.ToolResultBlockParam[] = []
              for (const tu of toolUses) {
                const result = await handleToolUse({ id: tu.id, name: tu.name, input: tu.input })
                toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: result })
              }
              currentMessages = [
                ...currentMessages,
                { role: 'assistant', content: finalMsg.content },
                { role: 'user', content: toolResults },
              ]
              continue
            }

            // Model is done. If a UI was assembled, finalize it.
            if (assembledSpec) {
              const finalValidation = validateUiSpec(assembledSpec)
              // Be lenient: emit whatever we have so the user sees the UI,
              // even if some leaves never got filled in time.
              send({
                type: 'ui_render',
                spec: finalValidation.success ? finalValidation.data : assembledSpec,
              })
            }

            send({ type: 'done' })
            closeOnce()
            return
          }

          send({ type: 'error', message: 'Max tool turns exceeded' })
          closeOnce()
        } catch (err) {
          send({ type: 'error', message: (err as Error)?.message ?? 'Unexpected error' })
          closeOnce()
        }
      })()
    },
  })

  return new Response(stream, { headers: SSE_HEADERS })
}
