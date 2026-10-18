import { afterAll, beforeAll, describe, expect, test } from "vitest"
import { eq } from "drizzle-orm"
import { setupTestPool, teardownTestPool, withTx } from "../../setup/db"
import { mockClerk } from "../../setup/clerk"
import { callRoute } from "../../setup/route-call"
import { seedCards, seedLanguage, seedSession, seedUser } from "../../setup/fixtures"
import type { TestDb } from "../../setup/db"
import * as schema from "@/lib/db/schema"
import { GET as getSession, PATCH as flushSession } from "@/app/api/v1/study/[sessionId]/route"
import { POST as abandonSession } from "@/app/api/v1/study/[sessionId]/abandon/route"
import { POST as completeStudy } from "@/app/api/v1/study/[sessionId]/complete/route"
import { POST as startStudy } from "@/app/api/v1/study/route"

async function setupDeckWithCards(
  db: TestDb,
  options: { cardCount?: number; visibility?: "private" | "public" } = {},
) {
  const user = await seedUser(db, {})
  const source = await seedLanguage(db, "en")
  const target = await seedLanguage(db, "es")
  const [deck] = await db
    .insert(schema.decks)
    .values({
      title: "Resume",
      slug: `resume-${Math.random().toString(36).slice(2, 8)}`,
      creatorId: user.id,
      sourceLanguageId: source.id,
      targetLanguageId: target.id,
      visibility: options.visibility ?? "private",
    })
    .returning()
  const cards = await seedCards(db, deck.id, options.cardCount ?? 2)
  return { user, deck, cards }
}

describe("study resume + abandon", () => {
  beforeAll(async () => {
    await setupTestPool()
  })
  afterAll(async () => {
    await teardownTestPool()
  })

  test("GET session returns deck with language names and flags", async () => {
    await withTx(async (db) => {
      const { user, deck } = await setupDeckWithCards(db)
      const session = await seedSession(db, { userId: user.id, deckId: deck.id })
      mockClerk({ clerkId: user.clerkId })

      const res = await callRoute(getSession, {
        method: "GET",
        params: { sessionId: session.id },
      })
      expect(res.status).toBe(200)
      const data = res.data as {
        session: { id: string }
        deck: { sourceLanguage: string; targetLanguage: string; sourceLanguageFlag: string; targetLanguageFlag: string }
        cards: unknown[]
      }
      expect(data.session.id).toBe(session.id)
      expect(data.deck.sourceLanguage).toBe("English")
      expect(data.deck.targetLanguage).toBe("Spanish")
      expect(typeof data.deck.sourceLanguageFlag).toBe("string")
      expect(typeof data.deck.targetLanguageFlag).toBe("string")
    })
  })

  test("abandon marks the active session as abandoned", async () => {
    await withTx(async (db) => {
      const { user, deck } = await setupDeckWithCards(db)
      const session = await seedSession(db, {
        userId: user.id,
        deckId: deck.id,
        status: "active",
      })
      mockClerk({ clerkId: user.clerkId })

      const res = await callRoute(abandonSession, {
        method: "POST",
        params: { sessionId: session.id },
      })
      expect(res.status).toBe(200)
      expect(res.data).toMatchObject({ status: "abandoned" })

      const stored = await db
        .select()
        .from(schema.studySessions)
        .where(eq(schema.studySessions.id, session.id))
      expect(stored[0].status).toBe("abandoned")
    })
  })

  test("abandoning a non-active session returns 404", async () => {
    await withTx(async (db) => {
      const { user, deck } = await setupDeckWithCards(db)
      const session = await seedSession(db, {
        userId: user.id,
        deckId: deck.id,
        status: "completed",
      })
      mockClerk({ clerkId: user.clerkId })

      const res = await callRoute(abandonSession, {
        method: "POST",
        params: { sessionId: session.id },
      })
      expect(res.status).toBe(404)
    })
  })

  test("PATCH flush persists durationMs and keeps the greatest value", async () => {
    await withTx(async (db) => {
      const { user, deck } = await setupDeckWithCards(db)
      const session = await seedSession(db, {
        userId: user.id,
        deckId: deck.id,
        status: "active",
      })
      mockClerk({ clerkId: user.clerkId })

      const first = await callRoute(flushSession, {
        method: "PATCH",
        params: { sessionId: session.id },
        body: { durationMs: 1_000 },
      })
      expect(first.status).toBe(200)
      expect(first.data).toMatchObject({ durationMs: 1_000 })

      const second = await callRoute(flushSession, {
        method: "PATCH",
        params: { sessionId: session.id },
        body: { durationMs: 500 },
      })
      expect(second.status).toBe(200)
      expect(second.data).toMatchObject({ durationMs: 1_000 })
    })
  })

  test("PATCH flush on a non-active session returns 409", async () => {
    await withTx(async (db) => {
      const { user, deck } = await setupDeckWithCards(db)
      const session = await seedSession(db, {
        userId: user.id,
        deckId: deck.id,
        status: "completed",
      })
      mockClerk({ clerkId: user.clerkId })

      const res = await callRoute(flushSession, {
        method: "PATCH",
        params: { sessionId: session.id },
        body: { durationMs: 1_000 },
      })
      expect(res.status).toBe(409)
    })
  })

  test("PATCH flush for an unknown session returns 404", async () => {
    await withTx(async (db) => {
      const { user } = await setupDeckWithCards(db)
      mockClerk({ clerkId: user.clerkId })

      const res = await callRoute(flushSession, {
        method: "PATCH",
        params: { sessionId: "00000000-0000-4000-8000-000000000000" },
        body: { durationMs: 1_000 },
      })
      expect(res.status).toBe(404)
    })
  })

  test("PATCH flush rejects invalid durationMs", async () => {
    await withTx(async (db) => {
      const { user, deck } = await setupDeckWithCards(db)
      const session = await seedSession(db, {
        userId: user.id,
        deckId: deck.id,
        status: "active",
      })
      mockClerk({ clerkId: user.clerkId })

      for (const durationMs of ["1000" as const, -1, 7_000_000_000]) {
        const res = await callRoute(flushSession, {
          method: "PATCH",
          params: { sessionId: session.id },
          body: { durationMs },
        })
        expect(res.status).toBe(400)
      }
    })
  })

  test("completing keeps the greatest flushed durationMs", async () => {
    await withTx(async (db) => {
      const { user, deck, cards } = await setupDeckWithCards(db)
      mockClerk({ clerkId: user.clerkId })

      const start = await callRoute(startStudy, {
        method: "POST",
        body: { deck_id: deck.id },
      })
      const { session } = start.data as { session: { id: string; status: string } }

      const flush = await callRoute(flushSession, {
        method: "PATCH",
        params: { sessionId: session.id },
        body: { durationMs: 120_000 },
      })
      expect(flush.status).toBe(200)

      const complete = await callRoute(completeStudy, {
        method: "POST",
        params: { sessionId: session.id },
        body: {
          results: cards.map((c) => ({ cardId: c.id, correct: true })),
          durationMs: 50_000,
        },
      })
      expect(complete.status).toBe(200)
      const result = complete.data as { session: { durationMs: number } }
      expect(result.session.durationMs).toBe(120_000)

      const stored = await db
        .select()
        .from(schema.studySessions)
        .where(eq(schema.studySessions.id, session.id))
      expect(stored[0].status).toBe("completed")
    })
  })

  test("abandon persists the reported durationMs", async () => {
    await withTx(async (db) => {
      const { user, deck } = await setupDeckWithCards(db)
      const session = await seedSession(db, {
        userId: user.id,
        deckId: deck.id,
        status: "active",
      })
      mockClerk({ clerkId: user.clerkId })

      const res = await callRoute(abandonSession, {
        method: "POST",
        params: { sessionId: session.id },
        body: { durationMs: 45_000 },
      })
      expect(res.status).toBe(200)

      const stored = await db
        .select()
        .from(schema.studySessions)
        .where(eq(schema.studySessions.id, session.id))
      expect(stored[0].durationMs).toBe(45_000)
    })
  })

  test("starting after abandon creates a new active session", async () => {
    await withTx(async (db) => {
      const { user, deck } = await setupDeckWithCards(db)
      const oldSession = await seedSession(db, {
        userId: user.id,
        deckId: deck.id,
        status: "abandoned",
      })
      mockClerk({ clerkId: user.clerkId })

      const start = await callRoute(startStudy, {
        method: "POST",
        body: { deck_id: deck.id },
      })
      expect(start.status).toBe(200)
      const { session } = start.data as { session: { id: string; status: string } }
      expect(session.id).not.toBe(oldSession.id)
      expect(session.status).toBe("active")

      const all = await db
        .select()
        .from(schema.studySessions)
        .where(eq(schema.studySessions.userId, user.id))
      expect(all).toHaveLength(2)
      const activeOnes = all.filter((s) => s.status === "active")
      expect(activeOnes).toHaveLength(1)
      expect(activeOnes[0].id).toBe(session.id)
    })
  })
})
