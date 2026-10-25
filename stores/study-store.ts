import { create } from "zustand"

export type StudyPhase = "pass1" | "done"

export type StudyCard = {
  id: string
  deckId: string
  front: string
  back: string
}

type StudyState = {
  sessionId: string | null
  cards: StudyCard[]
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
  index: 0,
  phase: "pass1" as StudyPhase,
  flipped: false,
  results: {},
  startedAt: null,
}

const STORAGE_PREFIX = "study:v2:"

type PersistedState = {
  sessionId: string
  cards: StudyCard[]
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
    const value = JSON.parse(raw) as PersistedState
    if (value.sessionId !== sessionId) return null
    if (value.phase !== "pass1") return null
    return value
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
    index: state.index,
    phase: state.phase,
    flipped: state.flipped,
    results: state.results,
    startedAt: state.startedAt ?? Date.now(),
  })
}

function shuffled<T>(items: readonly T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]!
    arr[i] = arr[j]!
    arr[j] = tmp
  }
  return arr
}

export const useStudyStore = create<StudyState>((set, get) => {
  const apply = (partial: Partial<StudyState>) => {
    set(partial)
    persistCurrent(get)
  }

  return {
    ...initial,

    init: (sessionId, cards) => {
      if (get().sessionId === sessionId) return
      const saved = loadPersisted(sessionId)
      if (saved && saved.cards.length === cards.length) {
        const restoredResults: Record<string, boolean> = Object.fromEntries(
          saved.cards.map((c) => [c.id, saved.results[c.id] ?? false])
        )
        apply({
          sessionId,
          cards: saved.cards,
          index: Math.min(saved.index, Math.max(saved.cards.length - 1, 0)),
          phase: saved.phase,
          flipped: saved.flipped,
          results: restoredResults,
          startedAt: saved.startedAt,
        })
      } else {
        const deckCards = shuffled(cards)
        const freshResults: Record<string, boolean> = Object.fromEntries(
          deckCards.map((c) => [c.id, false])
        )
        apply({
          ...initial,
          sessionId,
          cards: deckCards,
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
      const current = state.cards[state.index]
      if (!current) return

      const nextResults = { ...state.results, [current.id]: correct }
      const isLast = state.index === state.cards.length - 1

      if (isLast) {
        apply({ results: nextResults, phase: "done", flipped: false })
      } else {
        apply({
          results: nextResults,
          index: state.index + 1,
          flipped: false,
        })
      }
    },
  }
})

export function selectCurrentCard(state: StudyState): StudyCard | null {
  if (state.phase === "done") return null
  return state.cards[state.index] ?? null
}

export function selectProgress(state: StudyState): {
  position: number
  total: number
} {
  if (state.phase === "done") {
    return { position: state.cards.length, total: state.cards.length }
  }
  return { position: state.index + 1, total: state.cards.length }
}

export function selectIsLast(state: StudyState): boolean {
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

export function selectCanComplete(state: StudyState, sessionId: string): boolean {
  return state.sessionId === sessionId && state.phase === "done"
}
