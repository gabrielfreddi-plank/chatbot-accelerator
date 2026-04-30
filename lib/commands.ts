import type { ChatModel, SearchEngine, SlashCommand } from './types'

const VALID_MODELS = new Set<ChatModel>(['opus', 'sonnet', 'haiku'])
const VALID_ENGINES = new Set<SearchEngine>(['none', 'brave', 'tavily'])

export function parseCommand(input: string): SlashCommand | null {
  const trimmed = input.trim()
  if (!trimmed.startsWith('/')) return null

  const parts = trimmed.slice(1).split(/\s+/)
  const cmd = parts[0].toLowerCase()

  if (cmd === 'cost') return { type: 'cost' }

  if (cmd === 'model') {
    const name = parts[1]?.toLowerCase()
    return { type: 'model', name: name ?? '' }
  }

  if (cmd === 'engine') {
    const name = parts[1]?.toLowerCase()
    return { type: 'engine', name: name ?? '' }
  }

  if (cmd === 'fetchpage') {
    const url = parts[1] ?? ''
    return { type: 'fetchpage', url }
  }

  if (cmd === 'system') {
    const prompt = trimmed.slice('/system'.length).trim()
    return { type: 'system', prompt }
  }

  if (cmd === 'research') {
    const topic = trimmed.slice('/research'.length).trim()
    return { type: 'research', topic }
  }

  return { type: 'unknown', raw: trimmed }
}

export function isValidModel(name: string): name is ChatModel {
  return VALID_MODELS.has(name as ChatModel)
}

export function isValidEngine(name: string): name is SearchEngine {
  return VALID_ENGINES.has(name as SearchEngine)
}
