import { create } from "zustand"

export type StudyPhase = "pass1" | "retry" | "done"

export type StudyCard = {
  id: string
  deckId: string
  front: string
  back: string
}

type StudyState = {
  sessionId: string | null
  cards: StudyCard[]
  retryCards: StudyCard[]
  index: number
  phase: StudyPhase
  flipped: boolean
  results: Record<string, boolean>
  startedAt: number | null

  init: (sessionId: string, cards: StudyCard[]) => void
  reset: () => void
  flip: () => void
  answer: (correct: boolean) => void
}

const initial = {
  sessionId: null,
  cards: [],
  retryCards: [],
  index: 0,
  phase: "pass1" as StudyPhase,
  flipped: false,
  results: {},
  startedAt: null,
}

export const useStudyStore = create<StudyState>((set, get) => ({
  ...initial,

  init: (sessionId, cards) =>
    set({
      ...initial,
      sessionId,
      cards,
      results: Object.fromEntries(cards.map((c) => [c.id, false])),
      startedAt: Date.now(),
    }),

  reset: () => set({ ...initial }),

  flip: () => set({ flipped: !get().flipped }),

  answer: (correct) => {
    const state = get()
    const activeQueue = state.phase === "retry" ? state.retryCards : state.cards
    const current = activeQueue[state.index]
    if (!current) return

    const nextResults = { ...state.results, [current.id]: correct }
    const isLast = state.index === activeQueue.length - 1

    if (state.phase === "pass1") {
      if (isLast) {
        const failedInPass1 = activeQueue.filter(
          (c) => nextResults[c.id] === false
        )
        if (failedInPass1.length === 0) {
          set({ results: nextResults, phase: "done", flipped: false })
        } else {
          set({
            results: nextResults,
            phase: "retry",
            retryCards: failedInPass1,
            index: 0,
            flipped: false,
          })
        }
      } else {
        set({
          results: nextResults,
          index: state.index + 1,
          flipped: false,
        })
      }
    } else {
      set({
        results: nextResults,
        phase: "done",
        flipped: false,
      })
    }
  },
}))

export function selectCurrentCard(state: StudyState): StudyCard | null {
  if (state.phase === "done") return null
  const queue = state.phase === "retry" ? state.retryCards : state.cards
  return queue[state.index] ?? null
}

export function selectProgress(state: StudyState): {
  position: number
  total: number
} {
  if (state.phase === "done") {
    return { position: state.cards.length, total: state.cards.length }
  }
  const queue = state.phase === "retry" ? state.retryCards : state.cards
  return { position: state.index + 1, total: queue.length }
}

export function selectResults(state: StudyState): {
  cardId: string
  correct: boolean
}[] {
  return Object.entries(state.results).map(([cardId, correct]) => ({
    cardId,
    correct,
  }))
}
