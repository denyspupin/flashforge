import { cn } from "@/lib/utils"

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex h-[18px] min-w-[20px] items-center justify-center rounded-md border border-ink/10 bg-paper px-1.5 font-mono text-[10px] font-medium text-ink/70 shadow-[inset_0_-1px_0_rgba(0,0,0,0.04),inset_0_0_0_1px_rgba(255,255,255,0.04)] dark:border-ink/15 dark:bg-ink/8 dark:text-ink/80 dark:shadow-[inset_0_-1px_0_rgba(0,0,0,0.3),inset_0_0_0_1px_rgba(255,255,255,0.04)]",
        className,
      )}
      {...props}
    />
  )
}

export { Kbd }
