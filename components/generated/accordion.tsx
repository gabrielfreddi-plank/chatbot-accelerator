'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AccordionItem {
  title: string
  content: string
}

interface AccordionProps {
  items: AccordionItem[]
}

export function GeneratedAccordion({ items }: AccordionProps) {
  const [open, setOpen] = useState<Set<number>>(new Set())

  function toggle(i: number) {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <div className="w-full space-y-1">
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border border-border/40 overflow-hidden">
          <button
            onClick={() => toggle(i)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-left text-foreground/80 hover:bg-white/[0.03] transition-colors"
          >
            {item.title}
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground/50 transition-transform duration-200 shrink-0',
                open.has(i) && 'rotate-180',
              )}
            />
          </button>
          {open.has(i) && (
            <div className="border-t border-border/30 px-4 pb-3 pt-3 text-sm text-muted-foreground/70 bg-background/20">
              {item.content}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
