import { NextResponse } from 'next/server'
import { eq, desc, inArray, and } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { conversations, messages, users } from '@/lib/schema'
import type { Conversation } from '@/lib/conversations'
import type { ChatModel, CumulativeUsage, SearchEngine } from '@/lib/types'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const db = getDb()
  if (!db) return NextResponse.json([])

  const userId = request.headers.get('X-User-ID')
  if (!userId) return NextResponse.json([])

  const convRows = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt))

  if (convRows.length === 0) return NextResponse.json([])

  const msgRows = await db
    .select()
    .from(messages)
    .where(inArray(messages.conversationId, convRows.map((r) => r.id)))
    .orderBy(messages.createdAt)

  const result: Conversation[] = convRows.map((c) => ({
    id: c.id,
    title: c.title,
    model: c.model as ChatModel,
    temperature: c.temperature,
    systemPrompt: c.systemPrompt,
    searchEngine: c.searchEngine as SearchEngine,
    usage: c.usage as CumulativeUsage,
    messages: msgRows
      .filter((m) => m.conversationId === c.id)
      .map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        ...(m.model ? { model: m.model as ChatModel } : {}),
      })),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }))

  return NextResponse.json(result)
}

export async function POST(request: Request) {
  const db = getDb()
  if (!db) return NextResponse.json({ ok: true })

  const userId = request.headers.get('X-User-ID')
  if (!userId) return NextResponse.json({ error: 'Missing X-User-ID' }, { status: 400 })

  const conv: Conversation = await request.json()

  await db.insert(users).values({ id: userId }).onConflictDoNothing()

  await db
    .insert(conversations)
    .values({
      id: conv.id,
      userId,
      title: conv.title,
      model: conv.model,
      temperature: conv.temperature,
      systemPrompt: conv.systemPrompt,
      searchEngine: conv.searchEngine,
      usage: conv.usage,
      createdAt: new Date(conv.createdAt),
      updatedAt: new Date(conv.updatedAt),
    })
    .onConflictDoUpdate({
      target: conversations.id,
      set: {
        title: conv.title,
        model: conv.model,
        temperature: conv.temperature,
        systemPrompt: conv.systemPrompt,
        searchEngine: conv.searchEngine,
        usage: conv.usage,
        updatedAt: new Date(conv.updatedAt),
      },
    })

  const persistable = conv.messages.filter(
    (m) => m.role === 'user' || m.role === 'assistant',
  )
  if (persistable.length > 0) {
    await db.delete(messages).where(eq(messages.conversationId, conv.id))
    await db.insert(messages).values(
      persistable.map((m) => ({
        id: m.id,
        conversationId: conv.id,
        role: m.role,
        content: m.content,
        model: m.model ?? null,
        createdAt: new Date(),
      })),
    )
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const db = getDb()
  if (!db) return NextResponse.json({ ok: true })

  const userId = request.headers.get('X-User-ID')
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!userId || !id) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  await db
    .delete(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))

  return NextResponse.json({ ok: true })
}
