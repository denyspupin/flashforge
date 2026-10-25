"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
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
import { selectCanComplete, selectResults, useStudyStore, type StudyCard } from "@/stores/study-store"
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
  initialDurationMs?: number
  returnHref?: string
}

async function postComplete(
  sessionId: string,
  results: { cardId: string; correct: boolean }[],
  durationMs: number
): Promise<{ data: CompleteResponse }> {
  const res = await fetch(`/api/v1/study/${sessionId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ results, durationMs }),
  })
  if (!res.ok) throw new Error("Failed to complete session")
  return res.json()
}

function EmptyState() {
  const {
    state,
    actions: { handleExit },
  } = useStudyContext()
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
        onClick={handleExit}
        className="mt-6 h-11 rounded-full bg-ink px-6 text-paper"
      >
        Go back
      </Button>
    </div>
  )
}

function CompletionRunner({
  onReady,
}: {
  onReady: (retry: () => void) => void
}) {
  const { state, actions, meta } = useStudyContext()
  const { setSummary, setPhase } = useStudySummary<CompleteResponse>()

  const mutation = useMutation({
    mutationFn: () =>
      postComplete(
        meta.sessionId,
        selectResults(useStudyStore.getState()),
        actions.getDurationMs()
      ),
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
    if (
      state.phase === "done" &&
      selectCanComplete(useStudyStore.getState(), meta.sessionId) &&
      !startedRef.current
    ) {
      startedRef.current = true
      setPhase("loading")
      mutation.mutate()
    }
  }, [state.phase, meta.sessionId, setPhase, mutation])

  useEffect(() => {
    onReady(() => {
      setPhase("loading")
      mutation.mutate()
    })
  }, [onReady, setPhase, mutation])

  return null
}

function SummaryView({ returnHref }: { returnHref: string }) {
  const router = useRouter()
  const { state } = useStudyContext()
  const { summary } = useStudySummary<CompleteResponse>()

  const handleRetry = useCallback(() => {
    router.replace(
      `/study?deckId=${state.deck.id}&from=${encodeURIComponent(returnHref)}`
    )
  }, [router, state.deck.id, returnHref])

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
      backHref={returnHref}
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

function SummaryError({ onRetry }: { onRetry: () => void }) {
  const {
    state,
    actions: { handleExit },
  } = useStudyContext()
  return (
    <div className="mx-auto flex max-w-md flex-col items-center text-center">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
        Couldn’t save your progress
      </h1>
      <p className="mt-2 text-ink/65">
        The session for “{state.deck.title}” couldn’t be completed. Your
        answers are safe — try again in a moment.
      </p>
      <div className="mt-6 flex gap-2">
        <Button
          variant="outline"
          onClick={handleExit}
          className="h-11 rounded-full"
        >
          Go back
        </Button>
        <Button
          onClick={onRetry}
          className="h-11 rounded-full bg-ink px-6 text-paper"
        >
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

function StudyRouter({ returnHref }: { returnHref: string }) {
  const { state } = useStudyContext()
  const { summary, phase: summaryPhase } = useStudySummary()
  const retryRef = useRef<() => void>(() => {})

  if (state.phase === "done") {
    if (summary && summaryPhase === "ready") {
      return (
        <SummaryStage>
          <SummaryView returnHref={returnHref} />
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
  initialDurationMs,
  returnHref = "/decks",
}: StudyPlayerProps) {
  const exitHref = returnHref

  if (cards.length === 0) {
    return (
      <StudyProvider
        sessionId={sessionId}
        deck={deck}
        cards={cards}
        initialStreak={initialStreak}
        initialDurationMs={initialDurationMs}
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
      initialDurationMs={initialDurationMs}
      exitHref={exitHref}
    >
      <StudySummaryProvider>
        <StudyRouter returnHref={returnHref} />
      </StudySummaryProvider>
    </StudyProvider>
  )
}
