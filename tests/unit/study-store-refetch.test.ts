import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { selectResults, useStudyStore } from "@/stores/study-store"

type Storage = Map<string, string>

function makeCards(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `c${i + 1}`,
    deckId: "d1",
    front: `front-${i + 1}`,
    back: `back-${i + 1}`,
  }))
}

function attachStorage(): Storage {
  const store = new Map<string, string>()
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

describe("mid-session init re-runs (TanStack refetch)", () => {
  beforeEach(() => {
    attachStorage()
    useStudyStore.getState().reset()
  })

  afterEach(() => {
    detachStorage()
    vi.restoreAllMocks()
  })

  it("preserves answered results when init re-runs with a fresh cards array of equal length", () => {
    const cards = makeCards(8)

    useStudyStore.getState().init("s-refetch", cards)
    useStudyStore.getState().flip()
    useStudyStore.getState().answer(true)
    useStudyStore.getState().flip()
    useStudyStore.getState().answer(false)
    useStudyStore.getState().flip()
    useStudyStore.getState().answer(true)

    const before = selectResults(useStudyStore.getState())
    expect(useStudyStore.getState().index).toBe(3)
    expect(before.filter((r) => r.correct)).toHaveLength(2)

    // TanStack refetch delivers a NEW cards array identity (same length)
    useStudyStore.getState().init("s-refetch", [...cards].reverse())

    const after = selectResults(useStudyStore.getState())
    const afterState = useStudyStore.getState()

    expect(afterState.phase).toBe("pass1")
    expect(afterState.index).toBe(3)
    expect(after).toEqual(before)
  })

  it("preserves final results and phase when init re-runs after completion", () => {
    useStudyStore.getState().init("s-complete", makeCards(2))
    useStudyStore.getState().flip()
    useStudyStore.getState().answer(false)
    useStudyStore.getState().flip()
    useStudyStore.getState().answer(true)

    expect(useStudyStore.getState().phase).toBe("done")
    const done = selectResults(useStudyStore.getState())
    expect(done).toHaveLength(2)
    expect(localStorage.getItem("study:v2:s-complete")).toBeNull()

    // A focus/refetch re-runs init after the session completed (client had
    // already POSTed). Nothing persisted, so this must restore the finished
    // results, not wipe them back to a fresh all-false run.
    useStudyStore.getState().init("s-complete", makeCards(2))
    const after = useStudyStore.getState()
    expect(after.phase).toBe("done")
    expect(selectResults(useStudyStore.getState())).toEqual(done)
  })

  it("keeps the frozen card set and progress when the deck changes mid-session", () => {
    useStudyStore.getState().init("s-shrink", makeCards(5))
    useStudyStore.getState().flip()
    useStudyStore.getState().answer(true)

    useStudyStore.getState().init("s-shrink", makeCards(3))
    const s = useStudyStore.getState()
    expect(s.cards).toHaveLength(5)
    expect(s.index).toBe(1)
    expect(Object.values(s.results).filter(Boolean)).toHaveLength(1)
  })
})
