"use client"

import { useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import {
  Study,
  StudyProvider,
  StudySummaryProvider,
  useStudyContext,
  useStudySummary,
  type StudyDeckInfo,
} from "@/components/study/study"
import { selectResults, useStudyStore, type StudyCard } from "@/stores/study-store"
import { StudySummary } from "./study-summary"

type CompleteResponse = {
  session: { id: string; cardsReviewed: number; cardsCorrect: number; failedCardIds: string[] }
  xpAwarded: number
  multiplier: number
  newStreak: number
  totalXp: number
}

type StudyPlayerProps = {
  sessionId: string
  deck: StudyDeckInfo
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

function EmptyState() {
  const router = useRouter()
  const { state } = useStudyContext()
  return (
    <div className="mx-auto flex max-w-md flex-col items-center text-center">
      <h1 className="font-display text-3xl font-medium tracking-tight text-ink">
        Nothing to study yet
      </h1>
      <p className="mt-2 text-ink/65">
        “{state.deck.title}” doesn&rsquo;t have any cards. Add a few, then come
        back.
      </p>
      <Button
        onClick={() => router.push(`/decks/${state.deck.id}`)}
        className="mt-6 h-11 rounded-full bg-ink px-6 text-paper"
      >
        Back to deck
      </Button>
    </div>
  )
}

function CompletionEffect() {
  const { state, meta } = useStudyContext()
  const { setSummary, setPhase } = useStudySummary<CompleteResponse>()

  const mutation = useMutation({
    mutationFn: () =>
      postComplete(meta.sessionId, selectResults(useStudyStore.getState())),
    onSuccess: (res) => {
      setSummary(res.data)
      setPhase("ready")
    },
  })

  useEffect(() => {
    if (state.phase === "done" && mutation.status === "idle") {
      setPhase("loading")
      mutation.mutate()
    }
  }, [state.phase, mutation, setPhase])

  return null
}

function SummaryView() {
  const router = useRouter()
  const { state, actions } = useStudyContext()
  const { summary, setSummary, setPhase } = useStudySummary<CompleteResponse>()

  const handleRetry = useCallback(() => {
    actions.reset()
    setSummary(null)
    setPhase("idle")
  }, [actions, setSummary, setPhase])

  if (!summary) return null

  return (
    <StudySummary
      cardsReviewed={summary.session.cardsReviewed}
      cardsCorrect={summary.session.cardsCorrect}
      failedCardIds={summary.session.failedCardIds}
      xpAwarded={summary.xpAwarded}
      multiplier={summary.multiplier}
      newStreak={summary.newStreak}
      deckTitle={state.deck.title}
      onRetry={handleRetry}
    />
  )
}

function StudyRouter() {
  const { state } = useStudyContext()
  const { phase: summaryPhase } = useStudySummary()

  if (!state.current) return null
  if (state.phase === "done" && summaryPhase === "ready") {
    return <SummaryView />
  }
  return (
    <>
      <CompletionEffect />
      <Study.Frame>
        <Study.Header />
        <Study.Progress withStreak />
        <Study.Card />
        <Study.Controls />
        <Study.Hint />
      </Study.Frame>
    </>
  )
}

export function StudyPlayer({
  sessionId,
  deck,
  cards,
  initialStreak,
}: StudyPlayerProps) {
  const exitHref = `/decks/${deck.id}`

  if (cards.length === 0) {
    return (
      <StudyProvider
        sessionId={sessionId}
        deck={deck}
        cards={cards}
        initialStreak={initialStreak}
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
      initialStreak={initialStreak}
      exitHref={exitHref}
    >
      <StudySummaryProvider>
        <StudyRouter />
      </StudySummaryProvider>
    </StudyProvider>
  )
}
