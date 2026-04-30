'use client'

import { MessageSquare, Plus, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { relativeTime } from '@/lib/conversations'
import type { Conversation } from '@/lib/conversations'
import { Button } from '@/components/ui/button'

interface Props {
  conversations: Conversation[]
  activeId: string
  onNew: () => void
  onSwitch: (id: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export function ConversationSidebar({ conversations, activeId, onNew, onSwitch, onDelete, onClose }: Props) {
  return (
    <aside className="flex flex-col w-60 shrink-0 border-r border-border/40 bg-background overflow-hidden">
      <div className="flex items-center justify-between px-3 py-3 border-b border-border/30 shrink-0">
        <span className="text-[11px] font-semibold text-muted-foreground/60 tracking-widest uppercase">
          Chats
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={onClose}
          title="Close sidebar"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="px-2 py-1.5 shrink-0 border-b border-border/20">
        <button
          onClick={onNew}
          className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-0.5">
        {conversations.map((convo) => (
          <div
            key={convo.id}
            role="button"
            tabIndex={0}
            onClick={() => onSwitch(convo.id)}
            onKeyDown={(e) => e.key === 'Enter' && onSwitch(convo.id)}
            className={cn(
              'group relative flex items-start gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors text-xs select-none',
              convo.id === activeId
                ? 'bg-indigo-600/15 text-foreground'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
            )}
          >
            <MessageSquare
              className={cn(
                'h-3.5 w-3.5 shrink-0 mt-0.5',
                convo.id === activeId ? 'text-indigo-400' : '',
              )}
            />
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium leading-tight">{convo.title}</p>
              <p className="text-[10px] text-muted-foreground/50 mt-0.5" suppressHydrationWarning>
                {relativeTime(convo.updatedAt)}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(convo.id)
              }}
              className="shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-destructive transition-all"
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </aside>
  )
}
