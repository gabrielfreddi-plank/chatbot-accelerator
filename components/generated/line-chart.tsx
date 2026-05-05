'use client'

const DEFAULT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444']

interface Line {
  key: string
  label?: string
  color?: string
}

interface LineChartProps {
  title?: string
  data: Array<Record<string, string | number>>
  xKey: string
  lines: Line[]
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

export function GeneratedLineChart({ title, data, xKey, lines }: LineChartProps) {
  const PL = 44
  const PR = 12
  const PT = 12
  const PB = 28
  const W = 500
  const H = 200
  const cw = W - PL - PR
  const ch = H - PT - PB

  const values = data.flatMap((d) => lines.map((l) => toNumber(d[l.key])))
  const maxVal = values.length > 0 ? Math.max(...values) : 0
  const yMax = niceMax(maxVal)

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    label: formatTick(Math.round(yMax * t)),
    y: PT + ch * (1 - t),
  }))

  function xPos(i: number) {
    return PL + (i / (data.length - 1 || 1)) * cw
  }

  function yPos(val: number) {
    return PT + ch - (yMax > 0 ? (val / yMax) * ch : 0)
  }

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

          {lines.map((line, li) => {
            const color = line.color || DEFAULT_COLORS[li % DEFAULT_COLORS.length]
            const points = data.map((d, i) => `${xPos(i)},${yPos(toNumber(d[line.key]))}`).join(' ')
            return (
              <g key={line.key}>
                <polyline
                  points={points}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity={0.9}
                />
                {data.map((d, i) => (
                  <circle
                    key={i}
                    cx={xPos(i)}
                    cy={yPos(toNumber(d[line.key]))}
                    r={3}
                    fill={color}
                    opacity={0.9}
                  />
                ))}
              </g>
            )
          })}

          {data.map((d, i) => {
            const label = String(d[xKey] || '')
            const step = Math.max(1, Math.ceil(data.length / 8))
            if (i % step !== 0 && i !== data.length - 1) return null
            return (
              <text
                key={i}
                x={xPos(i)}
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

        {lines.length > 1 && (
          <div className="flex flex-wrap gap-3 pl-11 -mt-1">
            {lines.map((line, i) => (
              <div key={line.key} className="flex items-center gap-1.5">
                <div
                  className="h-0.5 w-5 rounded-full"
                  style={{ backgroundColor: line.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length] }}
                />
                <span className="text-[10px] text-muted-foreground/60">{line.label || line.key}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
