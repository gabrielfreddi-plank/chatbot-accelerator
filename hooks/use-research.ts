'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import type { ChatModel, CumulativeUsage, Message, SearchEngine, ApiResearchRequest } from '@/lib/types'
import { readStream } from './use-stream-reader'

function makeId() {
  return Math.random().toString(36).slice(2)
}

interface ResearchDeps {
  searchEngine: SearchEngine
  abortRef: React.MutableRefObject<AbortController | null>
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  setIsStreaming: React.Dispatch<React.SetStateAction<boolean>>
  setIsSearching: React.Dispatch<React.SetStateAction<boolean>>
  setUsage: React.Dispatch<React.SetStateAction<CumulativeUsage>>
}

export function useResearch({
  searchEngine,
  abortRef,
  setMessages,
  setIsStreaming,
  setIsSearching,
  setUsage,
}: ResearchDeps) {
  return useCallback(
    async (topic: string) => {
      if (searchEngine === 'none') {
        toast.error('Research requires a search engine. Set one with /engine <brave|tavily>')
        return
      }

      const userMsg: Message = { id: makeId(), role: 'user', content: `Research: ${topic}` }
      const assistantId = makeId()

      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: assistantId, role: 'assistant', content: '', model: 'sonnet' },
      ])
      setIsStreaming(true)

      const ctrl = new AbortController()
      abortRef.current = ctrl

      const pendingToolIds: string[] = []

      function insertToolStatus(label: string, detail?: string) {
        const toolId = makeId()
        pendingToolIds.push(toolId)
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === assistantId)
          const msg: Message = { id: toolId, role: 'tool_status', content: '', toolStatus: 'pending', toolLabel: label, toolDetail: detail }
          return idx === -1 ? prev : [...prev.slice(0, idx), msg, ...prev.slice(idx)]
        })
      }

      function flushPending() {
        if (pendingToolIds.length === 0) return
        const ids = pendingToolIds.splice(0)
        setMessages((prev) => prev.map((m) => ids.includes(m.id) ? { ...m, toolStatus: 'done' as const } : m))
      }

      try {
        const body: ApiResearchRequest = { topic, searchEngine }
        const res = await fetch('/api/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: ctrl.signal,
          body: JSON.stringify(body),
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
          } else if (event.type === 'research_step') {
            if (event.step >= 2 && event.step <= 3) setIsSearching(true)
            if (event.step === 4) setIsSearching(false)
            flushPending()
            insertToolStatus(`Step ${event.step}/4`, event.label)
          } else if (event.type === 'research_search') {
            insertToolStatus('Searching', event.query)
          } else if (event.type === 'research_fetch') {
            insertToolStatus('Reading', event.url)
          } else if (event.type === 'usage') {
            setUsage((prev) => {
              const modelKey = (event.model as ChatModel | undefined) ?? 'sonnet'
              const existing = prev.usageByModel[modelKey] ?? {
                inputTokens: 0,
                outputTokens: 0,
                model: modelKey as ChatModel,
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
          } else if (event.type === 'error') {
            toast.error(event.message)
            setMessages((prev) => prev.filter((m) => m.id !== assistantId))
          }
        })
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          toast.error((err as Error).message ?? 'Research failed')
          setMessages((prev) => prev.filter((m) => m.id !== assistantId))
        }
      } finally {
        flushPending()
        setIsStreaming(false)
        setIsSearching(false)
        abortRef.current = null
      }
    },
    [searchEngine, abortRef, setMessages, setIsStreaming, setIsSearching, setUsage],
  )
}
