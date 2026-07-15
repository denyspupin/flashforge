"use client"

import { useEffect, useRef } from "react"
import { motion, useInView, useMotionValue, useReducedMotion, useTransform, animate } from "framer-motion"
import { Flame, Target, Trophy, Zap } from "lucide-react"
import { Reveal } from "./reveal"
import { cn } from "@/lib/utils"

const STREAKS = [
  { days: 1, label: "Just begun", mult: "×1", note: "Warm-up" },
  { days: 3, label: "Building", mult: "×1.5", note: "Gaining" },
  { days: 7, label: "Committed", mult: "×2", note: "Locked in" },
  { days: 14, label: "Devoted", mult: "×2.5", note: "On fire" },
  { days: 30, label: "Mastered", mult: "×3", note: "Forged" },
] as const

export function GamificationSection() {
  return (
    <section
      id="gamification"
      className="relative border-b border-ink/8 py-24 sm:py-32"
    >
      <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
        <div
          className="absolute -left-32 top-40 h-[380px] w-[380px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(var(--ember-deep) / 0.16), transparent 70%)" }}
        />
      </div>
      <div className="relative mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid gap-16 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <Reveal>
              <div className="font-mono-tag text-[11px] font-medium uppercase tracking-[0.3em] text-ember-deep">
                — The compounding
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <h2
                className="mt-4 font-display text-[clamp(2.2rem,4.5vw,3.8rem)] font-medium leading-[1] tracking-[-0.03em] text-ink"
                style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 60" }}
              >
                XP that
                <br />
                compounds,
                <br />
                streaks that
                <br />
                <span className="text-ember">reward patience.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="mt-6 max-w-md text-pretty text-ink/65">
                A day-one session earns what a day-one session should. A
                thirty-day streak earns three times that. The numbers reward
                the thing you actually want to build: a habit that sticks.
              </p>
            </Reveal>

            <Reveal delay={0.3}>
              <div className="mt-10 flex items-baseline gap-3">
                <span className="font-mono-tag text-[10px] uppercase tracking-wider text-ink/45">
                  Sample session
                </span>
                <span className="h-px flex-1 bg-ink/15" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <XPCounterCard
                  icon={Zap}
                  label="Cards reviewed"
                  base={5}
                  count={20}
                  suffix=" XP"
                />
                <XPCounterCard
                  icon={Target}
                  label="Cards correct"
                  base={10}
                  count={16}
                  suffix=" XP"
                />
                <XPCounterCard
                  icon={Flame}
                  label="Streak bonus"
                  base={50}
                  count={30}
                  suffix=" XP"
                  highlight
                />
                <XPCounterCard
                  icon={Trophy}
                  label="Deck complete"
                  base={50}
                  count={1}
                  suffix=" XP"
                />
              </div>
            </Reveal>
          </div>

          <div>
            <Reveal>
              <div className="mb-6 flex items-baseline gap-3">
                <span className="font-mono-tag text-[10px] uppercase tracking-wider text-ink/45">
                  Streak multipliers
                </span>
                <span className="h-px flex-1 bg-ink/15" />
              </div>
            </Reveal>

            <div className="space-y-2">
              {STREAKS.map((s, i) => (
                <Reveal key={s.days} delay={0.1 + i * 0.06}>
                  <StreakRow
                    days={s.days}
                    label={s.label}
                    mult={s.mult}
                    note={s.note}
                    isLast={i === STREAKS.length - 1}
                  />
                </Reveal>
              ))}
            </div>

            <Reveal delay={0.5}>
              <div className="mt-8 rounded-2xl border border-ink/10 bg-paper/70 p-6 sm:p-8">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ember-deep/15">
                    <Flame className="h-5 w-5 text-ember-deep" />
                  </div>
                  <div>
                    <h4
                      className="font-display text-lg font-medium leading-snug tracking-tight text-ink"
                      style={{ fontVariationSettings: "'opsz' 60, 'SOFT' 40" }}
                    >
                      A streak is a sentence — not a chain.
                    </h4>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink/65">
                      One card keeps it alive. There is no penalty for missing
                      a day; there is only a quiet loss of the multiplier. The
                      fire returns the moment you do.
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}

function XPCounterCard({
  icon: Icon,
  label,
  base,
  count,
  suffix,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  base: number
  count: number
  suffix: string
  highlight?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: "-80px" })
  const countMotion = useMotionValue(0)
  const display = useTransform(countMotion, (latest) =>
    Math.round(latest).toLocaleString(),
  )
  const reduce = useReducedMotion()
  const target = base * count

  useEffect(() => {
    if (reduce) {
      countMotion.set(target)
      return
    }
    if (!inView) return

    const controls = animate(countMotion, target, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
    })
    return () => controls.stop()
  }, [inView, target, reduce, countMotion])

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-3 rounded-xl border p-3.5",
        highlight
          ? "border-ember/30 bg-gradient-to-br from-ember/15 to-honey/10"
          : "border-ink/10 bg-paper/70",
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          highlight ? "bg-ember/20" : "bg-ink/5",
        )}
      >
        <Icon className={cn("h-4 w-4", highlight ? "text-ember" : "text-ink/65")} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] uppercase tracking-wider text-ink/55">
          {label}
        </p>
        <p
          className={cn(
            "font-display text-lg font-medium leading-tight tracking-tight",
            highlight ? "text-ember" : "text-ink",
          )}
        >
          <motion.span>{display}</motion.span>
          <span className="ml-0.5 text-xs font-normal text-ink/55">
            {suffix}
          </span>
        </p>
      </div>
    </div>
  )
}

function StreakRow({
  days,
  label,
  mult,
  note,
  isLast,
}: {
  days: number
  label: string
  mult: string
  note: string
  isLast: boolean
}) {
  return (
    <div className="group relative flex items-center gap-4 rounded-xl border border-transparent px-4 py-3.5 transition-all hover:border-ink/10 hover:bg-paper/60">
      {!isLast && (
        <div className="absolute left-[2.4rem] top-full h-2 w-px bg-ink/10" />
      )}

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink/12 bg-paper font-mono-tag text-[10px] text-ink/55 transition-colors group-hover:border-ember/30 group-hover:text-ember">
        {days}d
      </div>

      <div className="flex-1">
        <div className="flex items-baseline gap-2">
          <h4
            className="font-display text-lg font-medium leading-tight tracking-tight text-ink"
            style={{ fontVariationSettings: "'opsz' 60, 'SOFT' 40" }}
          >
            {label}
          </h4>
          <span className="font-mono-tag text-[10px] uppercase tracking-wider text-ink/45">
            {note}
          </span>
        </div>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span
          className="font-display-soft text-2xl text-ember-deep"
          style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
        >
          {mult}
        </span>
        <span className="font-mono-tag text-[10px] uppercase tracking-wider text-ink/45">
          mult
        </span>
      </div>

      <StreakBar days={days} />
    </div>
  )
}

function StreakBar({ days }: { days: number }) {
  const max = 30
  const width = Math.min(100, (days / max) * 100)
  const reduce = useReducedMotion()
  return (
    <div className="relative ml-2 hidden h-1 w-16 overflow-hidden rounded-full bg-ink/8 sm:block">
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: `${width}%` }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="h-full rounded-full bg-gradient-to-r from-honey via-ember to-ember-deep"
      />
    </div>
  )
}
