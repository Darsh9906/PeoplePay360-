"use client"

import { useId, useState } from "react"

export type TrendPoint = {
  label: string
  value: number
  meta?: string
}

const width = 720
const height = 240
const padding = { top: 18, right: 58, bottom: 30, left: 58 }

/** Rounds an axis maximum up to a clean tick value. */
function niceMax(value: number) {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  return Math.ceil(value / magnitude) * magnitude
}

/** Catmull-Rom → cubic Bézier, so the line eases without overshooting. */
function smoothPath(points: { x: number; y: number }[]) {
  if (points.length < 2) {
    return points.length === 1 ? `M ${points[0].x} ${points[0].y}` : ""
  }

  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2

    d += ` C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6}, ${
      p2.x - (p3.x - p1.x) / 6
    } ${p2.y - (p3.y - p1.y) / 6}, ${p2.x} ${p2.y}`
  }
  return d
}

/**
 * Net salary over time. One series, so the line carries the ink and the card
 * title names it — no legend box.
 */
export default function TrendChart({
  data,
  formatValue,
  formatTick,
  emptyMessage = "No payroll history for the selected filters",
}: {
  data: TrendPoint[]
  formatValue: (value: number) => string
  formatTick: (value: number) => string
  emptyMessage?: string
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const gradientId = useId()

  if (data.length === 0) {
    return (
      <div className="flex h-52 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-200 text-xs text-zinc-400">
        <span className="h-1.5 w-10 rounded-full bg-zinc-200" />
        {emptyMessage}
      </div>
    )
  }

  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom
  const max = niceMax(Math.max(...data.map((point) => point.value)))

  const x = (index: number) =>
    data.length === 1
      ? padding.left + plotWidth / 2
      : padding.left + (index / (data.length - 1)) * plotWidth

  const y = (value: number) => padding.top + plotHeight - (value / max) * plotHeight

  const points = data.map((point, index) => ({ x: x(index), y: y(point.value) }))
  const linePath = smoothPath(points)
  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1].x} ${padding.top + plotHeight} L ${
          points[0].x
        } ${padding.top + plotHeight} Z`
      : ""

  const ticks = [0, 0.5, 1].map((fraction) => fraction * max)
  const active = activeIndex === null ? null : data[activeIndex]
  const lastIndex = data.length - 1

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full overflow-visible"
        role="img"
        aria-label="Net salary by payroll month"
        onMouseLeave={() => setActiveIndex(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.24" />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Recessive gridlines */}
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--border)"
              strokeWidth={1}
              strokeDasharray={tick === 0 ? undefined : "3 5"}
            />
            <text
              x={padding.left - 10}
              y={y(tick) + 3.5}
              textAnchor="end"
              className="fill-zinc-400 text-[10px] tabular-nums"
            >
              {formatTick(tick)}
            </text>
          </g>
        ))}

        {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}

        <path
          d={linePath}
          fill="none"
          stroke="var(--chart-1)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {data.map((point, index) => {
          const isActive = activeIndex === index
          const isLast = index === lastIndex

          return (
            <g key={`${point.label}-${index}`}>
              {isActive && (
                <line
                  x1={x(index)}
                  x2={x(index)}
                  y1={padding.top}
                  y2={padding.top + plotHeight}
                  stroke="var(--chart-1)"
                  strokeOpacity={0.35}
                  strokeWidth={1}
                  strokeDasharray="3 4"
                />
              )}

              {/* Only the endpoint carries a permanent marker. */}
              {(isLast || isActive) && (
                <circle
                  cx={x(index)}
                  cy={y(point.value)}
                  r={isActive ? 5.5 : 4.5}
                  fill="var(--chart-1)"
                  stroke="var(--card)"
                  strokeWidth={2.5}
                />
              )}

              <text
                x={x(index)}
                y={height - 8}
                textAnchor="middle"
                className={
                  isActive
                    ? "fill-harbor-800 text-[10px] font-semibold"
                    : "fill-zinc-400 text-[10px]"
                }
              >
                {point.label}
              </text>

              {/* Hit target wider than the mark. */}
              <rect
                x={x(index) - plotWidth / Math.max(data.length * 2, 2) - 8}
                y={padding.top}
                width={plotWidth / Math.max(data.length, 1) + 16}
                height={plotHeight}
                fill="transparent"
                onMouseEnter={() => setActiveIndex(index)}
              />
            </g>
          )
        })}

        {/* Direct label on the endpoint only. */}
        <text
          x={x(lastIndex) + 10}
          y={y(data[lastIndex].value) + 3.5}
          className="fill-harbor-800 text-[11px] font-semibold tabular-nums"
        >
          {formatTick(data[lastIndex].value)}
        </text>
      </svg>

      {/* Tooltip rides the crosshair, pinned inside the plot so it never
          escapes the card. */}
      {active && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[11px] shadow-lift"
          style={{
            left: `clamp(4.5rem, ${(x(activeIndex!) / width) * 100}%, calc(100% - 4.5rem))`,
          }}
        >
          <p className="font-semibold text-zinc-900">{active.label}</p>
          <p className="mt-0.5 font-mono tabular-nums text-harbor-700">
            {formatValue(active.value)}
          </p>
          {active.meta && <p className="mt-0.5 text-zinc-500">{active.meta}</p>}
        </div>
      )}
    </div>
  )
}
