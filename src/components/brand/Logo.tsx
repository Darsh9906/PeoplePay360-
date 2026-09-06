/**
 * The PeoplePay360 mark: a six-spoke burst whose spokes shorten clockwise —
 * one cycle, closing. Payroll is a circle you run every period.
 */
export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <g
        stroke="currentColor"
        strokeWidth="3.1"
        strokeLinecap="round"
        transform="translate(16 16)"
      >
        <line y1="-12.5" y2="-4.4" />
        <line y1="-12.5" y2="-4.4" transform="rotate(60)" />
        <line y1="-11.4" y2="-4.4" transform="rotate(120)" />
        <line y1="-10.2" y2="-4.4" transform="rotate(180)" />
        <line y1="-9" y2="-4.4" transform="rotate(240)" />
        <line y1="-7.6" y2="-4.4" transform="rotate(300)" />
      </g>
      <circle cx="16" cy="16" r="2.6" fill="currentColor" />
    </svg>
  )
}

export function Wordmark({
  className = "",
  markClassName = "h-7 w-7",
  textClassName = "text-[17px]",
}: {
  className?: string
  markClassName?: string
  textClassName?: string
}) {
  return (
    <span className={`flex items-center gap-2 text-harbor-800 ${className}`}>
      <LogoMark className={markClassName} />
      <span
        className={`font-display font-semibold tracking-[-0.03em] ${textClassName}`}
      >
        PeoplePay<span className="text-harbor-400">360</span>
      </span>
    </span>
  )
}
