import OpenAI from 'openai'
import { eq, desc, sql } from 'drizzle-orm'
import { getDb } from './db'
import { memories, users } from './schema'

type MemoryCategory = 'preference' | 'fact' | 'goal' | 'context'

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function getEmbeddingClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

async function embed(text: string): Promise<number[] | null> {
  const client = getEmbeddingClient()
  if (!client) return null
  const resp = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
  return resp.data[0].embedding
}

export async function saveUserMemory(
  userId: string,
  content: string,
  category: MemoryCategory,
): Promise<string> {
  const db = getDb()
  if (!db) return 'Memory storage unavailable (no DATABASE_URL).'

  await db.insert(users).values({ id: userId }).onConflictDoNothing()

  const embedding = await embed(content)
  const now = new Date()

  await db.insert(memories).values({
    id: makeId(),
    userId,
    content,
    category,
    embedding,
    createdAt: now,
    updatedAt: now,
  })

  return `Memory saved: "${content.slice(0, 80)}${content.length > 80 ? '…' : ''}"`
}

export async function searchMemories(userId: string, query: string): Promise<string> {
  const db = getDb()
  if (!db) return 'Memory search unavailable (no DATABASE_URL).'

  const queryEmbedding = await embed(query)

  let rows: { id: string; content: string; category: string; createdAt: Date }[]

  if (queryEmbedding) {
    // Cosine similarity search via pgvector <=> operator
    rows = await db.execute(sql`
      SELECT id, content, category, created_at as "createdAt"
      FROM memories
      WHERE user_id = ${userId}
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
      LIMIT 5
    `) as unknown as typeof rows
  } else {
    // Fallback: return most recent memories when embeddings unavailable
    rows = await db
      .select({ id: memories.id, content: memories.content, category: memories.category, createdAt: memories.createdAt })
      .from(memories)
      .where(eq(memories.userId, userId))
      .orderBy(desc(memories.createdAt))
      .limit(5)
  }

  if (rows.length === 0) return 'No relevant memories found.'
  return rows.map((r) => `[${r.category}] ${r.content}`).join('\n')
}

export async function getRecentMemories(
  userId: string,
  limit = 5,
): Promise<{ content: string; category: string }[]> {
  const db = getDb()
  if (!db || !userId) return []

  const rows = await db
    .select({ content: memories.content, category: memories.category })
    .from(memories)
    .where(eq(memories.userId, userId))
    .orderBy(desc(memories.createdAt))
    .limit(limit)

  return rows
}

export const MEMORY_SYSTEM_PROMPT_ADDENDUM = `
When you learn something relevant and durable about the user — preferences, goals, personal facts, or important context — call save_user_memory immediately. When the user asks something that might benefit from past context, call search_memories first.`

export const saveUserMemoryTool = {
  name: 'save_user_memory',
  description:
    'Save a durable memory about the user. Call this when you learn something relevant that should persist across conversations: preferences, goals, personal facts, or important context.',
  input_schema: {
    type: 'object' as const,
    properties: {
      content: { type: 'string', description: 'The memory to save (concise, one fact per call)' },
      category: {
        type: 'string',
        enum: ['preference', 'fact', 'goal', 'context'],
        description: 'Category for the memory',
      },
    },
    required: ['content', 'category'],
  },
}

export const searchMemoriesTool = {
  name: 'search_memories',
  description:
    'Search past memories about the user using semantic similarity. Call this before answering questions that might benefit from prior context.',
  input_schema: {
    type: 'object' as const,
    properties: {
      query: { type: 'string', description: 'What to search for in the user\'s memories' },
    },
    required: ['query'],
  },
}
