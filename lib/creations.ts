import type { Creation, ChatModel } from './types'

export interface CreationSyncState {
  versions: Creation['versions']
  activeVersionIndex: number
  model: ChatModel
  temperature: number
  history: Creation['history']
}

const STORAGE_KEY = 'chatbot:v1:creations'
const ACTIVE_KEY = 'chatbot:v1:active-creation-id'

export function genCreationId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export function emptyCreation(id: string): Creation {
  return {
    id,
    title: 'New Creation',
    versions: [],
    activeVersionIndex: -1,
    model: 'sonnet',
    temperature: 0.7,
    history: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function titleFromPrompt(history: Creation['history']): string {
  const first = history.find((m) => m.role === 'user')
  if (!first?.content.trim()) return 'New Creation'
  const t = first.content.trim()
  return t.length <= 45 ? t : t.slice(0, 44) + '…'
}

export function loadCreations(): Creation[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Creation[]) : []
  } catch {
    return []
  }
}

export function saveCreations(creations: Creation[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(creations))
  } catch {
    // quota exceeded — ignore
  }
}

export function loadActiveCreationId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACTIVE_KEY)
}

export function saveActiveCreationId(id: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ACTIVE_KEY, id)
}
