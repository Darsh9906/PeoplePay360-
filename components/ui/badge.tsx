import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Soft status pills. Status hues (success / warning / danger) are reserved for
 * state and are never reused as decoration, so a green pill always means good.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold leading-5 transition-colors focus:outline-none focus:ring-2 focus:ring-harbor-400/40",
  {
    variants: {
      variant: {
        default: "border-transparent bg-harbor-800 text-white",
        secondary: "border-zinc-200 bg-zinc-100 text-zinc-700",
        destructive: "border-danger/20 bg-danger-soft text-danger",
        outline: "border-zinc-200 bg-white text-zinc-600",
        success: "border-success/20 bg-success-soft text-success",
        warning: "border-warning/20 bg-warning-soft text-warning",

        // Domain states
        active: "border-success/20 bg-success-soft text-success",
        inactive: "border-zinc-200 bg-zinc-100 text-zinc-500",
        running: "border-harbor-200 bg-harbor-50 text-harbor-700",
        expiring: "border-warning/20 bg-warning-soft text-warning",
        expired: "border-zinc-200 bg-zinc-100 text-zinc-400 line-through",
        draft: "border-dashed border-zinc-300 bg-white text-zinc-500",
        onleave: "border-harbor-200 bg-harbor-50 text-harbor-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
