"use client"

import { useState } from "react"

export type TrendPoint = {
  label: string
  value: number
  meta?: string
}

const width = 720
const height = 220
const padding = { top: 16, right: 56, bottom: 28, left: 56 }

/** Rounds an axis maximum up to a clean tick value. */
function niceMax(value: number) {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  return Math.ceil(value / magnitude) * magnitude
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

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-xs text-zinc-500">
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

  const y = (value: number) =>
    padding.top + plotHeight - (value / max) * plotHeight

  const linePath = data
    .map((point, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(point.value)}`)
    .join(" ")

  const areaPath =
    data.length > 1
      ? `${linePath} L ${x(data.length - 1)} ${padding.top + plotHeight} L ${x(0)} ${
          padding.top + plotHeight
        } Z`
      : ""

  const ticks = [0, 0.5, 1].map((fraction) => fraction * max)
  const active = activeIndex === null ? null : data[activeIndex]
  const lastIndex = data.length - 1

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label="Net salary by payroll month"
        onMouseLeave={() => setActiveIndex(null)}
      >
        {/* Recessive gridlines */}
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="#e4e4e7"
              strokeWidth={1}
            />
            <text
              x={padding.left - 8}
              y={y(tick) + 3}
              textAnchor="end"
              className="fill-zinc-500 text-[10px] tabular-nums"
            >
              {formatTick(tick)}
            </text>
          </g>
        ))}

        {areaPath && <path d={areaPath} fill="#18181b" fillOpacity={0.1} />}

        <path
          d={linePath}
          fill="none"
          stroke="#18181b"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {data.map((point, index) => {
          const isActive = activeIndex === index
          const isLast = index === lastIndex

          return (
            <g key={point.label}>
              {isActive && (
                <line
                  x1={x(index)}
                  x2={x(index)}
                  y1={padding.top}
                  y2={padding.top + plotHeight}
                  stroke="#a1a1aa"
                  strokeWidth={1}
                />
              )}

              {/* Only the endpoint carries a permanent marker. */}
              {(isLast || isActive) && (
                <circle
                  cx={x(index)}
                  cy={y(point.value)}
                  r={4}
                  fill="#18181b"
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              )}

              <text
                x={x(index)}
                y={height - 8}
                textAnchor="middle"
                className="fill-zinc-500 text-[10px]"
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
          y={y(data[lastIndex].value) + 3}
          className="fill-zinc-900 text-[11px] font-semibold tabular-nums"
        >
          {formatTick(data[lastIndex].value)}
        </text>
      </svg>

      {active && (
        <div className="mt-1 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-[11px] text-zinc-600">
          <span className="font-semibold text-black">{active.label}</span> ·{" "}
          {formatValue(active.value)}
          {active.meta && <> · {active.meta}</>}
        </div>
      )}
    </div>
  )
}
