import type { Message, ChatModel, SearchEngine, CumulativeUsage } from './types'

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  model: ChatModel
  temperature: number
  systemPrompt: string
  searchEngine: SearchEngine
  usage: CumulativeUsage
  createdAt: string
  updatedAt: string
}

export interface ConvSyncState {
  messages: Message[]
  model: ChatModel
  temperature: number
  systemPrompt: string
  searchEngine: SearchEngine
  usage: CumulativeUsage
}

const STORAGE_KEY = 'chatbot:v1:conversations'
const ACTIVE_KEY = 'chatbot:v1:active-id'

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export function emptyConversation(id: string): Conversation {
  return {
    id,
    title: 'New Chat',
    messages: [],
    model: 'sonnet',
    temperature: 0.7,
    systemPrompt: '',
    searchEngine: 'none',
    usage: { totalInputTokens: 0, totalOutputTokens: 0, usageByModel: {} },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function titleFromMessages(messages: Message[]): string {
  const first = messages.find((m) => m.role === 'user')
  if (!first?.content.trim()) return 'New Chat'
  const t = first.content.trim()
  return t.length <= 45 ? t : t.slice(0, 44) + '…'
}

export function loadConversations(): Conversation[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Conversation[]) : []
  } catch {
    return []
  }
}

export function saveConversations(convos: Conversation[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(convos))
  } catch {
    // quota exceeded — ignore
  }
}

export function loadActiveId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACTIVE_KEY)
}

export function saveActiveId(id: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ACTIVE_KEY, id)
}

export function relativeTime(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime()
  const min = Math.floor(ms / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const day = Math.floor(hr / 24)
  if (day === 1) return 'yesterday'
  if (day < 7) return `${day}d`
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
