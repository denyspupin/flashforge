"use client"

import { useCallback, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, X } from "lucide-react"
import { useShallow } from "zustand/shallow"

import {
  useStudyStore,
  selectCurrentCard,
  selectProgress,
  type StudyCard,
} from "@/stores/study-store"
import { CardFront, CardBack, FlipCard } from "@/components/card"
import { Button } from "@/components/ui/button"
import { StudyProgress } from "./study-progress"
import { StudyControls } from "./study-controls"
import { GuestStudySummary } from "./guest-study-summary"

type DeckInfo = {
  id: string
  title: string
  sourceLanguage: string
  targetLanguage: string
  sourceLanguageFlag?: string
  targetLanguageFlag?: string
}

type GuestStudyPlayerProps = {
  deck: DeckInfo
  cards: StudyCard[]
}

export function GuestStudyPlayer({ deck, cards }: GuestStudyPlayerProps) {
  const router = useRouter()

  const init = useStudyStore((s) => s.init)
  const reset = useStudyStore((s) => s.reset)
  const flip = useStudyStore((s) => s.flip)
  const answer = useStudyStore((s) => s.answer)
  const phase = useStudyStore((s) => s.phase)
  const flipped = useStudyStore((s) => s.flipped)
  const index = useStudyStore((s) => s.index)
  const results = useStudyStore((s) => s.results)
  const cardsInPass1 = useStudyStore((s) => s.cards.length)
  const retryCount = useStudyStore((s) => s.retryCards.length)
  const current = useStudyStore(selectCurrentCard)
  const { position, total } = useStudyStore(useShallow(selectProgress))

  useEffect(() => {
    init(deck.id, cards)
  }, [deck.id, cards, init])

  const summary = useMemo(() => {
    if (phase !== "done") return null
    const entries = Object.entries(results)
    const failedCardIds = entries
      .filter(([, correct]) => correct === false)
      .map(([id]) => id)
    const cardsCorrect = entries.filter(([, correct]) => correct).length
    return {
      cardsReviewed: entries.length,
      cardsCorrect,
      failedCardIds,
    }
  }, [phase, results])

  const handleExit = useCallback(() => {
    router.push(`/explore/decks/${deck.id}`)
  }, [router, deck.id])

  const handleBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else {
      router.push(`/explore/decks/${deck.id}`)
    }
  }, [router, deck.id])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (summary) return
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault()
        if (phase !== "done") flip()
      } else if (e.key === "1" || e.key.toLowerCase() === "f") {
        if (flipped) answer(false)
      } else if (e.key === "2" || e.key.toLowerCase() === "j") {
        if (flipped) answer(true)
      } else if (e.key === "Escape") {
        handleExit()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [flip, answer, flipped, phase, summary, handleExit])

  function handleRetry() {
    reset()
    init(deck.id, cards)
  }

  function handleStudyAnother() {
    router.push("/explore")
  }

  if (cards.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink">
          Nothing to study yet
        </h1>
        <p className="mt-2 text-ink/65">
          “{deck.title}” doesn’t have any cards yet.
        </p>
        <Button
          onClick={() => router.push(`/explore/decks/${deck.id}`)}
          className="mt-6 h-11 rounded-full bg-ink px-6 text-paper"
        >
          Back to deck
        </Button>
      </div>
    )
  }

  if (summary) {
    return (
      <GuestStudySummary
        deckId={deck.id}
        deckTitle={deck.title}
        cardsReviewed={summary.cardsReviewed}
        cardsCorrect={summary.cardsCorrect}
        failedCardIds={summary.failedCardIds}
        onRetry={handleRetry}
        onStudyAnother={handleStudyAnother}
      />
    )
  }

  if (!current) {
    return null
  }

  const isLast =
    phase === "retry"
      ? index === retryCount - 1
      : index === cardsInPass1 - 1

  const cardData = {
    front: current.front,
    back: current.back,
    source: deck.sourceLanguage,
    target: deck.targetLanguage,
    sourceFlag: deck.sourceLanguageFlag,
    targetFlag: deck.targetLanguageFlag,
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 sm:gap-8 lg:max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            aria-label="Go back"
            className="h-9 w-9 shrink-0 text-ink/60 hover:bg-ink/5 hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="truncate font-display text-base font-medium tracking-tight text-ink sm:text-lg">
            {deck.title}
          </h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExit}
          className="text-ink/60 hover:bg-ink/5 hover:text-ink"
        >
          <X className="mr-1.5 h-4 w-4" />
          <span className="hidden sm:inline">Exit</span>
        </Button>
      </div>

      <StudyProgress phase={phase} position={position} total={total} />

      <div className="relative">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${phase}-${current.id}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="perspective-1000 mx-auto aspect-[5/6] w-full max-w-[420px] sm:max-w-[480px] lg:max-w-[560px]"
          >
            <FlipCard
              flipped={flipped}
              onFlip={flip}
              front={<CardFront data={cardData} size="lg" />}
              back={<CardBack data={cardData} size="lg" />}
              className="h-full"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <StudyControls
        flipped={flipped}
        onFlip={flip}
        onAnswer={answer}
        isLast={isLast}
        phase={phase}
      />

      <div className="hidden items-center justify-center gap-3 font-mono-tag text-[10px] uppercase tracking-widest text-ink/40 sm:flex">
        <span>Space to flip</span>
        <span className="h-1 w-1 rounded-full bg-ink/20" />
        <span>1 fail · 2 pass</span>
      </div>
    </div>
  )
}
