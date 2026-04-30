'use client'

import { useCallback, useState } from 'react'
import type { Conversation, ConvSyncState } from '@/lib/conversations'
import {
  emptyConversation,
  genId,
  loadActiveId,
  loadConversations,
  saveActiveId,
  saveConversations,
  titleFromMessages,
} from '@/lib/conversations'

function initState(): { conversations: Conversation[]; activeId: string } {
  const convos = loadConversations()
  const savedId = loadActiveId()
  if (convos.length > 0) {
    const validId = savedId && convos.some((c) => c.id === savedId) ? savedId : convos[0].id
    return { conversations: convos, activeId: validId }
  }
  const id = genId()
  const first = emptyConversation(id)
  saveConversations([first])
  saveActiveId(id)
  return { conversations: [first], activeId: id }
}

export function useConversations() {
  const [state, setState] = useState<{ conversations: Conversation[]; activeId: string }>(initState)

  const { conversations, activeId } = state
  const active = conversations.find((c) => c.id === activeId) ?? conversations[0]

  const createConversation = useCallback(() => {
    setState((prev) => {
      const current = prev.conversations.find((c) => c.id === prev.activeId)
      if (current?.messages.length === 0) return prev
      const id = genId()
      const newConvo = emptyConversation(id)
      const updated = [newConvo, ...prev.conversations]
      saveConversations(updated)
      saveActiveId(id)
      return { conversations: updated, activeId: id }
    })
  }, [])

  const switchTo = useCallback((id: string) => {
    saveActiveId(id)
    setState((prev) => ({ ...prev, activeId: id }))
  }, [])

  const updateActive = useCallback((patch: ConvSyncState) => {
    setState((prev) => {
      const updated = prev.conversations.map((c) => {
        if (c.id !== prev.activeId) return c
        const title = titleFromMessages(patch.messages)
        return { ...c, ...patch, title: title || c.title, updatedAt: new Date().toISOString() }
      })
      saveConversations(updated)
      return { conversations: updated, activeId: prev.activeId }
    })
  }, [])

  const deleteConversation = useCallback((id: string) => {
    setState((prev) => {
      let remaining = prev.conversations.filter((c) => c.id !== id)
      let newActiveId = prev.activeId
      if (remaining.length === 0) {
        const freshId = genId()
        remaining = [emptyConversation(freshId)]
        newActiveId = freshId
      } else if (prev.activeId === id) {
        newActiveId = remaining[0].id
      }
      saveConversations(remaining)
      saveActiveId(newActiveId)
      return { conversations: remaining, activeId: newActiveId }
    })
  }, [])

  return { conversations, activeId, active, createConversation, switchTo, updateActive, deleteConversation }
}
