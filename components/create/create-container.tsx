'use client'

import { Loader2, Menu, Sparkles, SquarePen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { JsonRenderUI } from '@/components/generated/json-render-ui'
import { ModelSelector } from '@/components/controls/model-selector'
import { TemperatureSlider } from '@/components/controls/temperature-slider'
import { VersionTimeline } from './version-timeline'
import { CreateInput } from './create-input'
import { useCreate } from '@/hooks/use-create'
import type { Creation } from '@/lib/types'
import type { CreationSyncState } from '@/lib/creations'

interface Props {
  initialCreation?: Creation
  onSync?: (state: CreationSyncState) => void
  onNewCreation?: () => void
  sidebarOpen?: boolean
  onToggleSidebar?: () => void
}

export function CreateContainer({
  initialCreation,
  onSync,
  onNewCreation,
  sidebarOpen,
  onToggleSidebar,
}: Props) {
  const {
    canvas,
    versions,
    activeVersionIndex,
    model,
    setModel,
    temperature,
    setTemperature,
    isStreaming,
    sendPrompt,
    viewVersion,
    stopStreaming,
  } = useCreate({ initialCreation, onSync })

  return (
    <div className="flex h-full flex-col w-full">
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
          <span className="font-semibold text-sm tracking-tight">Create</span>
          {isStreaming && (
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              generating…
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <TemperatureSlider value={temperature} onChange={setTemperature} disabled={isStreaming} />
          <ModelSelector value={model} onChange={setModel} disabled={isStreaming} />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onNewCreation}
            title="New creation"
            disabled={isStreaming}
          >
            <SquarePen className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Canvas area */}
      <div className="flex-1 overflow-y-auto">
        {canvas ? (
          <div className="p-6">
            <JsonRenderUI
              spec={canvas.spec}
              loading={canvas.loading}
              onAction={(action, params, state) => {
                if (action === 'submitForm') {
                  const text =
                    typeof params?.message === 'string'
                      ? params.message
                      : `Form submitted: ${JSON.stringify(state)}`
                  sendPrompt(text)
                }
                if (action === 'chartDrillDown') {
                  sendPrompt(`Tell me more about: ${String(params?.dataPoint ?? '')}`)
                }
              }}
            />
          </div>
        ) : (
          <div className="flex flex-1 h-full items-center justify-center min-h-[300px]">
            <div className="text-center space-y-5 max-w-sm px-4">
              <div className="flex justify-center">
                <div className="rounded-2xl bg-violet-600/10 p-4">
                  <Sparkles className="h-8 w-8 text-violet-400" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground/80">Create a UI</p>
                <p className="text-xs text-muted-foreground/60">
                  Describe the dashboard or interface you want to build.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 text-left">
                {[
                  'A sales dashboard with a bar chart and KPI cards',
                  'A simple contact form with validation',
                  'A data table with search and pagination',
                  'A user settings page with tabs',
                ].map((example) => (
                  <button
                    key={example}
                    onClick={() => sendPrompt(example)}
                    className="rounded-lg border border-border/40 px-3 py-2 text-xs text-muted-foreground hover:border-violet-500/40 hover:text-foreground hover:bg-violet-500/[0.04] transition-colors text-left"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Version timeline */}
      <VersionTimeline
        versions={versions}
        activeIndex={activeVersionIndex}
        onSelect={viewVersion}
      />

      {/* Input */}
      <CreateInput
        isStreaming={isStreaming}
        hasVersions={versions.length > 0}
        onSend={sendPrompt}
        onStop={stopStreaming}
      />
    </div>
  )
}
