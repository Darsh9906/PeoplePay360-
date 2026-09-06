"use client"

/**
 * A single part-of-whole figure. The ring is the meter; the number in the
 * middle is the headline — no legend, because there is only one thing plotted.
 */
export default function RadialGauge({
  value,
  total,
  label,
  size = 148,
  formatValue = (input: number) => String(input),
}: {
  value: number
  total: number
  label: string
  size?: number
  formatValue?: (value: number) => string
}) {
  const ratio = total > 0 ? Math.min(Math.max(value / total, 0), 1) : 0
  const stroke = 12
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const percent = Math.round(ratio * 100)

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}: ${value} of ${total} (${percent}%)`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--seq-100)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--chart-1)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>

      <div className="absolute inset-0 grid place-content-center text-center">
        <strong className="font-display text-3xl font-semibold tracking-tight text-zinc-900">
          {formatValue(value)}
        </strong>
        <span className="mt-0.5 text-[11px] text-zinc-500">{label}</span>
      </div>
    </div>
  )
}
