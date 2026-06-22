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
      className="relative border-b border-ink/8 py-24 sm:py-32"
    >
      <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
        <div
          className="absolute -right-32 top-40 h-[340px] w-[340px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(var(--rust) / 0.14), transparent 70%)" }}
        />
      </div>
      <div className="relative z-10 mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr]">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <Reveal>
              <div className="font-mono-tag text-[11px] font-medium uppercase tracking-[0.3em] text-rust">
                — The process
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <h2
                className="mt-4 font-display text-[clamp(2.4rem,5vw,4rem)] font-medium leading-[0.95] tracking-[-0.03em] text-ink"
                style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 60" }}
              >
                Three quiet
                <br />
                rituals,
                <br />
                every day.
              </h2>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="mt-6 max-w-sm text-pretty text-ink/65">
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
                  <article className="group relative overflow-hidden rounded-2xl border border-ink/10 bg-paper/60 p-8 transition-all duration-300 hover:-translate-y-0.5 hover:border-ink/20 hover:bg-paper hover:shadow-[0_20px_40px_-20px_rgba(0,0,0,0.15)] sm:p-10">
                    <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
                      <div className="flex shrink-0 items-center gap-4 sm:flex-col sm:items-start sm:gap-2">
                        <span
                          className="font-display-soft text-5xl text-rust/80"
                          style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
                        >
                          {step.n}
                        </span>
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 bg-paper">
                          <Icon className="h-4 w-4 text-ink/70" />
                        </div>
                      </div>

                      <div className="flex-1">
                        <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-ink/5 px-2.5 py-0.5 font-mono-tag text-[10px] uppercase tracking-wider text-ink/55">
                          {step.chip}
                        </div>
                        <h3
                          className="font-display text-3xl font-medium leading-tight tracking-tight text-ink sm:text-4xl"
                          style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 50" }}
                        >
                          {step.title}
                        </h3>
                        <p className="mt-4 max-w-md text-pretty leading-relaxed text-ink/65">
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
