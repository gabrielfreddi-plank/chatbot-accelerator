'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { AlertCircle, Check, ChevronDown, Copy, Loader2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Message } from '@/lib/types'
import { MODEL_LABELS } from '@/lib/cost'

function formatTime(ts?: number) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mb-3 last:mb-0 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-800 border-b border-white/5">
        <span className="text-[11px] text-muted-foreground/50 font-mono">{language}</span>
        <button
          onClick={handleCopy}
          className="rounded p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
          title="Copy code"
          aria-label="Copy code"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          style={oneDark}
          language={language}
          PreTag="div"
          wrapLongLines={false}
          className="!rounded-none !text-xs !m-0"
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}

function SearchResultList({ result }: { result: string }) {
  const items = result
    .split('\n\n')
    .filter(Boolean)
    .map((block) => {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
      const [title, url, ...rest] = lines
      return { title: title ?? '', url: url ?? '', snippet: rest.join(' ') }
    })
    .filter((item) => item.title)

  return (
    <div className="flex flex-col gap-1.5 mt-0.5">
      {items.map((item, i) => (
        <div key={i} className="rounded-lg bg-background/50 border border-border/25 p-2 space-y-0.5">
          <p className="text-xs font-medium text-foreground/85 line-clamp-2 leading-tight">
            {item.title}
          </p>
          {item.url.startsWith('http') && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-indigo-400 transition-colors truncate block"
            >
              {item.url}
            </a>
          )}
          {item.snippet && (
            <p className="text-xs text-muted-foreground/70 line-clamp-2 leading-relaxed">
              {item.snippet}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

function ToolResultContent({ result, kind }: { result: string; kind: string }) {
  if (kind === 'search') {
    return <SearchResultList result={result} />
  }
  return (
    <p className="font-mono text-xs text-muted-foreground break-words leading-relaxed whitespace-pre-wrap mt-0.5">
      {result}
    </p>
  )
}

function ToolStatusCard({ message }: { message: Message }) {
  const [expanded, setExpanded] = useState(false)
  const isDone = message.toolStatus === 'done'
  const hasContent = !!(message.toolResult || message.toolDetail)

  return (
    <div className="flex w-full justify-start py-0.5">
      <div
        className={cn(
          'w-full max-w-xs rounded-xl border text-xs overflow-hidden transition-all duration-200',
          isDone
            ? 'border-emerald-500/25 bg-emerald-500/[0.06]'
            : 'border-indigo-500/25 bg-indigo-500/[0.06]',
        )}
      >
        <button
          onClick={() => hasContent && setExpanded((v) => !v)}
          aria-expanded={hasContent ? expanded : undefined}
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 w-full text-left transition-colors',
            hasContent && 'hover:bg-white/5 cursor-pointer',
            !hasContent && 'cursor-default',
          )}
        >
          {isDone ? (
            <Check className="h-3 w-3 shrink-0 text-emerald-400" />
          ) : (
            <Loader2 className="h-3 w-3 animate-spin shrink-0 text-indigo-400" />
          )}
          <span className="font-medium text-foreground/75 flex-1 truncate">{message.toolLabel}</span>
          {hasContent && (
            <ChevronDown
              className={cn(
                'h-3 w-3 text-muted-foreground/40 transition-transform duration-200 shrink-0',
                expanded && 'rotate-180',
              )}
            />
          )}
        </button>
        {expanded && hasContent && (
          <div className="border-t border-border/30 px-3 py-2.5">
            {message.toolResult ? (
              <ToolResultContent result={message.toolResult} kind={message.toolResultKind ?? ''} />
            ) : message.toolDetail ? (
              <p className="font-mono text-xs text-muted-foreground break-all leading-relaxed">
                {message.toolDetail}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

interface Props {
  message: Message
  isStreaming?: boolean
  onRetry: (messageId: string) => void
}

export function MessageBubble({ message, isStreaming, onRetry }: Props) {
  const isUser = message.role === 'user'

  if (message.role === 'tool_status') {
    return <ToolStatusCard message={message} />
  }

  if (message.role === 'system_event') {
    return (
      <div className="flex items-center gap-3 py-1" role="status">
        <div className="flex-1 h-px bg-border/30" />
        <span className="text-xs text-muted-foreground/50 shrink-0">{message.content}</span>
        <div className="flex-1 h-px bg-border/30" />
      </div>
    )
  }

  const isError = message.status === 'error'

  return (
    <article
      className={cn('group flex w-full', isUser ? 'justify-end' : 'justify-start')}
      aria-label={`${isUser ? 'You' : 'Assistant'}: ${message.content.slice(0, 80)}`}
    >
      <div
        className={cn(
          'max-w-[78%] rounded-2xl text-sm leading-relaxed',
          isUser
            ? 'bg-indigo-600 text-white px-4 py-3 rounded-br-sm shadow-sm'
            : isError
              ? 'bg-card border border-destructive/40 px-4 py-3 rounded-bl-sm shadow-sm'
              : 'bg-card border border-border/50 px-4 py-3 rounded-bl-sm shadow-sm',
        )}
      >
        {isError ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-destructive/80">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs font-medium">Failed to respond</span>
            </div>
            {message.errorMessage && (
              <p className="text-xs text-muted-foreground">{message.errorMessage}</p>
            )}
            <button
              onClick={() => onRetry(message.id)}
              className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        ) : isUser ? (
          <span className="whitespace-pre-wrap">{message.content}</span>
        ) : message.content ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
              h1: ({ children }) => <h1 className="mb-2 mt-4 text-lg font-bold first:mt-0">{children}</h1>,
              h2: ({ children }) => <h2 className="mb-2 mt-4 text-base font-semibold first:mt-0">{children}</h2>,
              h3: ({ children }) => <h3 className="mb-1.5 mt-3 font-semibold first:mt-0">{children}</h3>,
              ul: ({ children }) => <ul className="mb-3 list-disc pl-5 last:mb-0 space-y-0.5">{children}</ul>,
              ol: ({ children }) => <ol className="mb-3 list-decimal pl-5 last:mb-0 space-y-0.5">{children}</ol>,
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              code: ({ children, className }) => {
                const match = /language-(\w+)/.exec(className || '')
                if (match) {
                  return <CodeBlock language={match[1]} code={String(children).replace(/\n$/, '')} />
                }
                return (
                  <code className="rounded bg-background/60 px-1 py-0.5 font-mono text-xs">{children}</code>
                )
              },
              pre: ({ children }) => <>{children}</>,
              blockquote: ({ children }) => (
                <blockquote className="mb-3 border-l-2 border-muted-foreground/30 pl-3 text-muted-foreground last:mb-0">
                  {children}
                </blockquote>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 underline underline-offset-2 hover:text-indigo-300 transition-colors"
                >
                  {children}
                </a>
              ),
              table: ({ children }) => (
                <div className="mb-3 overflow-x-auto last:mb-0">
                  <table className="w-full border-collapse text-xs">{children}</table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-border/40 bg-muted/60 px-3 py-1.5 text-left font-semibold">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-border/40 px-3 py-1.5">{children}</td>
              ),
              hr: () => <hr className="my-3 border-border/30" />,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
            }}
          >
            {message.content}
          </ReactMarkdown>
        ) : null}
        {isStreaming && !isUser && message.content === '' && (
          <span className="inline-flex gap-1 items-center h-4">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:300ms]" />
          </span>
        )}
        {!isUser && message.model && !isError && (
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground/60 font-medium tracking-wide">
              {MODEL_LABELS[message.model]}
            </span>
            {message.createdAt && (
              <span className="text-xs text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity">
                {formatTime(message.createdAt)}
              </span>
            )}
          </div>
        )}
        {isUser && message.createdAt && (
          <div className="mt-1 text-right">
            <span className="text-[11px] text-white/40 opacity-0 group-hover:opacity-100 transition-opacity">
              {formatTime(message.createdAt)}
            </span>
          </div>
        )}
      </div>
    </article>
  )
}
