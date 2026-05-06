'use client'

import { KeyboardEvent, useRef, useState } from 'react'
import { Send, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  isStreaming: boolean
  hasVersions: boolean
  onSend: (text: string) => void
  onStop: () => void
}

export function CreateInput({ isStreaming, hasVersions, onSend, onStop }: Props) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleSubmit() {
    const trimmed = value.trim()
    if (!trimmed || isStreaming) return
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
      <div className="px-6 py-3 flex items-end gap-2.5">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            hasVersions
              ? 'Describe changes to the UI…'
              : 'Describe the UI you want to build…'
          }
          className="min-h-[44px] max-h-40 resize-none flex-1 bg-muted/40 border-border/50 focus-visible:ring-violet-500/30 focus-visible:border-violet-500/40 placeholder:text-muted-foreground/50 text-sm"
          rows={1}
          disabled={isStreaming}
        />
        {isStreaming ? (
          <Button
            size="icon"
            variant="secondary"
            onClick={onStop}
            title="Stop generating"
            className="shrink-0"
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={!value.trim()}
            title="Send"
            className="shrink-0 bg-violet-600 hover:bg-violet-500 text-white border-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
