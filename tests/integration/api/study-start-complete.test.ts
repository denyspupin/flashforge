import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest"
import { eq } from "drizzle-orm"
import { setupTestPool, teardownTestPool, withTx } from "../../setup/db"
import { mockClerk } from "../../setup/clerk"
import { callRoute } from "../../setup/route-call"
import { seedCard, seedCards, seedLanguage, seedSession, seedUser } from "../../setup/fixtures"
import type { TestDb } from "../../setup/db"
import * as schema from "@/lib/db/schema"
import { POST as startStudy } from "@/app/api/v1/study/route"
import { POST as completeStudy } from "@/app/api/v1/study/[sessionId]/complete/route"
import { XP_VALUES } from "@/lib/constants"

type SeedDeckResult = {
  user: typeof schema.users.$inferSelect
  deck: typeof schema.decks.$inferSelect
  cards: Array<typeof schema.cards.$inferSelect>
}

async function seedOwnedDeckWithCards(
  db: TestDb,
  options: { cardCount?: number; visibility?: "private" | "public" } = {},
): Promise<SeedDeckResult> {
  const user = await seedUser(db, {})
  const source = await seedLanguage(db, "en")
  const target = await seedLanguage(db, "es")
  const [deck] = await db
    .insert(schema.decks)
    .values({
      title: "Study Deck",
      slug: "study-deck",
      creatorId: user.id,
      sourceLanguageId: source.id,
      targetLanguageId: target.id,
      visibility: options.visibility ?? "private",
    })
    .returning()
  const cards = await seedCards(db, deck.id, options.cardCount ?? 3)
  return { user, deck, cards }
}

describe("study start + complete", () => {
  beforeAll(async () => {
    await setupTestPool()
  })
  afterAll(async () => {
    await teardownTestPool()
  })

  beforeEach(() => {
    vi.useRealTimers()
  })

  test("start for a private deck you don't own returns 404", async () => {
    await withTx(async (db) => {
      const owner = await seedUser(db, {})
      const stranger = await seedUser(db, {})
      const source = await seedLanguage(db, "en")
      const target = await seedLanguage(db, "es")
      const [deck] = await db
        .insert(schema.decks)
        .values({
          title: "Private",
          slug: "private-start",
          creatorId: owner.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          visibility: "private",
        })
        .returning()

      mockClerk({ clerkId: stranger.clerkId })
      const res = await callRoute(startStudy, {
        method: "POST",
        body: { deck_id: deck.id },
      })
      expect(res.status).toBe(404)
    })
  })

  test("start for a public deck returns session, deck, and cards in createdAt order", async () => {
    await withTx(async (db) => {
      const owner = await seedUser(db, {})
      const learner = await seedUser(db, {})
      const source = await seedLanguage(db, "en")
      const target = await seedLanguage(db, "es")
      const [deck] = await db
        .insert(schema.decks)
        .values({
          title: "Public",
          slug: "public-start",
          creatorId: owner.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          visibility: "public",
        })
        .returning()
      const c1 = await seedCard(db, deck.id, { front: "1" })
      await new Promise((r) => setTimeout(r, 5))
      const c2 = await seedCard(db, deck.id, { front: "2" })
      await new Promise((r) => setTimeout(r, 5))
      const c3 = await seedCard(db, deck.id, { front: "3" })

      mockClerk({ clerkId: learner.clerkId })
      const res = await callRoute(startStudy, {
        method: "POST",
        body: { deck_id: deck.id },
      })
      expect(res.status).toBe(200)
      const data = res.data as { session: typeof schema.studySessions.$inferSelect; cards: Array<{ id: string }> }
      expect(data.session.status).toBe("active")
      expect(data.cards.map((c) => c.id)).toEqual([c1.id, c2.id, c3.id])
    })
  })

  test("starting again while a session is active returns the same session id", async () => {
    await withTx(async (db) => {
      const { user, deck } = await seedOwnedDeckWithCards(db)
      mockClerk({ clerkId: user.clerkId })

      const first = await callRoute(startStudy, {
        method: "POST",
        body: { deck_id: deck.id },
      })
      const second = await callRoute(startStudy, {
        method: "POST",
        body: { deck_id: deck.id },
      })

      const a = first.data as { session: { id: string } }
      const b = second.data as { session: { id: string } }
      expect(a.session.id).toBe(b.session.id)

      const active = await db
        .select()
        .from(schema.studySessions)
        .where(eq(schema.studySessions.userId, user.id))
      expect(active).toHaveLength(1)
    })
  })

  test("complete on a fresh user with all-correct awards XP and increments card stats", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-15T12:00:00Z"))

    await withTx(async (db) => {
      const { user, deck, cards } = await seedOwnedDeckWithCards(db, { cardCount: 3 })
      mockClerk({ clerkId: user.clerkId })

      const start = await callRoute(startStudy, {
        method: "POST",
        body: { deck_id: deck.id },
      })
      const { session } = start.data as { session: { id: string } }

      const complete = await callRoute(completeStudy, {
        method: "POST",
        params: { sessionId: session.id },
        body: {
          results: cards.map((c) => ({ cardId: c.id, correct: true })),
        },
      })
      expect(complete.status).toBe(200)
      const result = complete.data as {
        xpAwarded: number
        newStreak: number
        totalXp: number
        session: typeof schema.studySessions.$inferSelect
      }
      expect(result.xpAwarded).toBeGreaterThan(0)
      expect(result.totalXp).toBe(user.xp + result.xpAwarded)
      expect(result.newStreak).toBe(1)
      expect(result.session.status).toBe("completed")
      expect(result.session.failedCardIds).toEqual([])

      const updatedCards = await db
        .select()
        .from(schema.cards)
        .where(eq(schema.cards.deckId, deck.id))
      for (const c of updatedCards) {
        expect(c.timesReviewed).toBe(1)
        expect(c.timesCorrect).toBe(1)
        expect(c.lastReviewedAt).toBeInstanceOf(Date)
      }
    })
  })

  test("complete with 0 cards awards no XP and no deck-complete bonus", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-15T12:00:00Z"))

    await withTx(async (db) => {
      const { user, deck } = await seedOwnedDeckWithCards(db, { cardCount: 0 })
      mockClerk({ clerkId: user.clerkId })

      const start = await callRoute(startStudy, {
        method: "POST",
        body: { deck_id: deck.id },
      })
      const { session } = start.data as { session: { id: string } }

      const complete = await callRoute(completeStudy, {
        method: "POST",
        params: { sessionId: session.id },
        body: { results: [] },
      })
      expect(complete.status).toBe(200)
      const result = complete.data as { xpAwarded: number }
      expect(result.xpAwarded).toBe(0)
    })
  })

  test("complete with all-fail omits the DECK_PERFECT bonus and populates failedCardIds", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-15T12:00:00Z"))

    await withTx(async (db) => {
      const { user, deck, cards } = await seedOwnedDeckWithCards(db, { cardCount: 2 })
      mockClerk({ clerkId: user.clerkId })

      const start = await callRoute(startStudy, {
        method: "POST",
        body: { deck_id: deck.id },
      })
      const { session } = start.data as { session: { id: string } }

      const complete = await callRoute(completeStudy, {
        method: "POST",
        params: { sessionId: session.id },
        body: {
          results: cards.map((c) => ({ cardId: c.id, correct: false })),
        },
      })
      const result = complete.data as {
        xpAwarded: number
        session: { failedCardIds: string[] }
      }
      const expectedNoPerfect =
        cards.length * XP_VALUES.CARD_REVIEWED + 0 * XP_VALUES.CARD_CORRECT + XP_VALUES.DECK_COMPLETE
      expect(result.xpAwarded).toBe(expectedNoPerfect)
      expect(result.session.failedCardIds.sort()).toEqual(cards.map((c) => c.id).sort())
    })
  })

  describe("streak math (parameterised, mocked clock)", () => {
    async function setupUserAtStreak(
      db: TestDb,
      streak: number,
      streakUpdatedAt: Date | null,
    ) {
      const user = await seedUser(db, { streak, streakUpdatedAt })
      const source = await seedLanguage(db, "en")
      const target = await seedLanguage(db, "es")
      const [deck] = await db
        .insert(schema.decks)
        .values({
          title: "Streak",
          slug: `streak-${Math.random()}`,
          creatorId: user.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
        })
        .returning()
      const card = await seedCard(db, deck.id)
      return { user, deck, card }
    }

    const cases: Array<{ name: string; now: string; prev: Date | null; streak: number; expected: number }> = [
      { name: "first ever completion", now: "2026-06-15T10:00:00Z", prev: null, streak: 0, expected: 1 },
      { name: "same UTC day", now: "2026-06-15T22:00:00Z", prev: new Date("2026-06-15T03:00:00Z"), streak: 5, expected: 5 },
      { name: "consecutive day", now: "2026-06-16T00:30:00Z", prev: new Date("2026-06-15T10:00:00Z"), streak: 5, expected: 6 },
      { name: "gap of 2 days resets", now: "2026-06-17T10:00:00Z", prev: new Date("2026-06-15T10:00:00Z"), streak: 5, expected: 1 },
    ]

    for (const c of cases) {
      test(c.name, async () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date(c.now))
        await withTx(async (db) => {
          const { user, deck, card } = await setupUserAtStreak(db, c.streak, c.prev)
          mockClerk({ clerkId: user.clerkId })

          const start = await callRoute(startStudy, {
            method: "POST",
            body: { deck_id: deck.id },
          })
          const { session } = start.data as { session: { id: string } }

          const complete = await callRoute(completeStudy, {
            method: "POST",
            params: { sessionId: session.id },
            body: { results: [{ cardId: card.id, correct: true }] },
          })
          const result = complete.data as { newStreak: number }
          expect(result.newStreak).toBe(c.expected)
        })
      })
    }
  })

  describe("multiplier tiers", () => {
    const tiers: Array<{ streak: number; multiplier: number }> = [
      { streak: 0, multiplier: 1 },
      { streak: 2, multiplier: 1 },
      { streak: 3, multiplier: 1.5 },
      { streak: 6, multiplier: 1.5 },
      { streak: 7, multiplier: 2 },
      { streak: 13, multiplier: 2 },
      { streak: 14, multiplier: 2.5 },
      { streak: 29, multiplier: 2.5 },
      { streak: 30, multiplier: 3 },
      { streak: 100, multiplier: 3 },
    ]

    for (const t of tiers) {
      test(`streak ${t.streak} → multiplier ${t.multiplier}`, async () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-06-15T12:00:00Z"))
        await withTx(async (db) => {
          const u = await seedUser(db, { streak: t.streak, streakUpdatedAt: new Date() })
          const source = await seedLanguage(db, "en")
          const target = await seedLanguage(db, "es")
          const [d] = await db
            .insert(schema.decks)
            .values({
              title: "Mult",
              slug: `mult-${t.streak}-${Math.random().toString(36).slice(2, 8)}`,
              creatorId: u.id,
              sourceLanguageId: source.id,
              targetLanguageId: target.id,
            })
            .returning()
          const c = await seedCard(db, d.id)
          mockClerk({ clerkId: u.clerkId })

          const start = await callRoute(startStudy, {
            method: "POST",
            body: { deck_id: d.id },
          })
          const { session } = start.data as { session: { id: string } }
          const complete = await callRoute(completeStudy, {
            method: "POST",
            params: { sessionId: session.id },
            body: { results: [{ cardId: c.id, correct: true }] },
          })
          const result = complete.data as { xpAwarded: number; multiplier: number }
          expect(result.multiplier).toBe(t.multiplier)
        })
      })
    }
  })

  test("re-completing a session returns 409", async () => {
    await withTx(async (db) => {
      const { user, deck, cards } = await seedOwnedDeckWithCards(db, { cardCount: 1 })
      mockClerk({ clerkId: user.clerkId })

      const start = await callRoute(startStudy, {
        method: "POST",
        body: { deck_id: deck.id },
      })
      const { session } = start.data as { session: { id: string } }
      await callRoute(completeStudy, {
        method: "POST",
        params: { sessionId: session.id },
        body: { results: cards.map((c) => ({ cardId: c.id, correct: true })) },
      })

      const second = await callRoute(completeStudy, {
        method: "POST",
        params: { sessionId: session.id },
        body: { results: cards.map((c) => ({ cardId: c.id, correct: true })) },
      })
      expect(second.status).toBe(409)
    })
  })

  test("completing another user's session returns 404", async () => {
    await withTx(async (db) => {
      const owner = await seedUser(db, {})
      const stranger = await seedUser(db, {})
      const source = await seedLanguage(db, "en")
      const target = await seedLanguage(db, "es")
      const [deck] = await db
        .insert(schema.decks)
        .values({
          title: "Owned",
          slug: "owned-by-other",
          creatorId: owner.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
        })
        .returning()
      const session = await seedSession(db, { userId: owner.id, deckId: deck.id })

      mockClerk({ clerkId: stranger.clerkId })
      const res = await callRoute(completeStudy, {
        method: "POST",
        params: { sessionId: session.id },
        body: { results: [] },
      })
      expect(res.status).toBe(404)
    })
  })
})
