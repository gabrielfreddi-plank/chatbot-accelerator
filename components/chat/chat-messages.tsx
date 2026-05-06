'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { Message } from '@/lib/types'
import { MessageBubble } from './message-bubble'

interface Props {
  messages: Message[]
  isStreaming: boolean
}

const SCROLL_THRESHOLD = 80

export function ChatMessages({ messages, isStreaming }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [userScrolledUp, setUserScrolledUp] = useState(false)

  function isNearBottom() {
    const el = containerRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD
  }

  function handleScroll() {
    setUserScrolledUp(!isNearBottom())
  }

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    setUserScrolledUp(false)
  }

  useEffect(() => {
    if (!userScrolledUp) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, userScrolledUp])

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">Start a conversation</p>
          <p className="text-xs text-muted-foreground/70">
            Type{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">/model</code>{' '}
            to switch models,{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">/research</code>{' '}
            for deep research
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex flex-1 flex-col overflow-y-auto"
      >
        <div className="max-w-3xl w-full mx-auto px-4 py-6 flex flex-col gap-3">
          {messages.map((msg, i) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isStreaming={isStreaming && i === messages.length - 1}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {userScrolledUp && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
          <button
            onClick={scrollToBottom}
            className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/95 px-3 py-1.5 text-xs text-muted-foreground shadow-md backdrop-blur-sm hover:text-foreground transition-colors"
          >
            <ChevronDown className="h-3.5 w-3.5" />
            New messages
          </button>
        </div>
      )}
    </div>
  )
}
