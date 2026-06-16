import { CreditCard } from "lucide-react"
import { cn } from "@/lib/utils"

export function Wordmark({
  className,
  textClassName,
}: {
  className?: string
  textClassName?: string
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <CreditCard className="h-5 w-5 text-ember" strokeWidth={1.75} />
      <span
        className={cn(
          "font-display text-[1.05em] font-medium leading-none tracking-tight",
          textClassName,
        )}
      >
        Flash
        <span
          className="font-display-soft italic text-ember"
          style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
        >
          forge
        </span>
      </span>
    </span>
  )
}
