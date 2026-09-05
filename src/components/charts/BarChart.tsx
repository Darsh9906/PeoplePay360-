"use client"

import { useState } from "react"

export type BarDatum = {
  label: string
  value: number
  /** Optional secondary figure shown in the tooltip (e.g. headcount). */
  meta?: string
}

/**
 * Horizontal magnitude comparison. Single series, so the surface carries one
 * ink colour and no legend — the card title names what is plotted.
 */
export default function BarChart({
  data,
  formatValue,
  emptyMessage = "No data for the selected filters",
}: {
  data: BarDatum[]
  formatValue: (value: number) => string
  emptyMessage?: string
}) {
  const [hovered, setHovered] = useState<string | null>(null)

  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-xs text-zinc-500">
        {emptyMessage}
      </div>
    )
  }

  const max = Math.max(...data.map((item) => item.value), 1)

  return (
    <div className="space-y-2.5">
      {data.map((item) => {
        const ratio = Math.max(item.value / max, 0)
        // Keep short bars from swallowing their own label.
        const labelInside = ratio > 0.55
        const isHovered = hovered === item.label

        return (
          <div
            key={item.label}
            className="grid grid-cols-[minmax(72px,120px)_1fr] items-center gap-3"
            onMouseEnter={() => setHovered(item.label)}
            onMouseLeave={() => setHovered(null)}
          >
            <div
              className="truncate text-xs font-medium text-zinc-600"
              title={item.label}
            >
              {item.label}
            </div>

            <div className="relative flex h-5 items-center">
              {/* Recessive track */}
              <div className="absolute inset-0 rounded-r-[4px] bg-zinc-100" />
              <div
                className={`relative h-5 rounded-r-[4px] transition-colors ${
                  isHovered ? "bg-black" : "bg-zinc-900"
                }`}
                style={{ width: `${Math.max(ratio * 100, item.value > 0 ? 2 : 0)}%` }}
              />
              <span
                className={`pointer-events-none absolute text-[11px] font-semibold tabular-nums ${
                  labelInside
                    ? "right-2 text-white"
                    : "left-[calc(var(--bar,0%)+8px)] text-zinc-700"
                }`}
                style={
                  labelInside
                    ? undefined
                    : ({ "--bar": `${ratio * 100}%` } as React.CSSProperties)
                }
              >
                {formatValue(item.value)}
              </span>
            </div>
          </div>
        )
      })}

      {hovered && (
        <div className="mt-1 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-[11px] text-zinc-600">
          <span className="font-semibold text-black">{hovered}</span>
          {data.find((item) => item.label === hovered)?.meta && (
            <> · {data.find((item) => item.label === hovered)?.meta}</>
          )}
        </div>
      )}
    </div>
  )
}
