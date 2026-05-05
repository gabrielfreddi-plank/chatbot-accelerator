'use client'

import { Search } from 'lucide-react'

interface TableToolbarProps {
  placeholder?: string
  value?: string
  onChange?: (v: string) => void
}

export function GeneratedTableToolbar({ placeholder = 'Search…', value = '', onChange }: TableToolbarProps) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-border/40 bg-background/60 pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
        />
      </div>
    </div>
  )
}
