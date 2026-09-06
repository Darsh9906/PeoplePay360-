import type { LucideIcon } from "lucide-react"
import { TrendingDown, TrendingUp } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export type StatTone = "default" | "success" | "warning" | "danger"

const toneStyles: Record<StatTone, { chip: string; icon: string }> = {
  default: { chip: "bg-harbor-50 text-harbor-700", icon: "bg-harbor-50 text-harbor-700" },
  success: { chip: "bg-success-soft text-success", icon: "bg-success-soft text-success" },
  warning: { chip: "bg-warning-soft text-warning", icon: "bg-warning-soft text-warning" },
  danger: { chip: "bg-danger-soft text-danger", icon: "bg-danger-soft text-danger" },
}

/**
 * A headline figure with its supporting line. Not a chart — one number is
 * better read as a number, so the tile carries no plot.
 */
export default function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "default",
  delta,
  loading = false,
}: {
  label: string
  value: string | number
  detail?: string
  icon: LucideIcon
  tone?: StatTone
  /** Signed change vs. the previous period, already formatted (e.g. "+2.5%"). */
  delta?: { text: string; direction: "up" | "down" }
  loading?: boolean
}) {
  const styles = toneStyles[tone]
  const DeltaIcon = delta?.direction === "down" ? TrendingDown : TrendingUp

  return (
    <div className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-harbor-200 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
          {label}
        </span>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${styles.icon}`}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-baseline gap-2">
        {loading ? (
          <Skeleton className="h-8 w-20 rounded-md" />
        ) : (
          <p className="font-display text-[2rem] font-semibold leading-none tracking-tight text-zinc-900 tabular-nums">
            {value}
          </p>
        )}
        {delta && !loading && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              delta.direction === "down"
                ? "bg-danger-soft text-danger"
                : "bg-success-soft text-success"
            }`}
          >
            <DeltaIcon className="h-3 w-3" />
            {delta.text}
          </span>
        )}
      </div>

      {detail &&
        (loading ? (
          <Skeleton className="mt-3 h-3 w-28 rounded" />
        ) : (
          <p className="mt-2 truncate text-xs text-zinc-500">{detail}</p>
        ))}
    </div>
  )
}
