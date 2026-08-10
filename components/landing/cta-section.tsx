"use client"

import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { Button } from "@/components/garn/button"
import { Reveal } from "./reveal"

export function CtaSection() {
  return (
    <section className="relative overflow-hidden border-b border-border py-24 sm:py-32">
      <div className="relative mx-auto max-w-[1280px] px-6 lg:px-10">
        <Reveal>
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-[clamp(2.5rem,8vw,7rem)] font-semibold leading-[0.95] tracking-tight text-foreground">
              Begin your <span className="text-brand-solid">forge.</span>
            </h2>

            <p className="mx-auto mt-8 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
              Your first deck takes about three minutes. By the time you have
              ten cards, you will have a study session that is unmistakably
              yours.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link href="/register">
                <Button size="lg" className="group">
                  Create a free account
                  <ArrowUpRight className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Button>
              </Link>
              <Link href="/explore">
                <Button size="lg" variant="ghost">
                  Browse the library first →
                </Button>
              </Link>
            </div>

            <p className="mt-8 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              No credit card · No ads · Open library
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}