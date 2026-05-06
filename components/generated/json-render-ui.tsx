'use client'

import { Fragment, useState, useRef, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import type { UiSpec } from '@/lib/types'
import { REGISTRY } from '@/lib/ui-registry'

const CHILD_CONTAINER_TYPES = new Set(['Stack', 'CardGrid', 'ChartContainer', 'ConditionalField', 'TabPanel'])

interface Props {
  spec?: UiSpec | null
  loading?: boolean
  onAction?: (action: string, params?: Record<string, unknown>, state?: Record<string, unknown>) => void
}

function getStatePath(state: Record<string, unknown>, path: string): unknown {
  const parts = path.replace(/^\//, '').split('/').filter(Boolean)
  let cur: unknown = state
  for (const p of parts) {
    if (typeof cur !== 'object' || cur === null) return undefined
    cur = (cur as Record<string, unknown>)[p]
  }
  return cur
}

function setStatePath(state: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const parts = path.replace(/^\//, '').split('/').filter(Boolean)
  function nest(obj: Record<string, unknown>, keys: string[]): Record<string, unknown> {
    if (keys.length === 1) return { ...obj, [keys[0]]: value }
    const key = keys[0]
    const child = typeof obj[key] === 'object' && obj[key] !== null
      ? (obj[key] as Record<string, unknown>)
      : {}
    return { ...obj, [key]: nest(child, keys.slice(1)) }
  }
  return nest(state, parts)
}

function PendingElementPlaceholder() {
  return (
    <div className="w-full rounded-xl border border-dashed border-indigo-500/20 bg-indigo-500/[0.03] p-4">
      <div className="h-2.5 w-28 rounded bg-white/10 animate-pulse" />
      <div className="mt-3 h-16 rounded-lg bg-white/[0.04] animate-pulse" />
    </div>
  )
}

export function JsonRenderUI({ spec, loading, onAction }: Props) {
  const [state, setState] = useState<Record<string, unknown>>({})
  const stateRef = useRef(state)
  const rootId = spec
    ? spec.elements[spec.root]
      ? spec.root
      : Object.keys(spec.elements)[0]
    : undefined

  useEffect(() => {
    stateRef.current = state
  }, [state])

  // Init local state from spec.state once it carries data (happens near end of stream)
  const didInitState = useRef(false)
  useEffect(() => {
    if (!didInitState.current && spec?.state && Object.keys(spec.state).length > 0) {
      didInitState.current = true
      setState(spec.state)
    }
  }, [spec])

  if (!spec) {
    if (!loading) return null
    return (
      <div className="w-full rounded-xl border border-indigo-500/20 bg-indigo-500/[0.04] p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400 shrink-0" />
          <span className="text-sm text-muted-foreground">Building UI…</span>
        </div>
        <div className="space-y-2">
          <div className="h-2.5 rounded bg-white/5 animate-pulse" />
          <div className="h-2.5 rounded bg-white/5 animate-pulse w-4/5" />
          <div className="h-2.5 rounded bg-white/5 animate-pulse w-3/5" />
          <div className="mt-3 h-20 rounded-lg bg-white/[0.03] animate-pulse" />
        </div>
      </div>
    )
  }

  const rootElement = rootId ? spec.elements[rootId] : undefined
  const rootHasAvailableChildren = (rootElement?.children ?? []).some((childId) => spec.elements[childId])
  const shouldRenderProgressiveSiblings =
    loading &&
    rootId &&
    rootElement &&
    CHILD_CONTAINER_TYPES.has(rootElement.type) &&
    !rootHasAvailableChildren
  const progressiveSiblingIds = shouldRenderProgressiveSiblings
    ? Object.keys(spec.elements).filter((id) => id !== rootId)
    : []

  function renderElement(id: string): React.ReactNode {
    const element = spec!.elements[id]
    if (!element) return null

    // Skeleton leaf: declared in the tree (id + type) but no props yet —
    // fill_component hasn't run for this element. Show a placeholder while
    // we wait. Containers always render through the registry so their
    // children (which may already be filled) appear immediately.
    const isContainer = CHILD_CONTAINER_TYPES.has(element.type)
    const hasNoProps = Object.keys(element.props).length === 0
    const hasNoChildren = !element.children || element.children.length === 0
    if (loading && !isContainer && hasNoProps && hasNoChildren) {
      return <PendingElementPlaceholder />
    }

    // Visibility check
    if (element.visible) {
      const stateVal = getStatePath(state, element.visible.$state)
      if (stateVal !== element.visible.eq) return null
    }

    // Resolve props — strip $bindState, inject value + onChange
    const resolvedProps: Record<string, unknown> = {}
    const bindPath = element.props['$bindState'] as string | undefined

    for (const [k, v] of Object.entries(element.props)) {
      if (k !== '$bindState') resolvedProps[k] = v
    }

    if (bindPath) {
      resolvedProps['value'] = getStatePath(state, bindPath) ?? ''
      resolvedProps['onChange'] = (newValue: unknown) => {
        setState((prev) => {
          const next = setStatePath(prev, bindPath, newValue)
          stateRef.current = next
          return next
        })
      }
    }

    // Resolve on-event handlers
    if (element.on) {
      for (const [eventName, handler] of Object.entries(element.on)) {
        const propName = `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`
        resolvedProps[propName] = (data?: unknown) => {
          const extra = typeof data === 'string' ? { dataPoint: data } : {}
          onAction?.(handler.action, { ...(handler.params ?? {}), ...extra }, stateRef.current)
        }
      }
    }

    // Render children recursively
    const childNodes = (element.children ?? []).map((childId) => (
      <Fragment key={childId}>
        {spec!.elements[childId] ? renderElement(childId) : loading ? <PendingElementPlaceholder /> : null}
      </Fragment>
    ))

    const fn = REGISTRY[element.type]
    if (!fn) return null

    try {
      return fn(resolvedProps, <>{childNodes}</>)
    } catch {
      return null
    }
  }

  return (
    <div className="w-full space-y-3">
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
          Building UI…
        </div>
      )}
      {progressiveSiblingIds.length > 0
        ? progressiveSiblingIds.map((id) => (
            <Fragment key={id}>{renderElement(id)}</Fragment>
          ))
        : rootId
          ? renderElement(rootId)
          : null}
    </div>
  )
}
