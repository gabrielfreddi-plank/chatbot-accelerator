'use client'

const DEFAULT_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#14b8a6',
]

interface PieSlice {
  label: string
  value: number
  color?: string
}

interface PieChartProps {
  title?: string
  data: PieSlice[]
  donut?: boolean
  showLegend?: boolean
  onDrillDown?: (label: string) => void
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function slicePath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number,
  isDonut: boolean,
): string {
  const sweep = endAngle - startAngle
  if (sweep >= 359.9) {
    // Full circle — two arcs trick
    const t = polar(cx, cy, outerR, 0)
    const b = polar(cx, cy, outerR, 180)
    const outer = `M ${t.x} ${t.y} A ${outerR} ${outerR} 0 1 1 ${b.x} ${b.y} A ${outerR} ${outerR} 0 1 1 ${t.x} ${t.y} Z`
    if (!isDonut) return outer
    const it = polar(cx, cy, innerR, 0)
    const ib = polar(cx, cy, innerR, 180)
    return `${outer} M ${it.x} ${it.y} A ${innerR} ${innerR} 0 1 0 ${ib.x} ${ib.y} A ${innerR} ${innerR} 0 1 0 ${it.x} ${it.y} Z`
  }
  const large = sweep > 180 ? 1 : 0
  const os = polar(cx, cy, outerR, startAngle)
  const oe = polar(cx, cy, outerR, endAngle)
  if (!isDonut) {
    return `M ${cx} ${cy} L ${os.x} ${os.y} A ${outerR} ${outerR} 0 ${large} 1 ${oe.x} ${oe.y} Z`
  }
  const is_ = polar(cx, cy, innerR, startAngle)
  const ie = polar(cx, cy, innerR, endAngle)
  return `M ${os.x} ${os.y} A ${outerR} ${outerR} 0 ${large} 1 ${oe.x} ${oe.y} L ${ie.x} ${ie.y} A ${innerR} ${innerR} 0 ${large} 0 ${is_.x} ${is_.y} Z`
}

function toNonNegativeNumber(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

export function GeneratedPieChart({
  title,
  data,
  donut = true,
  showLegend = true,
  onDrillDown,
}: PieChartProps) {
  const W = 280
  const H = 220
  const cx = 120
  const cy = H / 2
  const outerR = 90
  const innerR = donut ? 54 : 0
  const GAP = 1.5

  const total = data.reduce((s, d) => s + toNonNegativeNumber(d.value), 0)
  if (total === 0) return null

  const slices = data.reduce<Array<PieSlice & { start: number; end: number }>>((acc, d, i) => {
    const previous = acc[acc.length - 1]
    const startBase = previous ? previous.end + GAP / 2 : 0
    const angle = (toNonNegativeNumber(d.value) / total) * (360 - GAP * data.length)
    const start = startBase + GAP / 2
    const end = start + angle
    return [...acc, { ...d, start, end, color: d.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length] }]
  }, [])

  const pct = (v: number) => ((v / total) * 100).toFixed(1)

  return (
    <div className="w-full space-y-2">
      {title && (
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          {title}
        </p>
      )}
      <div className="rounded-xl border border-border/40 bg-background/40 p-3">
        <div className="flex items-center gap-4 flex-wrap">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-56 shrink-0" aria-label={title}>
            {slices.map((s, i) => (
              <path
                key={i}
                d={slicePath(cx, cy, outerR, innerR, s.start, s.end, donut)}
                fill={s.color}
                opacity={0.88}
                onClick={() => onDrillDown?.(s.label)}
                style={{ cursor: onDrillDown ? 'pointer' : undefined }}
              />
            ))}
            {donut && (
              <text
                x={cx}
                y={cy - 6}
                textAnchor="middle"
                fontSize={10}
                fill="currentColor"
                opacity={0.4}
              >
                Total
              </text>
            )}
            {donut && (
              <text
                x={cx}
                y={cy + 10}
                textAnchor="middle"
                fontSize={15}
                fontWeight="600"
                fill="currentColor"
                opacity={0.8}
              >
                {total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total}
              </text>
            )}
          </svg>

          {showLegend && (
            <div className="flex flex-col gap-1.5 min-w-0 flex-1">
              {slices.map((s, i) => (
                <div key={i} className="flex items-center gap-2 min-w-0">
                  <div className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-[11px] text-foreground/70 truncate flex-1">{s.label}</span>
                  <span className="text-[11px] tabular-nums text-muted-foreground/50 shrink-0">
                    {pct(s.value)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
