"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowUpRight, Compass } from "lucide-react"
import { Button } from "@/components/garn/button"
import { Reveal } from "./reveal"
import { FlashcardPreview } from "./flashcard-preview"

export function HeroSection() {
  const reduce = useReducedMotion()

  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="relative z-10 mx-auto grid max-w-[1280px] gap-16 px-6 pb-24 pt-16 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:px-10 lg:pb-32 lg:pt-24">
        <div className="flex flex-col justify-center">
          <Reveal delay={0.05}>
            <h1 className="text-[clamp(3.2rem,8vw,7.2rem)] font-semibold leading-[0.92] tracking-tight text-foreground">
              Forge your
              <br />
              fluency,
              <br />
              one flash{" "}
              <span className="relative inline-block">
                <span className="relative z-10">at a time.</span>
                <span
                  className="absolute -bottom-1 left-0 right-0 h-[0.18em] origin-left rounded-full bg-brand-solid/70"
                  aria-hidden
                />
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="mt-8 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
              FlashForge is a quiet workshop for learning vocabulary — build
              decks your way, study them with focus, and watch a streak of
              small sessions compound into something remarkable.
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link href="/register">
                <Button size="lg" className="group">
                  Start your first deck
                  <ArrowUpRight className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Button>
              </Link>
              <Link href="/explore">
                <Button size="lg" variant="ghost">
                  <Compass className="text-brand-solid" />
                  Browse community decks
                </Button>
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.4}>
            <div className="mt-12 flex items-center gap-6 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5">
                  <div className="h-6 w-6 rounded-full border-2 border-background bg-brand-solid" />
                  <div className="h-6 w-6 rounded-full border-2 border-background bg-success-solid" />
                  <div className="h-6 w-6 rounded-full border-2 border-background bg-warning-solid" />
                </div>
                <span>2,400+ learners forging daily</span>
              </div>
              <span className="hidden h-3 w-px bg-border sm:block" />
              <span className="hidden sm:inline">No credit card · Free forever</span>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.25} className="flex items-center justify-center lg:justify-end">
          <FlashcardPreview />
        </Reveal>
      </div>

      <motion.div
        className="relative z-10 mx-auto h-px max-w-[1280px] origin-left bg-border px-6 lg:px-10"
        initial={{ scaleX: 0 }}
        animate={!reduce ? { scaleX: 1 } : { scaleX: 1 }}
        transition={{ duration: 1.2, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: "left" }}
      />
    </section>
  )
}