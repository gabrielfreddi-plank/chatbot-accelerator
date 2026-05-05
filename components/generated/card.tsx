'use client'

import type { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface CardProps {
  title?: string
  content?: string
  children?: ReactNode
}

export function GeneratedCard({ title, content, children }: CardProps) {
  return (
    <div className="w-full rounded-xl border border-border/40 bg-background/40 p-4 space-y-3">
      {title && (
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          {title}
        </p>
      )}
      {content && (
        <div className="prose prose-invert max-w-none text-sm text-foreground/80 prose-p:my-1 prose-strong:text-foreground">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      )}
      {children}
    </div>
  )
}
