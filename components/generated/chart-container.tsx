'use client'

import type { ReactNode } from 'react'

interface ChartContainerProps {
  title: string
  description?: string
  children?: ReactNode
}

export function GeneratedChartContainer({ title, description, children }: ChartContainerProps) {
  return (
    <div className="w-full space-y-1.5">
      <div>
        <p className="text-sm font-semibold text-foreground/80">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground/60">{description}</p>
        )}
      </div>
      {children}
    </div>
  )
}
