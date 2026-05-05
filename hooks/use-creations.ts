'use client'

import { useCallback, useState } from 'react'
import type { Creation } from '@/lib/types'
import type { CreationSyncState } from '@/lib/creations'
import {
  emptyCreation,
  genCreationId,
  loadActiveCreationId,
  loadCreations,
  saveActiveCreationId,
  saveCreations,
  titleFromPrompt,
} from '@/lib/creations'

function initState(): { creations: Creation[]; activeId: string } {
  const items = loadCreations()
  const savedId = loadActiveCreationId()
  if (items.length > 0) {
    const validId = savedId && items.some((c) => c.id === savedId) ? savedId : items[0].id
    return { creations: items, activeId: validId }
  }
  const id = genCreationId()
  const first = emptyCreation(id)
  saveCreations([first])
  saveActiveCreationId(id)
  return { creations: [first], activeId: id }
}

export function useCreations() {
  const [state, setState] = useState<{ creations: Creation[]; activeId: string }>(initState)

  const { creations, activeId } = state
  const active = creations.find((c) => c.id === activeId) ?? creations[0]

  const createCreation = useCallback(() => {
    setState((prev) => {
      const current = prev.creations.find((c) => c.id === prev.activeId)
      if (current?.versions.length === 0 && current.history.length === 0) return prev
      const id = genCreationId()
      const newItem = emptyCreation(id)
      const updated = [newItem, ...prev.creations]
      saveCreations(updated)
      saveActiveCreationId(id)
      return { creations: updated, activeId: id }
    })
  }, [])

  const switchTo = useCallback((id: string) => {
    saveActiveCreationId(id)
    setState((prev) => ({ ...prev, activeId: id }))
  }, [])

  const updateActive = useCallback((patch: CreationSyncState) => {
    setState((prev) => {
      const updated = prev.creations.map((c) => {
        if (c.id !== prev.activeId) return c
        const title = titleFromPrompt(patch.history)
        return { ...c, ...patch, title: title || c.title, updatedAt: new Date().toISOString() }
      })
      saveCreations(updated)
      return { creations: updated, activeId: prev.activeId }
    })
  }, [])

  const deleteCreation = useCallback((id: string) => {
    setState((prev) => {
      let remaining = prev.creations.filter((c) => c.id !== id)
      let newActiveId = prev.activeId
      if (remaining.length === 0) {
        const freshId = genCreationId()
        remaining = [emptyCreation(freshId)]
        newActiveId = freshId
      } else if (prev.activeId === id) {
        newActiveId = remaining[0].id
      }
      saveCreations(remaining)
      saveActiveCreationId(newActiveId)
      return { creations: remaining, activeId: newActiveId }
    })
  }, [])

  return { creations, activeId, active, createCreation, switchTo, updateActive, deleteCreation }
}
