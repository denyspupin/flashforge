import { beforeEach, describe, expect, test } from "vitest"
import {
  selectCurrentCard,
  selectProgress,
  selectResults,
  useStudyStore,
  type StudyCard,
} from "@/stores/study-store"

const STORAGE_KEY_PREFIX = "study:v1:"

function makeCard(id: string): StudyCard {
  return { id, deckId: "deck-1", front: `front ${id}`, back: `back ${id}` }
}

function makeCards(n: number): StudyCard[] {
  return Array.from({ length: n }, (_, i) => makeCard(`c${i + 1}`))
}

function freshStore() {
  useStudyStore.getState().reset()
  return useStudyStore
}

type Storage = Map<string, string>

function attachStorage(initial: Record<string, string> = {}): Storage {
  const store = new Map<string, string>(Object.entries(initial))
  const api = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, v)
    },
    removeItem: (k: string) => {
      store.delete(k)
    },
  }
  ;(globalThis as { window?: object }).window = { localStorage: api }
  ;(globalThis as { localStorage?: typeof api }).localStorage = api
  return store
}

function detachStorage(): void {
  delete (globalThis as { window?: object }).window
  delete (globalThis as { localStorage?: object }).localStorage
}

describe("useStudyStore", () => {
  beforeEach(() => {
    attachStorage()
    freshStore()
  })

  test("init starts cold with fresh results map", () => {
    const store = useStudyStore
    store.getState().init("s1", makeCards(3))
    const s = store.getState()
    expect(s.sessionId).toBe("s1")
    expect(s.cards).toHaveLength(3)
    expect(s.index).toBe(0)
    expect(s.phase).toBe("pass1")
    expect(s.flipped).toBe(false)
    expect(s.retryCards).toHaveLength(0)
    expect(Object.keys(s.results)).toHaveLength(3)
    expect(Object.values(s.results).every((v) => v === false)).toBe(true)
  })

  test("init warm-restores from localStorage when card count matches", () => {
    const store = useStudyStore
    const cards = makeCards(3)
    const savedState = {
      sessionId: "s1",
      cards,
      retryCards: [cards[2]],
      index: 2,
      phase: "retry" as const,
      flipped: true,
      results: { c1: true, c2: true, c3: false },
      startedAt: 1_700_000_000_000,
    }
    attachStorage({ [STORAGE_KEY_PREFIX + "s1"]: JSON.stringify(savedState) })
    store.getState().init("s1", cards)
    const s = store.getState()
    expect(s.phase).toBe("retry")
    expect(s.index).toBe(2)
    expect(s.retryCards).toHaveLength(1)
    expect(s.retryCards[0].id).toBe("c3")
    expect(s.results.c1).toBe(true)
    expect(s.results.c3).toBe(false)
  })

  test("init drops persisted state when card count drifts", () => {
    const store = useStudyStore
    const originalCards = makeCards(3)
    const newCards = makeCards(5)
    const savedState = {
      sessionId: "s1",
      cards: originalCards,
      retryCards: [originalCards[2]],
      index: 2,
      phase: "retry" as const,
      flipped: true,
      results: { c1: true, c2: true, c3: false },
      startedAt: 1_700_000_000_000,
    }
    attachStorage({ [STORAGE_KEY_PREFIX + "s1"]: JSON.stringify(savedState) })
    store.getState().init("s1", newCards)
    const s = store.getState()
    expect(s.phase).toBe("pass1")
    expect(s.index).toBe(0)
    expect(s.cards).toHaveLength(5)
    expect(Object.keys(s.results)).toHaveLength(5)
  })

  test("flip toggles the flipped flag", () => {
    const store = useStudyStore
    store.getState().init("s1", makeCards(2))
    expect(store.getState().flipped).toBe(false)
    store.getState().flip()
    expect(store.getState().flipped).toBe(true)
    store.getState().flip()
    expect(store.getState().flipped).toBe(false)
  })

  test("answer in pass1 mid-list advances index and unflips", () => {
    const store = useStudyStore
    store.getState().init("s1", makeCards(3))
    store.getState().flip()
    store.getState().answer(true)
    const s = store.getState()
    expect(s.index).toBe(1)
    expect(s.phase).toBe("pass1")
    expect(s.flipped).toBe(false)
    expect(s.results.c1).toBe(true)
  })

  test("pass1 last card with no failures transitions to done and clears storage", () => {
    const storage = attachStorage()
    const store = useStudyStore
    const cards = makeCards(2)
    store.getState().init("s1", cards)
    storage.set(STORAGE_KEY_PREFIX + "s1", JSON.stringify({ sessionId: "s1" }))

    store.getState().answer(true)
    store.getState().answer(true)
    const s = store.getState()
    expect(s.phase).toBe("done")
    expect(s.index).toBe(1)
    expect(storage.has(STORAGE_KEY_PREFIX + "s1")).toBe(false)
  })

  test("pass1 last card with failures starts retry queue", () => {
    const store = useStudyStore
    const cards = makeCards(2)
    store.getState().init("s1", cards)
    store.getState().answer(false)
    store.getState().answer(true)
    const s = store.getState()
    expect(s.phase).toBe("retry")
    expect(s.retryCards).toHaveLength(1)
    expect(s.retryCards[0].id).toBe("c1")
    expect(s.index).toBe(0)
  })

  test("retry last card transitions to done", () => {
    const store = useStudyStore
    const cards = makeCards(2)
    store.getState().init("s1", cards)
    store.getState().answer(false)
    store.getState().answer(true)
    store.getState().flip()
    store.getState().answer(true)
    expect(store.getState().phase).toBe("done")
  })

  test("answer is a no-op when there is no current card", () => {
    const store = useStudyStore
    const before = store.getState()
    store.getState().answer(true)
    const after = store.getState()
    expect(after).toEqual(before)
  })

  test("reset clears session, cards, and storage", () => {
    const storage = attachStorage()
    const store = useStudyStore
    store.getState().init("s1", makeCards(2))
    storage.set(STORAGE_KEY_PREFIX + "s1", "{}")
    store.getState().reset()
    const s = store.getState()
    expect(s.sessionId).toBeNull()
    expect(s.cards).toHaveLength(0)
    expect(s.retryCards).toHaveLength(0)
    expect(s.index).toBe(0)
    expect(s.phase).toBe("pass1")
    expect(s.flipped).toBe(false)
    expect(storage.has(STORAGE_KEY_PREFIX + "s1")).toBe(false)
  })

  test("selectors reflect state across phases", () => {
    const store = useStudyStore
    const cards = makeCards(3)
    store.getState().init("s1", cards)

    expect(selectCurrentCard(store.getState())?.id).toBe("c1")
    expect(selectProgress(store.getState())).toEqual({ position: 1, total: 3 })
    expect(selectResults(store.getState())).toEqual([
      { cardId: "c1", correct: false },
      { cardId: "c2", correct: false },
      { cardId: "c3", correct: false },
    ])

    store.getState().answer(true)
    store.getState().answer(false)
    store.getState().answer(true)

    expect(store.getState().phase).toBe("retry")
    expect(selectCurrentCard(store.getState())?.id).toBe("c2")
    expect(selectProgress(store.getState())).toEqual({ position: 1, total: 1 })

    store.getState().answer(false)
    expect(store.getState().phase).toBe("done")
    expect(selectCurrentCard(store.getState())).toBeNull()
    expect(selectProgress(store.getState())).toEqual({ position: 3, total: 3 })
  })

  test("init is SSR-safe when window and localStorage are absent", () => {
    detachStorage()
    const store = useStudyStore
    expect(() => store.getState().init("s1", makeCards(2))).not.toThrow()
    expect(store.getState().sessionId).toBe("s1")
    expect(store.getState().phase).toBe("pass1")
  })
})
