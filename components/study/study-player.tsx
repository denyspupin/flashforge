"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"

import { Button } from "@/components/garn/button"
import { Spinner } from "@/components/garn/spinner"
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
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        Nothing to study yet
      </h1>
      <p className="mt-2 text-foreground/65">
        “{state.deck.title}” doesn&rsquo;t have any cards. Add a few, then come
        back.
      </p>
      <Button
        onClick={() => router.push(`/decks/${state.deck.id}`)}
        className="mt-6 h-11 rounded-full px-6"
      >
        Back to deck
      </Button>
    </div>
  )
}

function CompletionRunner({
  onReady,
}: {
  onReady: (retry: () => void) => void
}) {
  const { state, meta } = useStudyContext()
  const { setSummary, setPhase } = useStudySummary<CompleteResponse>()

  const mutation = useMutation({
    mutationFn: () =>
      postComplete(meta.sessionId, selectResults(useStudyStore.getState())),
    onSuccess: (res) => {
      setSummary(res.data)
      setPhase("ready")
    },
    onError: () => {
      setPhase("error")
    },
  })

  const startedRef = useRef(false)

  useEffect(() => {
    if (state.phase === "done" && !startedRef.current) {
      startedRef.current = true
      setPhase("loading")
      mutation.mutate()
    }
  }, [state.phase, setPhase, mutation])

  useEffect(() => {
    onReady(() => {
      setPhase("loading")
      mutation.mutate()
    })
  }, [onReady, setPhase, mutation])

  return null
}

function SummaryView() {
  const router = useRouter()
  const { state } = useStudyContext()
  const { summary } = useStudySummary<CompleteResponse>()

  const handleRetry = useCallback(() => {
    router.replace(`/study?deckId=${state.deck.id}`)
  }, [router, state.deck.id])

  const missedCards = useMemo(() => {
    if (!summary) return []
    const failed = new Set(summary.session.failedCardIds)
    return state.cards.filter((c) => failed.has(c.id))
  }, [summary, state.cards])

  if (!summary) return null

  return (
    <StudySummary
      cardsReviewed={summary.session.cardsReviewed}
      cardsCorrect={summary.session.cardsCorrect}
      failedCardIds={summary.session.failedCardIds}
      missedCards={missedCards}
      xpAwarded={summary.xpAwarded}
      multiplier={summary.multiplier}
      newStreak={summary.newStreak}
      deckTitle={state.deck.title}
      onRetry={handleRetry}
    />
  )
}

function SummaryLoading() {
  const { state } = useStudyContext()
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
      <Spinner size="md" aria-hidden />
      <p className="font-mono text-[11px] uppercase tracking-widest">
        Wrapping up “{state.deck.title}”…
      </p>
    </div>
  )
}

function SummaryError({ onRetry }: { onRetry: () => void }) {
  const router = useRouter()
  const { state } = useStudyContext()
  return (
    <div className="mx-auto flex max-w-md flex-col items-center text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Couldn’t save your progress
      </h1>
      <p className="mt-2 text-foreground/65">
        The session for “{state.deck.title}” couldn’t be completed. Your
        answers are safe — try again in a moment.
      </p>
      <div className="mt-6 flex gap-2">
        <Button
          variant="outline"
          onClick={() => router.push(`/decks/${state.deck.id}`)}
          className="h-11 rounded-full"
        >
          Back to deck
        </Button>
        <Button onClick={onRetry} className="h-11 rounded-full px-6">
          Try again
        </Button>
      </div>
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
  const { summary, phase: summaryPhase } = useStudySummary()
  const retryRef = useRef<() => void>(() => {})

  if (state.phase === "done") {
    if (summary && summaryPhase === "ready") {
      return (
        <SummaryStage>
          <SummaryView />
        </SummaryStage>
      )
    }
    if (summaryPhase === "error") {
      return (
        <SummaryStage>
          <CompletionRunner onReady={(retry) => (retryRef.current = retry)} />
          <SummaryError onRetry={() => retryRef.current()} />
        </SummaryStage>
      )
    }
    return (
      <SummaryStage>
        <CompletionRunner onReady={(retry) => (retryRef.current = retry)} />
        <SummaryLoading />
      </SummaryStage>
    )
  }

  if (!state.current) return null

  return (
    <Study.Frame>
      <Study.Header />
      <Study.Progress withStreak />
      <Study.Card />
      <Study.Controls />
      <Study.Hint />
    </Study.Frame>
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
