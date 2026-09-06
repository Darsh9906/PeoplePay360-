import { cn } from "@/lib/utils"

/**
 * A loading placeholder shaped like the content it stands in for. Hidden from
 * assistive tech — the region announces its own loading state instead.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn("skeleton rounded-lg", className)}
      {...props}
    />
  )
}

export { Skeleton }
