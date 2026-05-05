'use client'

import { useCallback, useEffect, useState } from 'react'
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
import { getUserId } from '@/lib/user-id'

const API = '/api/conversations'

function sqlHeaders() {
  return { 'Content-Type': 'application/json', 'X-User-ID': getUserId() }
}

function syncConvToSql(conv: Conversation) {
  fetch(API, {
    method: 'POST',
    headers: sqlHeaders(),
    body: JSON.stringify(conv),
  }).catch(() => {})
}

function deleteConvFromSql(id: string) {
  fetch(`${API}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: sqlHeaders(),
  }).catch(() => {})
}

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

  // Hydrate from SQL on mount — SQL is source of truth
  useEffect(() => {
    const userId = getUserId()
    if (!userId) return

    fetch(API, { headers: { 'X-User-ID': userId } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Conversation[] | null) => {
        if (!data || data.length === 0) return
        setState((prev) => {
          const validId =
            data.some((c) => c.id === prev.activeId) ? prev.activeId : data[0].id
          saveConversations(data)
          saveActiveId(validId)
          return { conversations: data, activeId: validId }
        })
      })
      .catch(() => {})
  }, [])

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
      syncConvToSql(newConvo)
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
        const next = { ...c, ...patch, title: title || c.title, updatedAt: new Date().toISOString() }
        syncConvToSql(next)
        return next
      })
      saveConversations(updated)
      return { conversations: updated, activeId: prev.activeId }
    })
  }, [])

  const deleteConversation = useCallback((id: string) => {
    deleteConvFromSql(id)
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
