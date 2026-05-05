'use client'

import { cn } from '@/lib/utils'

interface Column {
  key: string
  label: string
  align?: 'left' | 'right' | 'center'
  prefix?: string
  suffix?: string
}

interface DataTableProps {
  title?: string
  columns: Column[]
  rows: Array<Record<string, string | number>>
}

export function GeneratedDataTable({ title, columns, rows }: DataTableProps) {
  return (
    <div className="w-full space-y-2">
      {title && (
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          {title}
        </p>
      )}
      <div className="rounded-xl border border-border/40 bg-background/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/30">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      'px-3 py-2 font-medium text-muted-foreground/60 uppercase tracking-wider text-[10px] whitespace-nowrap',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      (!col.align || col.align === 'left') && 'text-left',
                    )}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr
                  key={ri}
                  className="border-b border-border/20 last:border-0 hover:bg-white/[0.03] transition-colors"
                >
                  {columns.map((col) => {
                    const raw = row[col.key]
                    const display = raw !== undefined && raw !== null ? String(raw) : '—'
                    return (
                      <td
                        key={col.key}
                        className={cn(
                          'px-3 py-2 text-foreground/80 tabular-nums',
                          col.align === 'right' && 'text-right',
                          col.align === 'center' && 'text-center',
                          (!col.align || col.align === 'left') && 'text-left',
                        )}
                      >
                        {col.prefix}
                        {display}
                        {col.suffix}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
