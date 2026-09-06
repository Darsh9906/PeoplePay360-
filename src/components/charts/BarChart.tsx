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
      <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-200 text-xs text-zinc-400">
        <span className="h-1.5 w-10 rounded-full bg-zinc-200" />
        {emptyMessage}
      </div>
    )
  }

  const max = Math.max(...data.map((item) => item.value), 1)

  return (
    <div className="space-y-1">
      {data.map((item) => {
        const ratio = Math.max(item.value / max, 0)
        const isHovered = hovered === item.label

        return (
          <div
            key={item.label}
            className="grid grid-cols-[minmax(80px,132px)_1fr_auto] items-center gap-3 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-harbor-50/70"
            onMouseEnter={() => setHovered(item.label)}
            onMouseLeave={() => setHovered(null)}
            title={item.meta ? `${item.label} · ${item.meta}` : item.label}
          >
            <div className="truncate text-xs font-medium text-zinc-600">
              {item.label}
            </div>

            {/* Track recedes; the bar rounds only at its free end. */}
            <div className="relative h-2.5 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-2.5 rounded-full transition-[width,background-color] duration-500"
                style={{
                  width: `${Math.max(ratio * 100, item.value > 0 ? 2 : 0)}%`,
                  backgroundColor: isHovered ? "var(--seq-600)" : "var(--chart-1)",
                }}
              />
            </div>

            <span className="min-w-[4.5rem] text-right font-mono text-[11px] font-semibold tabular-nums text-zinc-800">
              {formatValue(item.value)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
