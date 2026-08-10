"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  Check,
  Star,
  Trophy,
  X,
} from "lucide-react"
import { Button } from "@/components/garn/button"
import { Card, CardContent } from "@/components/garn/card"
import type { StudyCard } from "@/stores/study-store"

type GuestStudySummaryProps = {
  deckId: string
  deckTitle: string
  cardsReviewed: number
  cardsCorrect: number
  failedCardIds: string[]
  missedCards: StudyCard[]
  onRetry: () => void
  onStudyAnother: () => void
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

export function GuestStudySummary({
  deckId,
  deckTitle,
  cardsReviewed,
  cardsCorrect,
  failedCardIds,
  missedCards,
  onRetry,
  onStudyAnother,
}: GuestStudySummaryProps) {
  const isPerfect = failedCardIds.length === 0
  const accuracy =
    cardsReviewed === 0
      ? 0
      : Math.round((cardsCorrect / cardsReviewed) * 100)
  const registerHref = `/register?redirect_url=${encodeURIComponent(
    `/explore/decks/${deckId}/study`,
  )}`
  const loginHref = `/login?redirect_url=${encodeURIComponent(
    `/explore/decks/${deckId}/study`,
  )}`

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success-subtle sm:h-24 sm:w-24"
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--garn-success) / 0.25), transparent 70%)",
            filter: "blur(12px)",
          }}
        />
        {isPerfect ? (
          <Trophy
            className="relative h-8 w-8 text-success sm:h-10 sm:w-10"
            strokeWidth={1.75}
          />
        ) : (
          <Check
            className="relative h-8 w-8 text-success sm:h-10 sm:w-10"
            strokeWidth={2}
          />
        )}
      </motion.div>

      <h1 className="text-3xl font-semibold leading-[0.95] tracking-tight text-foreground sm:text-4xl sm:leading-[0.95] md:text-5xl">
        {isPerfect ? "Perfect run." : "Nice work."}
      </h1>
      <p className="mt-3 max-w-md text-pretty text-base text-foreground/65">
        {isPerfect
          ? `You answered every card in “${deckTitle}” on the first try. The forge burns bright.`
          : `You reviewed ${cardsReviewed} card${cardsReviewed === 1 ? "" : "s"} in “${deckTitle}”. ${accuracy}% accuracy — solid work.`}
      </p>

      <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/8 px-3.5 py-1.5 text-xs text-foreground/70">
        <span className="font-mono uppercase tracking-wider">
          Guest run · progress not saved
        </span>
      </div>

      <div className="mt-8 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5 text-left sm:text-center">
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <Check className="h-3 w-3 text-success" strokeWidth={2.5} />
              Accuracy
            </div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              <CountUp value={accuracy} suffix="%" />
            </div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {cardsCorrect}/{cardsReviewed}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-left sm:text-center">
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <Star className="h-3 w-3 text-warning" strokeWidth={2.25} />
              Reviewed
            </div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              <CountUp value={cardsReviewed} />
            </div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              card{cardsReviewed === 1 ? "" : "s"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-left sm:text-center">
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <X className="h-3 w-3 text-danger" strokeWidth={2.5} />
              Missed
            </div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              <CountUp value={failedCardIds.length} />
            </div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              card{failedCardIds.length === 1 ? "" : "s"}
            </div>
          </CardContent>
        </Card>
      </div>

      {!isPerfect && missedCards.length > 0 && (
        <section className="mt-8 w-full text-left">
          <header className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Cards to revisit
            </h2>
            <span className="font-mono text-[11px] uppercase tracking-widest text-danger">
              {missedCards.length} missed
            </span>
          </header>
          <ul className="grid gap-2 sm:grid-cols-2">
            {missedCards.map((card) => (
              <li
                key={card.id}
                className="rounded-2xl border border-danger/25 bg-danger/5 p-4"
              >
                <p
                  className="text-lg font-semibold leading-snug text-foreground"
                  style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 60" }}
                >
                  {card.front}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-medium leading-snug text-foreground/65">
                  <span aria-hidden className="text-foreground/35">→</span>
                  {card.back}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-10 w-full rounded-3xl border border-brand-solid/20 bg-brand-subtle p-6 text-left sm:p-8">
        <div className="font-mono text-[10px] uppercase tracking-widest text-brand-solid">
          Sign in to keep your progress
        </div>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Make this session count.
        </h2>
        <p className="mt-2 text-pretty text-sm text-foreground/65">
          Create a free account to save this run, build a streak, and fork
          “{deckTitle}” to make it your own.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link href={registerHref}>
            <Button size="lg" className="h-12 rounded-full px-6 text-[15px]">
              Create free account
            </Button>
          </Link>
          <Link href={loginHref}>
            <Button
              size="lg"
              variant="ghost"
              className="h-12 rounded-full px-5 text-[15px] text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
            >
              I already have one
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {!isPerfect && (
          <Button
            size="lg"
            variant="ghost"
            onClick={onRetry}
            className="h-12 rounded-full px-5 text-[15px] text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
          >
            Try the missed cards again
          </Button>
        )}
        <Button
          size="lg"
          variant="ghost"
          onClick={onStudyAnother}
          className="h-12 rounded-full px-5 text-[15px] text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
        >
          Study another deck
        </Button>
        <Link href={`/explore/decks/${deckId}`}>
          <Button
            size="lg"
            variant="ghost"
            className="h-12 rounded-full px-5 text-[15px] text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to deck
          </Button>
        </Link>
      </div>
    </div>
  )
}
