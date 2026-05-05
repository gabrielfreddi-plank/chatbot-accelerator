'use client'

const DEFAULT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444']

interface Bar {
  key: string
  label?: string
  color?: string
}

interface BarChartProps {
  title?: string
  data: Array<Record<string, string | number>>
  xKey: string
  bars: Bar[]
  onDrillDown?: (label: string) => void
}

function formatTick(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`
  return String(v)
}

function niceMax(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 10
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  return Math.ceil(raw / mag) * mag
}

function toNumber(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export function GeneratedBarChart({ title, data, xKey, bars, onDrillDown }: BarChartProps) {
  const PL = 44
  const PR = 12
  const PT = 12
  const PB = 28
  const W = 500
  const H = 200
  const cw = W - PL - PR
  const ch = H - PT - PB

  const values = data.flatMap((d) => bars.map((b) => toNumber(d[b.key])))
  const maxVal = values.length > 0 ? Math.max(...values) : 0
  const yMax = niceMax(maxVal)

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    label: formatTick(Math.round(yMax * t)),
    y: PT + ch * (1 - t),
  }))

  const groupW = data.length > 0 ? cw / data.length : cw
  const barCount = Math.max(bars.length, 1)
  const barW = Math.min(18, (groupW * 0.75) / barCount)

  return (
    <div className="w-full space-y-2">
      {title && (
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          {title}
        </p>
      )}
      <div className="rounded-xl border border-border/40 bg-background/40 p-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label={title}>
          {yTicks.map((t) => (
            <g key={t.label}>
              <line
                x1={PL}
                y1={t.y}
                x2={W - PR}
                y2={t.y}
                stroke="currentColor"
                strokeOpacity={0.08}
                strokeWidth={1}
              />
              <text
                x={PL - 4}
                y={t.y}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={8}
                fill="currentColor"
                opacity={0.4}
              >
                {t.label}
              </text>
            </g>
          ))}

          {data.map((d, gi) => {
            const cx = PL + gi * groupW + groupW / 2
            const totalBarW = barW * bars.length + 2 * (bars.length - 1)
            const label = String(d[xKey] || '')
            return (
              <g
                key={gi}
                onClick={() => onDrillDown?.(label)}
                style={{ cursor: onDrillDown ? 'pointer' : undefined }}
              >
                {bars.map((bar, bi) => {
                  const val = toNumber(d[bar.key])
                  const bh = yMax > 0 ? (val / yMax) * ch : 0
                  const x = cx - totalBarW / 2 + bi * (barW + 2)
                  const y = PT + ch - bh
                  const color = bar.color || DEFAULT_COLORS[bi % DEFAULT_COLORS.length]
                  return (
                    <rect
                      key={`${gi}-${bi}`}
                      x={x}
                      y={y}
                      width={barW}
                      height={Math.max(bh, 0)}
                      fill={color}
                      rx={2}
                      opacity={0.85}
                    />
                  )
                })}
              </g>
            )
          })}

          {data.map((d, gi) => {
            const x = PL + gi * groupW + groupW / 2
            const label = String(d[xKey] || '')
            return (
              <text
                key={gi}
                x={x}
                y={H - 8}
                textAnchor="middle"
                fontSize={8}
                fill="currentColor"
                opacity={0.45}
              >
                {label.length > 7 ? `${label.slice(0, 7)}…` : label}
              </text>
            )
          })}
        </svg>

        {bars.length > 1 && (
          <div className="flex flex-wrap gap-3 pl-11 -mt-1">
            {bars.map((bar, i) => (
              <div key={bar.key} className="flex items-center gap-1.5">
                <div
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: bar.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length] }}
                />
                <span className="text-[10px] text-muted-foreground/60">{bar.label || bar.key}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
