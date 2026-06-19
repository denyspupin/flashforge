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

const STORAGE_PREFIX = "study:v1:"

type PersistedState = {
  sessionId: string
  cards: StudyCard[]
  retryCards: StudyCard[]
  index: number
  phase: StudyPhase
  flipped: boolean
  results: Record<string, boolean>
  startedAt: number
}

function loadPersisted(sessionId: string): PersistedState | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + sessionId)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedState
    if (parsed.sessionId !== sessionId) return null
    return parsed
  } catch {
    return null
  }
}

function savePersisted(state: PersistedState) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(
      STORAGE_PREFIX + state.sessionId,
      JSON.stringify(state),
    )
  } catch {
    // ignore quota / disabled
  }
}

function clearPersisted(sessionId: string) {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(STORAGE_PREFIX + sessionId)
  } catch {
    // ignore
  }
}

function persistCurrent(get: () => StudyState) {
  const state = get()
  if (!state.sessionId) return
  if (state.phase === "done") {
    clearPersisted(state.sessionId)
    return
  }
  savePersisted({
    sessionId: state.sessionId,
    cards: state.cards,
    retryCards: state.retryCards,
    index: state.index,
    phase: state.phase,
    flipped: state.flipped,
    results: state.results,
    startedAt: state.startedAt ?? Date.now(),
  })
}

export const useStudyStore = create<StudyState>((set, get) => {
  const apply = (partial: Partial<StudyState>) => {
    set(partial)
    persistCurrent(get)
  }

  return {
    ...initial,

    init: (sessionId, cards) => {
      const saved = loadPersisted(sessionId)
      const freshResults: Record<string, boolean> = Object.fromEntries(
        cards.map((c) => [c.id, false]),
      )
      if (saved && saved.cards.length === cards.length) {
        const validRetry = saved.retryCards.filter((rc) =>
          cards.some((c) => c.id === rc.id),
        )
        apply({
          sessionId,
          cards,
          retryCards: validRetry,
          index: Math.min(saved.index, Math.max(cards.length - 1, 0)),
          phase: saved.phase,
          flipped: saved.flipped,
          results: { ...freshResults, ...saved.results },
          startedAt: saved.startedAt,
        })
      } else {
        apply({
          ...initial,
          sessionId,
          cards,
          results: freshResults,
          startedAt: Date.now(),
        })
      }
    },

    reset: () => {
      const sid = get().sessionId
      apply({ ...initial, sessionId: null })
      if (sid) clearPersisted(sid)
    },

    flip: () => apply({ flipped: !get().flipped }),

    answer: (correct) => {
      const state = get()
      const activeQueue =
        state.phase === "retry" ? state.retryCards : state.cards
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
            apply({ results: nextResults, phase: "done", flipped: false })
          } else {
            apply({
              results: nextResults,
              phase: "retry",
              retryCards: failedInPass1,
              index: 0,
              flipped: false,
            })
          }
        } else {
          apply({
            results: nextResults,
            index: state.index + 1,
            flipped: false,
          })
        }
      } else {
        apply({
          results: nextResults,
          phase: "done",
          flipped: false,
        })
      }
    },
  }
})

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

export function selectIsLast(state: StudyState): boolean {
  if (state.phase === "retry") {
    return state.retryCards.length > 0 && state.index === state.retryCards.length - 1
  }
  return state.cards.length > 0 && state.index === state.cards.length - 1
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
