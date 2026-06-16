"use client"

import { useCallback, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Study,
  StudyProvider,
  StudySummaryProvider,
  useStudyContext,
  useStudySummary,
  type StudyDeckInfo,
} from "@/components/study/study"
import { useStudyStore, type StudyCard } from "@/stores/study-store"
import { GuestStudySummary } from "./guest-study-summary"

type GuestSummary = {
  cardsReviewed: number
  cardsCorrect: number
  failedCardIds: string[]
}

type GuestStudyPlayerProps = {
  deck: StudyDeckInfo
  cards: StudyCard[]
}

function EmptyState() {
  const router = useRouter()
  const { state } = useStudyContext()
  return (
    <div className="mx-auto flex max-w-md flex-col items-center text-center">
      <h1 className="font-display text-3xl font-medium tracking-tight text-ink">
        Nothing to study yet
      </h1>
      <p className="mt-2 text-ink/65">
        “{state.deck.title}” doesn&rsquo;t have any cards yet.
      </p>
      <Button
        onClick={() => router.push(`/explore/decks/${state.deck.id}`)}
        className="mt-6 h-11 rounded-full bg-ink px-6 text-paper"
      >
        Back to deck
      </Button>
    </div>
  )
}

function CompletionEffect() {
  const { state } = useStudyContext()
  const { setSummary, setPhase } = useStudySummary<GuestSummary>()

  useEffect(() => {
    if (state.phase !== "done") return
    const entries = Object.entries(useStudyStore.getState().results)
    const failedCardIds = entries
      .filter(([, correct]) => correct === false)
      .map(([id]) => id)
    const cardsCorrect = entries.filter(([, correct]) => correct).length
    setSummary({
      cardsReviewed: entries.length,
      cardsCorrect,
      failedCardIds,
    })
    setPhase("ready")
  }, [state.phase, setSummary, setPhase])

  return null
}

function SummaryView() {
  const router = useRouter()
  const { state, actions } = useStudyContext()
  const { summary, setSummary, setPhase } = useStudySummary<GuestSummary>()

  const handleRetry = useCallback(() => {
    actions.reset()
    setSummary(null)
    setPhase("idle")
  }, [actions, setSummary, setPhase])

  const handleStudyAnother = useCallback(() => {
    router.push("/explore")
  }, [router])

  if (!summary) return null

  return (
    <GuestStudySummary
      deckId={state.deck.id}
      deckTitle={state.deck.title}
      cardsReviewed={summary.cardsReviewed}
      cardsCorrect={summary.cardsCorrect}
      failedCardIds={summary.failedCardIds}
      onRetry={handleRetry}
      onStudyAnother={handleStudyAnother}
    />
  )
}

function SummaryLoading() {
  const { state } = useStudyContext()
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center gap-3 py-24 text-ink/60">
      <Loader2 className="h-6 w-6 animate-spin text-ember" aria-hidden />
      <p className="font-mono-tag text-[11px] uppercase tracking-widest">
        Wrapping up “{state.deck.title}”…
      </p>
    </div>
  )
}

function SummaryStage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100dvh-7rem)] items-center justify-center py-8">
      {children}
    </div>
  )
}

function StudyRouter() {
  const { state } = useStudyContext()
  const { phase: summaryPhase } = useStudySummary()

  if (state.phase === "done") {
    if (summaryPhase === "ready") {
      return (
        <SummaryStage>
          <SummaryView />
        </SummaryStage>
      )
    }
    return (
      <SummaryStage>
        <CompletionEffect />
        <SummaryLoading />
      </SummaryStage>
    )
  }

  if (!state.current) return null

  return (
    <Study.Frame>
      <Study.Header />
      <Study.Progress />
      <Study.Card />
      <Study.Controls />
      <Study.Hint />
    </Study.Frame>
  )
}

export function GuestStudyPlayer({ deck, cards }: GuestStudyPlayerProps) {
  const exitHref = `/explore/decks/${deck.id}`
  const sessionId = useMemo(() => deck.id, [deck.id])

  if (cards.length === 0) {
    return (
      <StudyProvider
        sessionId={sessionId}
        deck={deck}
        cards={cards}
        exitHref={exitHref}
      >
        <EmptyState />
      </StudyProvider>
    )
  }

  return (
    <StudyProvider
      sessionId={sessionId}
      deck={deck}
      cards={cards}
      exitHref={exitHref}
    >
      <StudySummaryProvider>
        <StudyRouter />
      </StudySummaryProvider>
    </StudyProvider>
  )
}
