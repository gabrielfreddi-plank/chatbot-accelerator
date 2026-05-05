import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { messages } from '@/lib/schema'
import type { ChatModel, Message } from '@/lib/types'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = getDb()
  if (!db) return NextResponse.json([])

  const { id: conversationId } = await params

  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt)

  const result: Message[] = rows.map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    content: m.content,
    ...(m.model ? { model: m.model as ChatModel } : {}),
  }))

  return NextResponse.json(result)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = getDb()
  if (!db) return NextResponse.json({ ok: true })

  const { id: conversationId } = await params
  const msgs: Message[] = await request.json()

  const persistable = msgs.filter((m) => m.role === 'user' || m.role === 'assistant')
  if (persistable.length === 0) return NextResponse.json({ ok: true })

  await db.delete(messages).where(eq(messages.conversationId, conversationId))
  await db.insert(messages).values(
    persistable.map((m) => ({
      id: m.id,
      conversationId,
      role: m.role,
      content: m.content,
      model: m.model ?? null,
      createdAt: new Date(),
    })),
  )

  return NextResponse.json({ ok: true })
}
