"use client"

import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Reveal } from "./reveal"

export function CtaSection() {
  return (
    <section className="relative overflow-hidden border-b border-ink/8 py-24 sm:py-32">
      <div className="ember-glow pointer-events-none absolute left-1/2 top-1/2 h-[480px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" />

      <div className="relative mx-auto max-w-[1280px] px-6 lg:px-10">
        <Reveal>
          <div className="mx-auto max-w-4xl text-center">
            <h2
              className="font-display text-[clamp(2.5rem,8vw,7rem)] font-medium leading-[0.95] tracking-[-0.04em] text-ink"
              style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 60" }}
            >
              Begin your <span className="text-ember">forge.</span>
            </h2>

            <p className="mx-auto mt-8 max-w-xl text-pretty text-lg leading-relaxed text-ink/65">
              Your first deck takes about three minutes. By the time you have
              ten cards, you will have a study session that is unmistakably
              yours.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link href="/register">
                <Button
                  size="lg"
                  className="group h-14 sm:h-14 rounded-full bg-ink px-8 sm:px-8 text-[15px] text-paper shadow-[0_20px_50px_-15px_rgba(0,0,0,0.5)] transition-all hover:scale-[1.02] hover:bg-ink/90"
                >
                  Create a free account
                  <ArrowUpRight className="ml-1.5 h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Button>
              </Link>
              <Link href="/explore">
                <Button
                  size="lg"
                  variant="ghost"
                  className="h-14 sm:h-14 rounded-full px-6 sm:px-6 text-[15px] text-ink/75 hover:bg-ink/5 hover:text-ink"
                >
                  Browse the library first →
                </Button>
              </Link>
            </div>

            <p className="mt-8 font-mono-tag text-[10px] uppercase tracking-widest text-ink/45">
              No credit card · No ads · Open library
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
