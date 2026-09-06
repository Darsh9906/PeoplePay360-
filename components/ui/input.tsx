import * as React from "react"
import { cn } from "@/lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-1 text-sm text-zinc-900 transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-400 hover:border-zinc-300 focus-visible:border-harbor-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-harbor-400/25 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:opacity-60 aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-danger/15",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
