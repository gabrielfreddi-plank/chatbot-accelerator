'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

interface Tab {
  id: string
  label: string
  content: string
}

interface TabsProps {
  tabs: Tab[]
  defaultTab?: string
}

export function GeneratedTabs({ tabs, defaultTab }: TabsProps) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id ?? '')
  const current = tabs.find((t) => t.id === active) ?? tabs[0]

  return (
    <div className="w-full space-y-0">
      {/* Tab bar */}
      <div className="flex gap-0 border-b border-border/40 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={cn(
              'shrink-0 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px',
              active === tab.id
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-muted-foreground/60 hover:text-foreground/70 hover:border-border/60',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {current && (
        <div className="rounded-b-xl border border-t-0 border-border/40 bg-background/40 p-4">
          <div className="prose prose-invert prose-sm max-w-none text-foreground/80 [&_p]:text-sm [&_p]:leading-relaxed [&_ul]:text-sm [&_li]:text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{current.content}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}
