'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { ChatModel, Creation, CreationVersion, UiElement, UiSpec } from '@/lib/types'
import type { CreationSyncState } from '@/lib/creations'
import { MODEL_IDS } from '@/lib/models'
import { readStream } from './use-stream-reader'

const CREATE_SYSTEM_PROMPT = `You are a UI dashboard builder.
Generate UI using the two-step protocol: render_ui_skeleton FIRST, then one fill_component call per element.
When modifying existing UI, the current spec is provided below — make targeted changes by re-declaring only the elements that change. Always start with render_ui_skeleton.`

export interface CanvasState {
  spec: UiSpec
  loading: boolean
}

export interface CreateConfig {
  initialCreation?: Creation
  onSync?: (state: CreationSyncState) => void
}

export function useCreate(config: CreateConfig = {}) {
  const { initialCreation, onSync } = config

  const [history, setHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>(
    initialCreation?.history ?? [],
  )
  const [versions, setVersions] = useState<CreationVersion[]>(initialCreation?.versions ?? [])
  const [activeVersionIndex, setActiveVersionIndex] = useState(
    initialCreation?.activeVersionIndex ?? -1,
  )
  const [canvas, setCanvas] = useState<CanvasState | null>(() => {
    if (initialCreation && initialCreation.versions.length > 0) {
      const idx = initialCreation.activeVersionIndex
      const ver = initialCreation.versions[idx >= 0 ? idx : initialCreation.versions.length - 1]
      return ver ? { spec: ver.spec, loading: false } : null
    }
    return null
  })
  const [model, setModel] = useState<ChatModel>(initialCreation?.model ?? 'sonnet')
  const [temperature, setTemperature] = useState(initialCreation?.temperature ?? 0.7)
  const [isStreaming, setIsStreaming] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const onSyncRef = useRef(onSync)
  useEffect(() => {
    onSyncRef.current = onSync
  }, [onSync])

  const versionsRef = useRef(versions)
  useEffect(() => {
    versionsRef.current = versions
  }, [versions])

  const historyRef = useRef(history)
  useEffect(() => {
    historyRef.current = history
  }, [history])

  const activeVersionIndexRef = useRef(activeVersionIndex)
  useEffect(() => {
    activeVersionIndexRef.current = activeVersionIndex
  }, [activeVersionIndex])

  const syncToPersistence = useCallback(() => {
    onSyncRef.current?.({
      versions: versionsRef.current,
      activeVersionIndex: activeVersionIndexRef.current,
      model,
      temperature,
      history: historyRef.current,
    })
  }, [model, temperature])

  const prevStreamingRef = useRef(false)
  useEffect(() => {
    const was = prevStreamingRef.current
    prevStreamingRef.current = isStreaming
    if (was && !isStreaming) {
      syncToPersistence()
    }
  })

  useEffect(() => {
    if (!isStreaming) {
      syncToPersistence()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, temperature])

  const sendPrompt = useCallback(
    async (content: string) => {
      if (isStreaming) return

      // If viewing a non-latest version, truncate forward
      const currentVersions = versionsRef.current
      const currentHistory = historyRef.current
      const currentIdx = activeVersionIndexRef.current
      let workingHistory = [...currentHistory]
      let workingVersions = [...currentVersions]

      if (currentIdx >= 0 && currentIdx < currentVersions.length - 1) {
        const keepCount = currentIdx + 1
        workingVersions = currentVersions.slice(0, keepCount)
        const historyPairsToKeep = keepCount * 2
        workingHistory = currentHistory.slice(0, historyPairsToKeep)
        setVersions(workingVersions)
        setHistory(workingHistory)
      }

      const currentSpec =
        workingVersions.length > 0
          ? workingVersions[workingVersions.length - 1].spec
          : null

      const newHistory = [...workingHistory, { role: 'user' as const, content }]
      setHistory(newHistory)
      setIsStreaming(true)
      setCanvas((prev) => prev ? { ...prev, loading: true } : { spec: { root: '', elements: {} }, loading: true })

      const ctrl = new AbortController()
      abortRef.current = ctrl

      let systemPrompt = CREATE_SYSTEM_PROMPT
      if (currentSpec) {
        systemPrompt += `\n\nCurrent UI spec:\n\`\`\`json\n${JSON.stringify(currentSpec, null, 2)}\n\`\`\``
      }

      let assistantContent = ''
      let lastFinalSpec: UiSpec | null = null

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: ctrl.signal,
          body: JSON.stringify({
            messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
            model: MODEL_IDS[model],
            temperature,
            systemPrompt,
            searchEngine: 'none',
            enableUiTool: true,
          }),
        })

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        await readStream(res, (event) => {
          if (event.type === 'token') {
            assistantContent += event.text
          } else if (event.type === 'ui_loading') {
            setCanvas((prev) => ({
              spec: prev?.spec ?? { root: '', elements: {} },
              loading: true,
            }))
          } else if (event.type === 'ui_skeleton') {
            const skeletonSpec = (event as { type: 'ui_skeleton'; spec: UiSpec }).spec
            setCanvas({ spec: skeletonSpec, loading: true })
          } else if (event.type === 'ui_fill') {
            const fill = event as {
              type: 'ui_fill'
              id: string
              props: Record<string, unknown>
              on?: Record<string, { action: string; params?: Record<string, unknown> }>
              visible?: { $state: string; eq: unknown }
            }
            setCanvas((prev) => {
              const prevSpec = prev?.spec ?? { root: '', elements: {} }
              const prevEl = prevSpec.elements[fill.id]
              const merged: UiElement = {
                type: prevEl?.type ?? 'Card',
                props: fill.props,
                ...(prevEl?.children ? { children: prevEl.children } : {}),
                ...(fill.on ? { on: fill.on } : {}),
                ...(fill.visible ? { visible: fill.visible } : {}),
              }
              return {
                spec: {
                  ...prevSpec,
                  elements: { ...prevSpec.elements, [fill.id]: merged },
                },
                loading: true,
              }
            })
          } else if (event.type === 'ui_render') {
            const finalSpec = (event as { type: 'ui_render'; spec: UiSpec }).spec
            lastFinalSpec = finalSpec
            setCanvas({ spec: finalSpec, loading: false })
          } else if (event.type === 'retry') {
            const { attempt, waitMs } = event as { type: 'retry'; attempt: number; waitMs: number }
            toast.info(`Rate limited. Retry ${attempt}/3 in ${(waitMs / 1000).toFixed(1)}s…`)
          } else if (event.type === 'error') {
            toast.error((event as { type: 'error'; message: string }).message)
          }
        })

        if (lastFinalSpec) {
          const newVersion: CreationVersion = {
            prompt: content,
            spec: lastFinalSpec,
            timestamp: new Date().toISOString(),
          }
          setVersions((prev) => {
            const updated = [...prev, newVersion]
            versionsRef.current = updated
            return updated
          })
          setActiveVersionIndex(() => {
            const newIdx = versionsRef.current.length - 1
            activeVersionIndexRef.current = newIdx
            return newIdx
          })
        }

        if (assistantContent) {
          setHistory((prev) => {
            const updated = [...prev, { role: 'assistant' as const, content: assistantContent }]
            historyRef.current = updated
            return updated
          })
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          toast.error((err as Error).message ?? 'Failed to generate UI')
        }
      } finally {
        setIsStreaming(false)
        abortRef.current = null
      }
    },
    [isStreaming, model, temperature],
  )

  const viewVersion = useCallback(
    (index: number) => {
      if (index < 0 || index >= versions.length) return
      setActiveVersionIndex(index)
      activeVersionIndexRef.current = index
      setCanvas({ spec: versions[index].spec, loading: false })
    },
    [versions],
  )

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return {
    canvas,
    versions,
    activeVersionIndex,
    history,
    model,
    setModel,
    temperature,
    setTemperature,
    isStreaming,
    sendPrompt,
    viewVersion,
    stopStreaming,
  }
}
