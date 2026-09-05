/** Currency, date and label formatting shared across the UI. */

export function formatINR(amount: number | string | null | undefined): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount ?? 0))
}

/** Compact currency for chart axes and tick labels. */
export function compactINR(value: number): string {
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(1)}Cr`
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(1)}L`
  if (value >= 1_000) return `₹${(value / 1_000).toFixed(0)}K`
  return `₹${Math.round(value)}`
}

/** "2026-07" -> "Jul 26" */
export function monthLabel(month: string): string {
  const [year, monthPart] = month.split("-")
  return new Date(
    Date.UTC(Number(year), Number(monthPart) - 1, 1),
  ).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  })
}

export function formatStatus(status?: string | null): string {
  if (!status) return "—"
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}
