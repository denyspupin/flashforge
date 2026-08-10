"use client"

import { Layers, BookOpen, Trophy } from "lucide-react"
import { Reveal } from "./reveal"

const STEPS = [
  {
    n: "01",
    title: "Compose your deck",
    icon: Layers,
    body:
      "Pair any two languages. Add cards one at a time, paste a list, or fork a deck the community has already polished. Every deck is yours to shape.",
    chip: "Build",
  },
  {
    n: "02",
    title: "Study with focus",
    icon: BookOpen,
    body:
      "One card. No scroll. Flip, self-assess, and move on. Sessions save themselves — step away and return to exactly where you left off.",
    chip: "Practice",
  },
  {
    n: "03",
    title: "Stack the small wins",
    icon: Trophy,
    body:
      "XP for cards reviewed, multipliers for streaks that hold. A daily practice that asks for ten minutes, but rewards a lifetime of vocabulary.",
    chip: "Compound",
  },
] as const

export function ProcessSection() {
  return (
    <section
      id="process"
      className="relative border-b border-border py-24 sm:py-32"
    >
      <div className="relative z-10 mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr]">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <Reveal>
              <div className="font-mono text-[11px] font-medium uppercase tracking-[0.3em] text-brand-solid">
                — The process
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="mt-4 text-[clamp(2.4rem,5vw,4rem)] font-semibold leading-[0.95] tracking-tight text-foreground">
                Three quiet
                <br />
                rituals,
                <br />
                every day.
              </h2>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="mt-6 max-w-sm text-pretty text-muted-foreground">
                No streaks-as-shaming. No notifications begging. Just a small
                loop that rewards showing up.
              </p>
            </Reveal>
          </div>

          <div className="space-y-6">
            {STEPS.map((step, i) => {
              const Icon = step.icon
              return (
                <Reveal key={step.n} delay={0.1 + i * 0.08}>
                  <article className="group relative overflow-hidden rounded-2xl border border-border bg-card/60 p-8 transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/20 hover:bg-card hover:shadow-surface-raised sm:p-10">
                    <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
                      <div className="flex shrink-0 items-center gap-4 sm:flex-col sm:items-start sm:gap-2">
                        <span className="text-5xl font-semibold text-brand-solid">
                          {step.n}
                        </span>
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>

                      <div className="flex-1">
                        <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-secondary px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          {step.chip}
                        </div>
                        <h3 className="text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
                          {step.title}
                        </h3>
                        <p className="mt-4 max-w-md text-pretty leading-relaxed text-muted-foreground">
                          {step.body}
                        </p>
                      </div>
                    </div>
                  </article>
                </Reveal>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}