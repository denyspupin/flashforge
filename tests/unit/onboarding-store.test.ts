import { afterEach, beforeEach, describe, expect, test } from "vitest"

import { useOnboardingStore } from "@/stores/onboarding-store"

type StorageItems = Record<string, string>

function keyFor(userId: string) {
  return `ff-onboarding:${userId}`
}

function attachStorage(initial: StorageItems = {}): Map<string, string> {
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

function freshStore() {
  useOnboardingStore.getState().reset()
  return useOnboardingStore
}

describe("useOnboardingStore", () => {
  beforeEach(() => {
    attachStorage()
    freshStore()
  })

  afterEach(() => {
    detachStorage()
  })

  test("start opens the dialog at the first step and marks the user as shown", () => {
    const store = freshStore()
    store.getState().start("u1")
    const s = store.getState()
    expect(s.isOpen).toBe(true)
    expect(s.stepIndex).toBe(0)
    expect(s.hasStarted).toBe(true)
  })

  test("start is a no-op when the dialog was already shown to that user", () => {
    const storage = attachStorage({ [keyFor("u1")]: "1" })
    const store = freshStore()
    store.getState().start("u1")
    expect(store.getState().isOpen).toBe(false)
    expect(store.getState().stepIndex).toBe(0)
    expect(storage.get(keyFor("u1"))).toBe("1")
  })

  test("remounting after a dismissed dialog does not reopen it", () => {
    const store = freshStore()
    store.getState().start("u1")
    store.getState().next()
    store.getState().skip()
    expect(store.getState().isOpen).toBe(false)
    store.getState().start("u1")
    expect(store.getState().isOpen).toBe(false)
  })

  test("each user gets their own first show in the same browser", () => {
    const store = freshStore()
    store.getState().start("u1")
    store.getState().complete()
    expect(store.getState().isOpen).toBe(false)
    store.getState().start("u2")
    expect(store.getState().isOpen).toBe(true)
    expect(store.getState().stepIndex).toBe(0)
  })

  test("start is SSR-safe without window and localStorage", () => {
    detachStorage()
    const store = freshStore()
    expect(() => store.getState().start("u1")).not.toThrow()
    expect(store.getState().isOpen).toBe(false)
  })

  test("next stops at the last step and prev stops at the first", () => {
    const store = freshStore()
    store.getState().start("u1")
    for (let i = 0; i < 10; i += 1) store.getState().next()
    expect(store.getState().stepIndex).toBe(3)
    store.getState().prev()
    expect(store.getState().stepIndex).toBe(2)
    store.getState().prev()
    store.getState().prev()
    store.getState().prev()
    expect(store.getState().stepIndex).toBe(0)
  })
})
