import { cn } from "@/lib/utils"

export function FlameMark({
  className,
  withSparks = true,
}: {
  className?: string
  withSparks?: boolean
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-6 w-6", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="flame-grad" x1="16" y1="4" x2="16" y2="28">
          <stop offset="0%" stopColor="hsl(var(--honey))" />
          <stop offset="55%" stopColor="hsl(var(--ember))" />
          <stop offset="100%" stopColor="hsl(var(--ember-deep))" />
        </linearGradient>
        <linearGradient id="flame-inner" x1="16" y1="10" x2="16" y2="24">
          <stop offset="0%" stopColor="hsl(var(--honey))" stopOpacity="0.9" />
          <stop offset="100%" stopColor="hsl(var(--ember))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M16 2.5c-1.2 3.4-3.6 5-3.6 8.4 0 1.4.5 2.5 1.2 3.3-.9-.4-1.7-1.2-2.4-2.4-.9 1.6-1.7 3.4-1.7 5.7 0 5.8 4.3 9.5 6.5 9.5s6.5-3.7 6.5-9.5c0-4-2.1-7-3.5-9.4-1-1.7-1.7-3.4-3-5.6Z"
        fill="url(#flame-grad)"
      />
      <path
        d="M16 11c-.5 1.6-1.6 2.4-1.6 4 0 2.1 1.6 3.5 1.6 5.5 0-2 1.6-3.4 1.6-5.5 0-1.6-1.1-2.4-1.6-4Z"
        fill="url(#flame-inner)"
      />
      {withSparks && (
        <>
          <circle cx="26" cy="9" r="0.8" fill="hsl(var(--ember))" />
          <circle cx="6" cy="14" r="0.6" fill="hsl(var(--honey))" />
          <circle cx="25" cy="20" r="0.5" fill="hsl(var(--ember-deep))" />
        </>
      )}
    </svg>
  )
}
