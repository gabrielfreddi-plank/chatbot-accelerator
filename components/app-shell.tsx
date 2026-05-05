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
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="flex flex-col shrink-0 overflow-hidden">
          {/* Mode tabs at the top of the sidebar */}
          <div className="flex border-b border-border/40 bg-background shrink-0">
            <button
              onClick={() => switchMode('chat')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-[11px] font-semibold tracking-wide transition-colors',
                mode === 'chat'
                  ? 'text-indigo-400 border-b-2 border-indigo-500'
                  : 'text-muted-foreground/60 hover:text-muted-foreground border-b-2 border-transparent',
              )}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Chat
            </button>
            <button
              onClick={() => switchMode('create')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-[11px] font-semibold tracking-wide transition-colors',
                mode === 'create'
                  ? 'text-violet-400 border-b-2 border-violet-500'
                  : 'text-muted-foreground/60 hover:text-muted-foreground border-b-2 border-transparent',
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Create
            </button>
          </div>

          {/* Section-specific sidebar content */}
          {mode === 'chat' ? (
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
          )}
        </div>
      )}

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
