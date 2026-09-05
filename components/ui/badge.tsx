import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-black bg-black text-white hover:bg-zinc-800",
        secondary:
          "border-zinc-300 bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
        destructive:
          "border-black bg-black text-white",
        outline:
          "border-zinc-300 bg-white text-zinc-900",
        active:
          "border-black bg-black text-white font-semibold",
        inactive:
          "border-zinc-300 bg-zinc-100 text-zinc-600",
        running:
          "border-black bg-black text-white font-semibold",
        expiring:
          "border-zinc-400 bg-zinc-200 text-zinc-900 font-medium",
        expired:
          "border-zinc-300 bg-zinc-100 text-zinc-500 line-through",
        draft:
          "border-dashed border-zinc-400 bg-white text-zinc-700",
        onleave:
          "border-zinc-400 bg-zinc-100 text-zinc-800",
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
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
