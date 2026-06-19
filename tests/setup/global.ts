import { vi } from "vitest"

type TestDb = unknown
type TestClerk = {
  clerkId: string
  role?: "user" | "curator" | "admin"
  firstName?: string
  lastName?: string
  imageUrl?: string | null
} | null

const refs = vi.hoisted(() => {
  let db: TestDb = null
  let clerk: TestClerk = null
  return {
    setDb: (v: TestDb) => {
      db = v
    },
    getDb: () => db,
    setClerk: (v: TestClerk) => {
      clerk = v
    },
    getClerk: () => clerk,
  }
})

vi.mock("@/lib/db/client", () => ({
  get db() {
    return refs.getDb()
  },
}))

vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => {
    const c = refs.getClerk()
    return { userId: c?.clerkId ?? null }
  },
  currentUser: async () => {
    const c = refs.getClerk()
    if (!c) return null
    return {
      id: c.clerkId,
      firstName: c.firstName ?? null,
      lastName: c.lastName ?? null,
      imageUrl: c.imageUrl ?? null,
      publicMetadata: { role: c.role ?? "user" },
    }
  },
}))

vi.mock("@/lib/cache/revalidate", () => ({
  revalidateCache: () => {},
}))

vi.mock("next/cache", async () => {
  const actual =
    await vi.importActual<typeof import("next/cache")>("next/cache")
  return {
    ...actual,
    unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  }
})

export const testDb = {
  set: refs.setDb,
  get: refs.getDb,
}

export const testClerk = {
  set: refs.setClerk,
  get: refs.getClerk,
}
