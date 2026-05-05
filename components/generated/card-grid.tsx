'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardGridProps {
  columns?: 1 | 2 | 3 | 4
  children?: ReactNode
}

const colClass: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
}

export function GeneratedCardGrid({ columns = 2, children }: CardGridProps) {
  return (
    <div className={cn('grid gap-3 w-full', colClass[columns] ?? colClass[2])}>
      {children}
    </div>
  )
}
