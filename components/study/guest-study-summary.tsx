"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  Check,
  Sparkles,
  Star,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"

type GuestStudySummaryProps = {
  deckId: string
  deckTitle: string
  cardsReviewed: number
  cardsCorrect: number
  failedCardIds: string[]
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
          <Sparkles
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
        {isPerfect ? "Perfect run." : "Nice work."}
      </h1>
      <p className="mt-3 max-w-md text-pretty text-base text-ink/65">
        {isPerfect
          ? `You answered every card in “${deckTitle}” on the first try. The forge burns bright.`
          : `You reviewed ${cardsReviewed} card${cardsReviewed === 1 ? "" : "s"} in “${deckTitle}”. ${accuracy}% accuracy — solid work.`}
      </p>

      <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-honey/30 bg-honey/8 px-3.5 py-1.5 text-xs text-ink/70">
        <span className="font-mono-tag uppercase tracking-wider">
          Guest run · progress not saved
        </span>
      </div>

      <div className="mt-8 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
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
        <div className="rounded-2xl border border-ink/8 bg-paper p-5 text-left sm:text-center">
          <div className="flex items-center gap-1.5 font-mono-tag text-[10px] uppercase tracking-widest text-ink/45">
            <Star className="h-3 w-3 text-honey" strokeWidth={2.25} />
            Reviewed
          </div>
          <div className="mt-2 font-display text-3xl font-medium text-ink">
            <CountUp value={cardsReviewed} />
          </div>
          <div className="mt-1 font-mono-tag text-[10px] uppercase tracking-widest text-ink/45">
            card{cardsReviewed === 1 ? "" : "s"}
          </div>
        </div>
        <div className="rounded-2xl border border-ink/8 bg-paper p-5 text-left sm:text-center">
          <div className="flex items-center gap-1.5 font-mono-tag text-[10px] uppercase tracking-widest text-ink/45">
            <X className="h-3 w-3 text-destruct" strokeWidth={2.5} />
            Missed
          </div>
          <div className="mt-2 font-display text-3xl font-medium text-ink">
            <CountUp value={failedCardIds.length} />
          </div>
          <div className="mt-1 font-mono-tag text-[10px] uppercase tracking-widest text-ink/45">
            card{failedCardIds.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <div className="mt-10 w-full rounded-3xl border border-ember/20 bg-ember/5 p-6 text-left sm:p-8">
        <div className="font-mono-tag text-[10px] uppercase tracking-widest text-ember">
          Sign in to keep your progress
        </div>
        <h2 className="mt-2 font-display text-xl font-medium tracking-tight text-ink sm:text-2xl">
          Make this session count.
        </h2>
        <p className="mt-2 text-pretty text-sm text-ink/65">
          Create a free account to save this run, build a streak, and fork
          “{deckTitle}” to make it your own.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link href={registerHref}>
            <Button
              size="lg"
              className="h-12 rounded-full bg-ink px-6 text-[15px] text-paper hover:bg-ink/90"
            >
              Create free account
            </Button>
          </Link>
          <Link href={loginHref}>
            <Button
              size="lg"
              variant="ghost"
              className="h-12 rounded-full px-5 text-[15px] text-ink/75 hover:bg-ink/5 hover:text-ink"
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
            className="h-12 rounded-full px-5 text-[15px] text-ink/75 hover:bg-ink/5 hover:text-ink"
          >
            Try the missed cards again
          </Button>
        )}
        <Button
          size="lg"
          variant="ghost"
          onClick={onStudyAnother}
          className="h-12 rounded-full px-5 text-[15px] text-ink/75 hover:bg-ink/5 hover:text-ink"
        >
          Study another deck
        </Button>
        <Link href={`/explore/decks/${deckId}`}>
          <Button
            size="lg"
            variant="ghost"
            className="h-12 rounded-full px-5 text-[15px] text-ink/75 hover:bg-ink/5 hover:text-ink"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to deck
          </Button>
        </Link>
      </div>
    </div>
  )
}
