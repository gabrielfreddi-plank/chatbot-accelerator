'use client'

import { Loader2, Menu, SquarePen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatMessages } from './chat-messages'
import { ChatInput } from './chat-input'
import { ModelSelector } from '@/components/controls/model-selector'
import { SearchEngineSelector } from '@/components/controls/search-engine-selector'
import { TemperatureSlider } from '@/components/controls/temperature-slider'
import { SystemPromptDialog } from '@/components/controls/system-prompt-dialog'
import { CostPanel } from '@/components/controls/cost-panel'
import { useChat } from '@/hooks/use-chat'
import { useContextHealth } from '@/hooks/use-context-health'
import type { Conversation, ConvSyncState } from '@/lib/conversations'

interface Props {
  initialConversation?: Conversation
  onSync?: (state: ConvSyncState) => void
  onNewChat?: () => void
  sidebarOpen?: boolean
  onToggleSidebar?: () => void
}

export function ChatContainer({ initialConversation, onSync, onNewChat, sidebarOpen, onToggleSidebar }: Props) {
  const {
    messages,
    model,
    setModel,
    temperature,
    setTemperature,
    systemPrompt,
    setSystemPrompt,
    searchEngine,
    setSearchEngine,
    isStreaming,
    isSearching,
    usage,
    showCost,
    setShowCost,
    sendMessage,
    addSystemEvent,
    retryMessage,
    runResearch,
    stopStreaming,
  } = useChat({
    initialMessages: initialConversation?.messages,
    initialModel: initialConversation?.model,
    initialTemperature: initialConversation?.temperature,
    initialSystemPrompt: initialConversation?.systemPrompt,
    initialSearchEngine: initialConversation?.searchEngine,
    initialUsage: initialConversation?.usage,
    onSync,
  })

  const { isWarn, isDanger, tokenCount } = useContextHealth(messages)

  return (
    <div className="flex h-full flex-col max-w-5xl mx-auto w-full border-x border-border/30">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 border-b border-border/40 px-4 py-2.5 bg-background/90 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
            onClick={onToggleSidebar}
            title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-base tracking-tight">Chatbot Accelerator</span>
          {(isStreaming || isSearching) && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {isSearching ? 'searching…' : 'streaming…'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <TemperatureSlider value={temperature} onChange={setTemperature} disabled={isStreaming} />
          <ModelSelector value={model} onChange={setModel} disabled={isStreaming} />
          <SearchEngineSelector value={searchEngine} onChange={setSearchEngine} disabled={isStreaming} />
          <SystemPromptDialog value={systemPrompt} onChange={setSystemPrompt} />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onNewChat}
            title="New chat"
            disabled={isStreaming}
          >
            <SquarePen className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Messages */}
      <ChatMessages messages={messages} isStreaming={isStreaming} onRetry={retryMessage} />

      {/* Context health warning */}
      {(isWarn || isDanger) && !isStreaming && (
        <div className="max-w-3xl w-full mx-auto px-4 py-1.5">
          <p className={`text-xs text-center px-3 py-1 rounded-md ${isDanger ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-500'}`}>
            {isDanger
              ? `Context large (~${tokenCount.toLocaleString()} tokens) — server will summarize oldest messages automatically`
              : `Context growing (~${tokenCount.toLocaleString()} tokens) — summarization triggers at 60k`}
          </p>
        </div>
      )}

      {showCost && (
        <div className="max-w-3xl w-full mx-auto px-4">
          <CostPanel usage={usage} messages={messages} onClose={() => setShowCost(false)} />
        </div>
      )}

      {/* Input */}
      <ChatInput
        isStreaming={isStreaming}
        messages={messages}
        onSend={sendMessage}
        onStop={stopStreaming}
        onModelChange={setModel}
        onEngineChange={setSearchEngine}
        onSystemChange={setSystemPrompt}
        onShowCost={() => setShowCost((v) => !v)}
        onResearch={runResearch}
        onAddSystemEvent={addSystemEvent}
      />
    </div>
  )
}
