import type Anthropic from '@anthropic-ai/sdk'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

const NOTES_FILE = join(process.cwd(), 'data', 'notes.json')

interface Note {
  id: string
  content: string
  tags: string[]
  createdAt: string
}

function loadNotes(): Note[] {
  if (!existsSync(NOTES_FILE)) return []
  try {
    return JSON.parse(readFileSync(NOTES_FILE, 'utf-8')) as Note[]
  } catch {
    return []
  }
}

function persistNotes(notes: Note[]): void {
  mkdirSync(join(process.cwd(), 'data'), { recursive: true })
  writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2), 'utf-8')
}

export const saveNoteTool: Anthropic.Tool = {
  name: 'save_note',
  description:
    'Save a note to persistent storage for later retrieval. Use when the user shares important information worth remembering across the conversation — preferences, key facts, decisions, deadlines, or context likely needed later.',
  input_schema: {
    type: 'object' as const,
    properties: {
      content: { type: 'string', description: 'The note content to save' },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional tags to categorize the note, e.g. ["preference", "deadline"]',
      },
    },
    required: ['content'],
  },
}

export const readNotesTool: Anthropic.Tool = {
  name: 'read_notes',
  description:
    'Retrieve previously saved notes. Use when the user references something that may have been noted before, or when prior context would be relevant to the current request.',
  input_schema: {
    type: 'object' as const,
    properties: {
      filter: {
        type: 'string',
        description: 'Optional keyword to filter notes by content or tags',
      },
    },
    required: [],
  },
}

export function executeSaveNote(content: string, tags: string[] = []): string {
  const notes = loadNotes()
  const note: Note = {
    id: Math.random().toString(36).slice(2),
    content,
    tags,
    createdAt: new Date().toISOString(),
  }
  notes.push(note)
  persistNotes(notes)
  return `Note saved (id: ${note.id})`
}

export function executeReadNotes(filter?: string): string {
  const notes = loadNotes()
  if (notes.length === 0) return 'No notes saved yet.'

  const filtered = filter
    ? notes.filter(
        (n) =>
          n.content.toLowerCase().includes(filter.toLowerCase()) ||
          n.tags.some((t) => t.toLowerCase().includes(filter.toLowerCase())),
      )
    : notes

  if (filtered.length === 0) return `No notes matching "${filter}".`

  return filtered
    .map(
      (n) =>
        `[${n.createdAt.slice(0, 10)}${n.tags.length ? ` | ${n.tags.join(', ')}` : ''}] ${n.content}`,
    )
    .join('\n---\n')
}
