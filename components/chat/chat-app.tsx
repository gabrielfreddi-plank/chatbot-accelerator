'use client'

import { useState } from 'react'
import { ChatContainer } from './chat-container'
import { ConversationSidebar } from './conversation-sidebar'
import { useConversations } from '@/hooks/use-conversations'

export function ChatApp() {
  const { conversations, activeId, active, createConversation, switchTo, updateActive, deleteConversation } =
    useConversations()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <>
      {sidebarOpen && (
        <ConversationSidebar
          conversations={conversations}
          activeId={activeId}
          onNew={createConversation}
          onSwitch={switchTo}
          onDelete={deleteConversation}
          onClose={() => setSidebarOpen(false)}
        />
      )}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <ChatContainer
          key={activeId}
          initialConversation={active}
          onSync={updateActive}
          onNewChat={createConversation}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />
      </div>
    </>
  )
}
