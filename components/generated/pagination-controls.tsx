'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaginationControlsProps {
  totalPages: number
  value?: number
  onChange?: (page: number) => void
}

export function GeneratedPaginationControls({ totalPages, value = 1, onChange }: PaginationControlsProps) {
  const safeTotalPages = Number.isFinite(totalPages) ? Math.max(1, Math.floor(totalPages)) : 1
  const safeValue = Number.isFinite(value) ? value : 1
  const page = Math.max(1, Math.min(safeValue, safeTotalPages))

  return (
    <div className="flex items-center justify-center gap-1 mt-2">
      <button
        onClick={() => onChange?.(page - 1)}
        disabled={page <= 1}
        className={cn(
          'flex items-center justify-center h-7 w-7 rounded-md text-xs transition-colors',
          page <= 1
            ? 'text-muted-foreground/30 cursor-not-allowed'
            : 'text-muted-foreground/60 hover:bg-white/5 hover:text-foreground',
        )}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>

      {Array.from({ length: Math.min(safeTotalPages, 7) }, (_, i) => {
        const p = i + 1
        return (
          <button
            key={p}
            onClick={() => onChange?.(p)}
            className={cn(
              'flex items-center justify-center h-7 w-7 rounded-md text-xs transition-colors',
              p === page
                ? 'bg-indigo-600/70 text-white font-medium'
                : 'text-muted-foreground/60 hover:bg-white/5 hover:text-foreground',
            )}
          >
            {p}
          </button>
        )
      })}

      <button
        onClick={() => onChange?.(page + 1)}
        disabled={page >= safeTotalPages}
        className={cn(
          'flex items-center justify-center h-7 w-7 rounded-md text-xs transition-colors',
          page >= safeTotalPages
            ? 'text-muted-foreground/30 cursor-not-allowed'
            : 'text-muted-foreground/60 hover:bg-white/5 hover:text-foreground',
        )}
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
