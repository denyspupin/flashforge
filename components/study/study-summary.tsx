"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  ArrowRight,
  Check,
  Flame,
  Star,
  Trophy,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"

type StudySummaryProps = {
  cardsReviewed: number
  cardsCorrect: number
  failedCardIds: string[]
  xpAwarded: number
  multiplier: number
  newStreak: number
  deckTitle: string
  onRetry: () => void
}

function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const duration = 900
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(value * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])

  return (
    <span>
      {display}
      {suffix}
    </span>
  )
}

export function StudySummary({
  cardsReviewed,
  cardsCorrect,
  failedCardIds,
  xpAwarded,
  multiplier,
  newStreak,
  deckTitle,
  onRetry,
}: StudySummaryProps) {
  const isPerfect = failedCardIds.length === 0
  const accuracy =
    cardsReviewed === 0
      ? 0
      : Math.round((cardsCorrect / cardsReviewed) * 100)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-ember/12 sm:h-24 sm:w-24"
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--ember) / 0.25), transparent 70%)",
            filter: "blur(12px)",
          }}
        />
        {isPerfect ? (
          <Trophy
            className="relative h-8 w-8 text-ember sm:h-10 sm:w-10"
            strokeWidth={1.75}
          />
        ) : (
          <Check
            className="relative h-8 w-8 text-ember sm:h-10 sm:w-10"
            strokeWidth={2}
          />
        )}
      </motion.div>

      <h1 className="font-display text-3xl font-medium leading-[0.95] tracking-tight text-ink sm:text-4xl sm:leading-[0.95] md:text-5xl">
        {isPerfect ? "Perfect run." : "Session complete."}
      </h1>
      <p className="mt-3 max-w-md text-pretty text-base text-ink/65">
        {isPerfect
          ? `You answered every card in “${deckTitle}” on the first try. The forge burns bright.`
          : `You reviewed ${cardsReviewed} card${cardsReviewed === 1 ? "" : "s"} in “${deckTitle}”. ${accuracy}% accuracy — solid work.`}
      </p>

      <div className="mt-10 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-ink/8 bg-paper p-5 text-left sm:text-center">
          <div className="flex items-center gap-1.5 font-mono-tag text-[10px] uppercase tracking-widest text-ink/45">
            <Star className="h-3 w-3 text-honey" strokeWidth={2.25} />
            XP earned
          </div>
          <div className="mt-2 font-display text-3xl font-medium text-ink">
            +<CountUp value={xpAwarded} />
          </div>
          {multiplier > 1 && (
            <div className="mt-1 font-mono-tag text-[10px] uppercase tracking-widest text-ember">
              {multiplier}× streak
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-ink/8 bg-paper p-5 text-left sm:text-center">
          <div className="flex items-center gap-1.5 font-mono-tag text-[10px] uppercase tracking-widest text-ink/45">
            <Flame
              className="h-3 w-3 text-ember"
              strokeWidth={2.25}
              fill="currentColor"
            />
            Streak
          </div>
          <div className="mt-2 font-display text-3xl font-medium text-ink">
            <CountUp value={newStreak} />
            <span className="ml-1 text-base font-normal text-ink/55">
              day{newStreak === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <div className="rounded-2xl border border-ink/8 bg-paper p-5 text-left sm:text-center">
          <div className="flex items-center gap-1.5 font-mono-tag text-[10px] uppercase tracking-widest text-ink/45">
            <Check className="h-3 w-3 text-forest" strokeWidth={2.5} />
            Accuracy
          </div>
          <div className="mt-2 font-display text-3xl font-medium text-ink">
            <CountUp value={accuracy} suffix="%" />
          </div>
          <div className="mt-1 font-mono-tag text-[10px] uppercase tracking-widest text-ink/45">
            {cardsCorrect}/{cardsReviewed}
          </div>
        </div>
      </div>

      {!isPerfect && failedCardIds.length > 0 && (
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-honey/30 bg-honey/8 px-3.5 py-1.5 text-xs text-ink/70">
          <X className="h-3 w-3 text-honey" strokeWidth={2.5} />
          <span className="font-mono-tag uppercase tracking-wider">
            {failedCardIds.length} card
            {failedCardIds.length === 1 ? "" : "s"} missed
          </span>
        </div>
      )}

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link href="/decks">
          <Button
            size="lg"
            className="h-12 rounded-full bg-ink px-6 text-[15px] text-paper hover:bg-ink/90"
          >
            Back to decks
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </Link>
        {!isPerfect && (
          <Button
            size="lg"
            variant="ghost"
            onClick={onRetry}
            className="h-12 rounded-full px-5 text-[15px] text-ink/75 hover:bg-ink/5 hover:text-ink"
          >
            Study again
          </Button>
        )}
        <Link href="/dashboard">
          <Button
            size="lg"
            variant="ghost"
            className="h-12 rounded-full px-5 text-[15px] text-ink/75 hover:bg-ink/5 hover:text-ink"
          >
            Dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}
