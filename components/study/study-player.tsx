"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, X } from "lucide-react"
import { useMutation } from "@tanstack/react-query"
import { useShallow } from "zustand/shallow"

import { useStudyStore, selectCurrentCard, selectProgress, selectResults, type StudyCard } from "@/stores/study-store"
import { CardFront, CardBack, FlipCard } from "@/components/card"
import { Button } from "@/components/ui/button"
import { StudyProgress } from "./study-progress"
import { StudyControls } from "./study-controls"
import { StudySummary } from "./study-summary"

type DeckInfo = {
  id: string
  title: string
  sourceLanguage: string
  targetLanguage: string
  sourceLanguageFlag?: string
  targetLanguageFlag?: string
}

type CompleteResponse = {
  session: { id: string; cardsReviewed: number; cardsCorrect: number; failedCardIds: string[] }
  xpAwarded: number
  multiplier: number
  newStreak: number
  totalXp: number
}

type StudyPlayerProps = {
  sessionId: string
  deck: DeckInfo
  cards: StudyCard[]
  initialStreak: number
}

async function postComplete(
  sessionId: string,
  results: { cardId: string; correct: boolean }[]
): Promise<{ data: CompleteResponse }> {
  const res = await fetch(`/api/v1/study/${sessionId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ results }),
  })
  if (!res.ok) throw new Error("Failed to complete session")
  return res.json()
}

async function postAbandon(sessionId: string): Promise<void> {
  await fetch(`/api/v1/study/${sessionId}/abandon`, { method: "POST" })
}

export function StudyPlayer({
  sessionId,
  deck,
  cards,
  initialStreak,
}: StudyPlayerProps) {
  const router = useRouter()
  const [summary, setSummary] = useState<CompleteResponse | null>(null)

  const init = useStudyStore((s) => s.init)
  const reset = useStudyStore((s) => s.reset)
  const flip = useStudyStore((s) => s.flip)
  const answer = useStudyStore((s) => s.answer)
  const phase = useStudyStore((s) => s.phase)
  const flipped = useStudyStore((s) => s.flipped)
  const index = useStudyStore((s) => s.index)
  const cardsInPass1 = useStudyStore((s) => s.cards.length)
  const retryCount = useStudyStore((s) => s.retryCards.length)
  const current = useStudyStore(selectCurrentCard)
  const { position, total } = useStudyStore(useShallow(selectProgress))

  useEffect(() => {
    init(sessionId, cards)
    return () => reset()
  }, [sessionId, cards, init, reset])

  const completeMutation = useMutation({
    mutationFn: () =>
      postComplete(sessionId, selectResults(useStudyStore.getState())),
    onSuccess: (res) => setSummary(res.data),
  })

  useEffect(() => {
    if (phase === "done" && !summary && !completeMutation.isPending) {
      completeMutation.mutate()
    }
  }, [phase, summary, completeMutation])

  const abandonMutation = useMutation({
    mutationFn: () => postAbandon(sessionId),
  })

  const handleExit = useCallback(() => {
    if (phase !== "done") {
      abandonMutation.mutate()
    }
    router.push(`/decks/${deck.id}`)
  }, [phase, abandonMutation, router, deck.id])

  const handleBack = useCallback(() => {
    if (phase !== "done") {
      abandonMutation.mutate()
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else {
      router.push(`/decks/${deck.id}`)
    }
  }, [phase, abandonMutation, router, deck.id])

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
    init(sessionId, cards)
    setSummary(null)
  }

  if (cards.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink">
          Nothing to study yet
        </h1>
        <p className="mt-2 text-ink/65">
          “{deck.title}” doesn’t have any cards. Add a few, then come back.
        </p>
        <Button
          onClick={() => router.push(`/decks/${deck.id}`)}
          className="mt-6 h-11 rounded-full bg-ink px-6 text-paper"
        >
          Back to deck
        </Button>
      </div>
    )
  }

  if (summary) {
    return (
      <StudySummary
        cardsReviewed={summary.session.cardsReviewed}
        cardsCorrect={summary.session.cardsCorrect}
        failedCardIds={summary.session.failedCardIds}
        xpAwarded={summary.xpAwarded}
        multiplier={summary.multiplier}
        newStreak={summary.newStreak}
        deckTitle={deck.title}
        onRetry={handleRetry}
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

      <StudyProgress
        phase={phase}
        position={position}
        total={total}
        streak={initialStreak}
      />

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
