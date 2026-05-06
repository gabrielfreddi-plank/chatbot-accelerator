export type ChatModel = 'opus' | 'sonnet' | 'haiku'

export type SearchEngine = 'none' | 'brave' | 'tavily'

export type MessageRole = 'user' | 'assistant' | 'tool_status'

export interface UiElement {
  type: string
  props: Record<string, unknown>
  children?: string[]
  on?: Record<string, { action: string; params?: Record<string, unknown> }>
  visible?: { $state: string; eq: unknown }
}

export interface UiSpec {
  root: string
  elements: Record<string, UiElement>
  state?: Record<string, unknown>
}

export interface Message {
  id: string
  role: MessageRole
  content: string
  model?: ChatModel
  createdAt?: number
  status?: 'error'
  errorMessage?: string
  toolStatus?: 'pending' | 'done'
  toolLabel?: string
  toolDetail?: string
  toolResult?: string
  toolResultKind?: string
}

export interface CreationVersion {
  prompt: string
  spec: UiSpec
  timestamp: string
}

export interface Creation {
  id: string
  title: string
  versions: CreationVersion[]
  activeVersionIndex: number
  model: ChatModel
  temperature: number
  history: { role: 'user' | 'assistant'; content: string }[]
  createdAt: string
  updatedAt: string
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  model: ChatModel
}

export interface CumulativeUsage {
  totalInputTokens: number
  totalOutputTokens: number
  usageByModel: Record<string, TokenUsage>
}

export interface ChatState {
  messages: Message[]
  model: ChatModel
  temperature: number
  systemPrompt: string
  usage: CumulativeUsage
  isStreaming: boolean
}

export interface ApiChatRequest {
  messages: { role: 'user' | 'assistant'; content: string }[]
  model: string
  temperature: number
  systemPrompt: string
  searchEngine?: SearchEngine
  enableUiTool?: boolean
}

export interface ApiResearchRequest {
  topic: string
  searchEngine: SearchEngine
}

export type SlashCommand =
  | { type: 'cost' }
  | { type: 'model'; name: string }
  | { type: 'engine'; name: string }
  | { type: 'fetchpage'; url: string }
  | { type: 'system'; prompt: string }
  | { type: 'research'; topic: string }
  | { type: 'unknown'; raw: string }
