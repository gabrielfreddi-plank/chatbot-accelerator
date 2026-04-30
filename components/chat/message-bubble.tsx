'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Check, ChevronDown, Copy, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Message } from '@/lib/types'
import { MODEL_LABELS } from '@/lib/cost'

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative mb-3 last:mb-0">
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 z-10 rounded p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
        title="Copy code"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <SyntaxHighlighter
        style={oneDark}
        language={language}
        PreTag="div"
        className="!rounded-lg !text-xs"
      >
        {code}
      </SyntaxHighlighter>
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
          <p className="text-[11px] font-medium text-foreground/85 line-clamp-2 leading-tight">
            {item.title}
          </p>
          {item.url.startsWith('http') && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-indigo-400/70 hover:text-indigo-400 transition-colors truncate block"
            >
              {item.url}
            </a>
          )}
          {item.snippet && (
            <p className="text-[10px] text-muted-foreground/60 line-clamp-2 leading-relaxed">
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
    <p className="font-mono text-[11px] text-muted-foreground break-words leading-relaxed whitespace-pre-wrap mt-0.5">
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
          'w-72 rounded-xl border text-xs overflow-hidden transition-all duration-200',
          isDone
            ? 'border-emerald-500/25 bg-emerald-500/[0.06]'
            : 'border-indigo-500/25 bg-indigo-500/[0.06]',
        )}
      >
        <button
          onClick={() => hasContent && setExpanded((v) => !v)}
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
              <p className="font-mono text-[11px] text-muted-foreground break-all leading-relaxed">
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
}

export function MessageBubble({ message, isStreaming }: Props) {
  const isUser = message.role === 'user'

  if (message.role === 'tool_status') {
    return <ToolStatusCard message={message} />
  }

  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[78%] rounded-2xl text-sm leading-relaxed',
          isUser
            ? 'bg-indigo-600 text-white px-4 py-2.5 rounded-br-sm shadow-md shadow-indigo-900/20'
            : 'bg-card border border-border/50 px-4 py-3 rounded-bl-sm shadow-sm',
        )}
      >
        {isUser ? (
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
        {!isUser && message.model && (
          <div className="mt-2 text-[10px] text-muted-foreground/50 font-medium tracking-wide">
            {MODEL_LABELS[message.model]}
          </div>
        )}
      </div>
    </div>
  )
}
