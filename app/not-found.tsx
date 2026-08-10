import Link from "next/link"

import { Button } from "@/components/garn/button"

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 py-24 text-center">
      <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/45">
        Error · 404
      </span>
      <h1 className="mt-6 text-[clamp(2.5rem,7vw,5rem)] font-semibold leading-[1.05] tracking-[-0.04em] text-foreground">
        Off the <span className="text-brand-solid">map.</span>
      </h1>
      <p className="mt-6 max-w-md text-pretty text-base leading-relaxed text-foreground/65">
        The page you are looking for has been moved, retired, or never existed.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link href="/">
          <Button size="lg" className="h-12 rounded-full px-6">
            Back to the workshop
          </Button>
        </Link>
        <Link href="/explore">
          <Button
            size="lg"
            variant="ghost"
            className="h-12 rounded-full px-6 text-foreground/75 hover:bg-foreground/5 hover:text-foreground"
          >
            Browse the library
          </Button>
        </Link>
      </div>
    </div>
  )
}