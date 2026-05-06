'use client'

import { useState } from 'react'
import { MessageSquare, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChatContainer } from './chat/chat-container'
import { ConversationSidebar } from './chat/conversation-sidebar'
import { CreateContainer } from './create/create-container'
import { CreationSidebar } from './create/creation-sidebar'
import { useConversations } from '@/hooks/use-conversations'
import { useCreations } from '@/hooks/use-creations'

type AppMode = 'chat' | 'create'

const MODE_KEY = 'chatbot:v1:mode'

function loadMode(): AppMode {
  if (typeof window === 'undefined') return 'chat'
  const saved = localStorage.getItem(MODE_KEY)
  return saved === 'create' ? 'create' : 'chat'
}

function saveMode(mode: AppMode) {
  if (typeof window === 'undefined') return
  localStorage.setItem(MODE_KEY, mode)
}

export function AppShell() {
  const [mode, setMode] = useState<AppMode>(loadMode)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const conversations = useConversations()
  const creations = useCreations()

  function switchMode(m: AppMode) {
    setMode(m)
    saveMode(m)
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Left column: mode tabs (always visible) + optional sidebar list */}
      <div className="flex shrink-0">
        {/* Mode tabs — always visible regardless of sidebar state */}
        <div className="flex flex-col border-r border-border/40 bg-background shrink-0">
          <button
            onClick={() => switchMode('chat')}
            title="Chat"
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-3 text-[11px] font-semibold tracking-wide transition-colors border-b border-border/20',
              mode === 'chat'
                ? 'text-indigo-400 bg-indigo-500/[0.07]'
                : 'text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/30',
            )}
          >
            <MessageSquare className="h-4 w-4" />
            <span className="text-[10px]">Chat</span>
          </button>
          <button
            onClick={() => switchMode('create')}
            title="Create"
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-3 text-[11px] font-semibold tracking-wide transition-colors border-b border-border/20',
              mode === 'create'
                ? 'text-violet-400 bg-violet-500/[0.07]'
                : 'text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/30',
            )}
          >
            <Sparkles className="h-4 w-4" />
            <span className="text-[10px]">Create</span>
          </button>
        </div>

        {/* Sidebar list — conditional on sidebarOpen */}
        {sidebarOpen && (
          mode === 'chat' ? (
            <ConversationSidebar
              conversations={conversations.conversations}
              activeId={conversations.activeId}
              onNew={conversations.createConversation}
              onSwitch={conversations.switchTo}
              onDelete={conversations.deleteConversation}
              onClose={() => setSidebarOpen(false)}
            />
          ) : (
            <CreationSidebar
              creations={creations.creations}
              activeId={creations.activeId}
              onNew={creations.createCreation}
              onSwitch={creations.switchTo}
              onDelete={creations.deleteCreation}
              onClose={() => setSidebarOpen(false)}
            />
          )
        )}
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {mode === 'chat' ? (
          <ChatContainer
            key={conversations.activeId}
            initialConversation={conversations.active}
            onSync={conversations.updateActive}
            onNewChat={conversations.createConversation}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen((v) => !v)}
          />
        ) : (
          <CreateContainer
            key={creations.activeId}
            initialCreation={creations.active}
            onSync={creations.updateActive}
            onNewCreation={creations.createCreation}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen((v) => !v)}
          />
        )}
      </div>
    </div>
  )
}
