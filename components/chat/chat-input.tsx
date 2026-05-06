'use client'

import { KeyboardEvent, useMemo, useRef, useState } from 'react'
import { Send, Square } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { parseCommand, isValidModel, isValidEngine } from '@/lib/commands'
import type { ChatModel, Message, SearchEngine } from '@/lib/types'
import { MODEL_LABELS } from '@/lib/cost'
import { ENGINE_LABELS } from '@/lib/search-engines'
import { countTextTokens, countTokens } from '@/lib/tokenizer'

const VALID_COMMANDS = '/cost, /model, /engine, /fetchpage, /system, /research'

interface Props {
  isStreaming: boolean
  messages: Message[]
  onSend: (text: string) => void
  onStop: () => void
  onModelChange: (model: ChatModel) => void
  onEngineChange: (engine: SearchEngine) => void
  onSystemChange: (prompt: string) => void
  onShowCost: () => void
  onResearch: (topic: string) => void
  onAddSystemEvent: (text: string) => void
}

export function ChatInput({
  isStreaming,
  messages,
  onSend,
  onStop,
  onModelChange,
  onEngineChange,
  onSystemChange,
  onShowCost,
  onResearch,
  onAddSystemEvent,
}: Props) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const contextTokens = useMemo(
    () => countTokens(messages.filter((m) => m.role === 'user' || m.role === 'assistant')),
    [messages],
  )
  const inputTokens = useMemo(() => countTextTokens(value), [value])

  function handleSubmit() {
    const trimmed = value.trim()
    if (!trimmed || isStreaming) return

    const cmd = parseCommand(trimmed)
    if (cmd) {
      setValue('')
      switch (cmd.type) {
        case 'cost':
          onShowCost()
          return
        case 'model':
          if (!cmd.name) {
            toast.error('Usage: /model <opus|sonnet|haiku>')
            return
          }
          if (!isValidModel(cmd.name)) {
            toast.error(`Unknown model "${cmd.name}". Choose: opus, sonnet, haiku`)
            return
          }
          onModelChange(cmd.name)
          onAddSystemEvent(`Model switched to ${MODEL_LABELS[cmd.name]}`)
          return
        case 'engine':
          if (!cmd.name) {
            toast.error('Usage: /engine <none|brave|tavily>')
            return
          }
          if (!isValidEngine(cmd.name)) {
            toast.error(`Unknown engine "${cmd.name}". Choose: none, brave, tavily`)
            return
          }
          onEngineChange(cmd.name)
          toast.success(`Search engine: ${ENGINE_LABELS[cmd.name]}`)
          return
        case 'fetchpage':
          if (!cmd.url) {
            toast.error('Usage: /fetchpage <url>')
            return
          }
          onSend(`Read the content at: ${cmd.url}`)
          return
        case 'system':
          if (!cmd.prompt) {
            toast.error('Usage: /system <your prompt>')
            return
          }
          onSystemChange(cmd.prompt)
          toast.success('System prompt updated')
          return
        case 'research':
          if (!cmd.topic) {
            toast.error('Usage: /research <topic>')
            return
          }
          onResearch(cmd.topic)
          return
        case 'unknown':
          toast.error(`Unknown command "${cmd.raw}". Valid: ${VALID_COMMANDS}`)
          return
      }
    }

    onSend(trimmed)
    setValue('')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="border-t border-border/40 bg-background/90 backdrop-blur-sm shrink-0">
      <div className="max-w-3xl mx-auto px-4 pt-3 pb-1 flex items-end gap-2.5">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message… (type / for commands)"
          aria-label="Message"
          className="min-h-[44px] max-h-40 resize-none flex-1 bg-muted/40 border-border/50 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/40 placeholder:text-muted-foreground/50 text-sm"
          rows={1}
          disabled={isStreaming}
        />
        {isStreaming ? (
          <Button
            size="icon"
            variant="secondary"
            onClick={onStop}
            title="Stop generating"
            aria-label="Stop generating"
            className="shrink-0"
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={!value.trim()}
            title="Send message"
            aria-label="Send message"
            className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white border-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="max-w-3xl mx-auto px-4 pb-2 flex justify-end">
        <span className="text-xs text-muted-foreground/70 tabular-nums" title="Estimated token count">
          {value ? `~${inputTokens} tokens` : `Context: ~${contextTokens} tokens`}
        </span>
      </div>
    </div>
  )
}
