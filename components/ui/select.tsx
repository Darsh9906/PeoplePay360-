import * as React from "react"
import { cn } from "@/lib/utils"

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

/**
 * The native arrow is replaced with a navy chevron so the control matches the
 * rest of the field set across browsers.
 *
 * Every background longhand lives here rather than split between classes and
 * inline style: Tailwind could not infer `bg-[right_0.75rem_center]` as a
 * background-position and dropped it, which left the chevron pinned to the
 * top-left corner.
 */
const chevronBackground: React.CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23607f9c' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 0.75rem center",
  backgroundSize: "1rem",
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, style, ...props }, ref) => {
    return (
      <select
        className={cn(
          "h-10 w-full appearance-none rounded-xl border border-zinc-200 bg-white py-1 pl-3.5 pr-9 text-sm text-zinc-900 transition-colors hover:border-zinc-300 focus:border-harbor-400 focus:outline-none focus:ring-2 focus:ring-harbor-400/25 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:opacity-60",
          className
        )}
        // Caller styles win, but the chevron survives a caller passing `style`.
        style={{ ...chevronBackground, ...style }}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    )
  }
)
Select.displayName = "Select"

export { Select }
