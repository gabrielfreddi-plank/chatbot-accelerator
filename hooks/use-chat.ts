'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { ChatModel, CumulativeUsage, Message, SearchEngine } from '@/lib/types'
import type { ConvSyncState } from '@/lib/conversations'
import { MODEL_IDS } from '@/lib/models'
import { readStream } from './use-stream-reader'
import { useResearch } from './use-research'

const DEFAULT_SYSTEM = ''
const DEFAULT_MODEL: ChatModel = 'sonnet'
const DEFAULT_TEMP = 0.7
const DEFAULT_ENGINE: SearchEngine = 'none'

function makeId() {
  return Math.random().toString(36).slice(2)
}

function emptyUsage(): CumulativeUsage {
  return { totalInputTokens: 0, totalOutputTokens: 0, usageByModel: {} }
}

export interface ChatConfig {
  initialMessages?: Message[]
  initialModel?: ChatModel
  initialTemperature?: number
  initialSystemPrompt?: string
  initialSearchEngine?: SearchEngine
  initialUsage?: CumulativeUsage
  onSync?: (state: ConvSyncState) => void
}

export function useChat(config: ChatConfig = {}) {
  const {
    initialMessages = [],
    initialModel = DEFAULT_MODEL,
    initialTemperature = DEFAULT_TEMP,
    initialSystemPrompt = DEFAULT_SYSTEM,
    initialSearchEngine = DEFAULT_ENGINE,
    initialUsage = emptyUsage(),
    onSync,
  } = config

  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [model, setModel] = useState<ChatModel>(initialModel)
  const [temperature, setTemperature] = useState(initialTemperature)
  const [systemPrompt, setSystemPrompt] = useState(initialSystemPrompt)
  const [searchEngine, setSearchEngine] = useState<SearchEngine>(initialSearchEngine)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [usage, setUsage] = useState<CumulativeUsage>(initialUsage)
  const [showCost, setShowCost] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const onSyncRef = useRef(onSync)
  onSyncRef.current = onSync

  // Sync to conversation store after streaming ends
  const prevStreamingRef = useRef(false)
  useEffect(() => {
    const was = prevStreamingRef.current
    prevStreamingRef.current = isStreaming
    if (was && !isStreaming) {
      onSyncRef.current?.({ messages, model, temperature, systemPrompt, searchEngine, usage })
    }
  })

  // Sync when settings change (outside of streaming)
  const messagesRef = useRef(messages)
  messagesRef.current = messages
  const usageRef = useRef(usage)
  usageRef.current = usage
  useEffect(() => {
    if (!isStreaming) {
      onSyncRef.current?.({
        messages: messagesRef.current,
        model,
        temperature,
        systemPrompt,
        searchEngine,
        usage: usageRef.current,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, temperature, systemPrompt, searchEngine])

  const sendMessage = useCallback(
    async (content: string) => {
      const userMsg: Message = { id: makeId(), role: 'user', content }
      const assistantId = makeId()
      const currentModel = model
      const pendingToolIds: string[] = []

      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: assistantId, role: 'assistant', content: '', model: currentModel },
      ])
      setIsStreaming(true)

      const ctrl = new AbortController()
      abortRef.current = ctrl

      function insertToolStatus(label: string, detail?: string) {
        const toolId = makeId()
        pendingToolIds.push(toolId)
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === assistantId)
          const msg: Message = {
            id: toolId,
            role: 'tool_status',
            content: '',
            toolStatus: 'pending',
            toolLabel: label,
            toolDetail: detail,
          }
          return idx === -1 ? prev : [...prev.slice(0, idx), msg, ...prev.slice(idx)]
        })
      }

      function flushPending() {
        if (pendingToolIds.length === 0) return
        const ids = pendingToolIds.splice(0)
        setMessages((prev) =>
          prev.map((m) => (ids.includes(m.id) ? { ...m, toolStatus: 'done' as const } : m)),
        )
      }

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: ctrl.signal,
          body: JSON.stringify({
            messages: [
              ...messages
                .filter((m) => m.role === 'user' || m.role === 'assistant')
                .map((m) => ({ role: m.role, content: m.content })),
              { role: 'user', content },
            ],
            model: MODEL_IDS[currentModel],
            temperature,
            systemPrompt,
            searchEngine,
          }),
        })

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        await readStream(res, (event) => {
          if (event.type === 'token') {
            flushPending()
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + event.text } : m,
              ),
            )
          } else if (event.type === 'tool_result') {
            const lastId = pendingToolIds[pendingToolIds.length - 1]
            if (lastId) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === lastId
                    ? { ...m, toolResult: event.result, toolResultKind: event.kind }
                    : m,
                ),
              )
            }
          } else if (event.type === 'tool_search') {
            setIsSearching(true)
            insertToolStatus('Searching', event.query)
          } else if (event.type === 'tool_fetch') {
            setIsSearching(true)
            insertToolStatus('Fetching', event.url)
          } else if (event.type === 'tool_calculate') {
            insertToolStatus('Calculating', event.expression)
          } else if (event.type === 'tool_save_note') {
            const preview =
              event.content.length > 80 ? event.content.slice(0, 80) + '…' : event.content
            insertToolStatus('Saving note', preview)
          } else if (event.type === 'tool_read_notes') {
            insertToolStatus('Reading notes', event.filter || 'All notes')
          } else if (event.type === 'usage') {
            setUsage((prev) => {
              const modelKey = (event.model as ChatModel | undefined) ?? currentModel
              const existing = prev.usageByModel[modelKey] ?? {
                inputTokens: 0,
                outputTokens: 0,
                model: modelKey,
              }
              return {
                totalInputTokens: prev.totalInputTokens + event.inputTokens,
                totalOutputTokens: prev.totalOutputTokens + event.outputTokens,
                usageByModel: {
                  ...prev.usageByModel,
                  [modelKey]: {
                    ...existing,
                    inputTokens: existing.inputTokens + event.inputTokens,
                    outputTokens: existing.outputTokens + event.outputTokens,
                  },
                },
              }
            })
          } else if (event.type === 'retry') {
            toast.info(`Rate limited. Retry ${event.attempt}/3 in ${(event.waitMs / 1000).toFixed(1)}s…`)
          } else if (event.type === 'error') {
            toast.error(event.message)
            setMessages((prev) => prev.filter((m) => m.id !== assistantId))
          }
        })
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          toast.error((err as Error).message ?? 'Failed to send message')
          setMessages((prev) => prev.filter((m) => m.id !== assistantId))
        }
      } finally {
        flushPending()
        setIsStreaming(false)
        setIsSearching(false)
        abortRef.current = null
      }
    },
    [messages, model, temperature, systemPrompt, searchEngine],
  )

  const runResearch = useResearch({
    searchEngine,
    abortRef,
    setMessages,
    setIsStreaming,
    setIsSearching,
    setUsage,
  })

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const clearHistory = useCallback(() => {
    setMessages([])
    setUsage(emptyUsage())
    onSyncRef.current?.({
      messages: [],
      model,
      temperature,
      systemPrompt,
      searchEngine,
      usage: emptyUsage(),
    })
  }, [model, temperature, systemPrompt, searchEngine])

  return {
    messages,
    model,
    setModel,
    temperature,
    setTemperature,
    systemPrompt,
    setSystemPrompt,
    searchEngine,
    setSearchEngine,
    isStreaming,
    isSearching,
    usage,
    showCost,
    setShowCost,
    sendMessage,
    runResearch,
    stopStreaming,
    clearHistory,
  }
}
