'use client'

import { useState } from 'react'
import { ChevronDown, History } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CreationVersion } from '@/lib/types'

interface Props {
  versions: CreationVersion[]
  activeIndex: number
  onSelect: (index: number) => void
}

export function VersionTimeline({ versions, activeIndex, onSelect }: Props) {
  const [historyOpen, setHistoryOpen] = useState(false)

  if (versions.length === 0) return null

  return (
    <div className="border-t border-border/40 shrink-0">
      {/* Version dots */}
      <div className="flex items-center gap-2 px-6 py-2">
        <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-widest shrink-0">
          Versions
        </span>
        <div className="flex items-center gap-1.5 flex-1 overflow-x-auto">
          {versions.map((_, i) => (
            <button
              key={i}
              onClick={() => onSelect(i)}
              className={cn(
                'h-6 min-w-[24px] px-1.5 rounded-full text-[10px] font-medium transition-all',
                i === activeIndex
                  ? 'bg-violet-600 text-white shadow-sm shadow-violet-900/30'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
              title={versions[i].prompt}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <button
          onClick={() => setHistoryOpen((v) => !v)}
          className={cn(
            'flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0',
            historyOpen && 'text-muted-foreground',
          )}
        >
          <History className="h-3 w-3" />
          <span>History</span>
          <ChevronDown
            className={cn(
              'h-3 w-3 transition-transform duration-200',
              historyOpen && 'rotate-180',
            )}
          />
        </button>
      </div>

      {/* Collapsible prompt history */}
      {historyOpen && (
        <div className="border-t border-border/30 px-6 py-2 max-h-40 overflow-y-auto space-y-1">
          {versions.map((ver, i) => (
            <button
              key={i}
              onClick={() => onSelect(i)}
              className={cn(
                'flex items-start gap-2 w-full text-left rounded-lg px-2.5 py-1.5 transition-colors text-xs',
                i === activeIndex
                  ? 'bg-violet-600/15 text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
            >
              <span
                className={cn(
                  'shrink-0 h-4 min-w-[16px] rounded-full text-[9px] font-bold flex items-center justify-center mt-0.5',
                  i === activeIndex
                    ? 'bg-violet-600 text-white'
                    : 'bg-muted/80 text-muted-foreground',
                )}
              >
                {i + 1}
              </span>
              <span className="line-clamp-2 leading-tight">{ver.prompt}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
