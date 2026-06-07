import Link from "next/link"
import { FlameMark } from "./flame-mark"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function Wordmark({
  className,
  flameClassName,
  textClassName,
  italic = true,
}: {
  className?: string
  flameClassName?: string
  textClassName?: string
  italic?: boolean
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <FlameMark className={flameClassName} withSparks={false} />
      <span
        className={cn(
          "font-display text-[1.05em] font-medium leading-none tracking-tight",
          textClassName,
        )}
      >
        Flash
        {italic ? (
          <span className="font-display-soft italic" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}>
            forge
          </span>
        ) : (
          "Forge"
        )}
      </span>
    </span>
  )
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-ink/8 bg-paper/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-8 px-6 lg:px-10">
        <Link
          href="/"
          className="group flex shrink-0 items-center text-ink transition-opacity hover:opacity-80"
        >
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            href="/explore"
            className="rounded-md px-3 py-1.5 text-sm text-ink/70 transition-colors hover:text-ink"
          >
            Explore
          </Link>
          <Link
            href="#process"
            className="rounded-md px-3 py-1.5 text-sm text-ink/70 transition-colors hover:text-ink"
          >
            How it works
          </Link>
          <Link
            href="#library"
            className="rounded-md px-3 py-1.5 text-sm text-ink/70 transition-colors hover:text-ink"
          >
            Library
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/login" className="hidden sm:block">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-3 text-ink/80 hover:text-ink"
            >
              Sign in
            </Button>
          </Link>
          <Link href="/register">
            <Button
              size="sm"
              className="h-9 rounded-full bg-ink px-4 text-paper hover:bg-ink/85"
            >
              Start forging
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
