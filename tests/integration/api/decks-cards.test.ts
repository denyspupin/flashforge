import { afterAll, beforeAll, describe, expect, test } from "vitest"
import { eq } from "drizzle-orm"
import { setupTestPool, teardownTestPool, withTx } from "../../setup/db"
import { mockClerk } from "../../setup/clerk"
import { callRoute } from "../../setup/route-call"
import { seedCard, seedLanguage, seedUser } from "../../setup/fixtures"
import type { TestDb } from "../../setup/db"
import * as schema from "@/lib/db/schema"
import { POST as createCard } from "@/app/api/v1/decks/[id]/cards/route"
import {
  DELETE as deleteCard,
  PATCH as patchCard,
} from "@/app/api/v1/decks/[id]/cards/[cardId]/route"

async function seedDeckFor(db: TestDb) {
  const user = await seedUser(db, {})
  const source = await seedLanguage(db, "en")
  const target = await seedLanguage(db, "es")
  const deck = await db
    .insert(schema.decks)
    .values({
      title: "Cards Deck",
      slug: "cards-deck",
      creatorId: user.id,
      sourceLanguageId: source.id,
      targetLanguageId: target.id,
    })
    .returning()
  return { user, deck: deck[0] }
}

describe("decks cards", () => {
  beforeAll(async () => {
    await setupTestPool()
  })
  afterAll(async () => {
    await teardownTestPool()
  })

  test("POST returns the new card with the deck id", async () => {
    await withTx(async (db) => {
      const { user, deck } = await seedDeckFor(db)
      mockClerk({ clerkId: user.clerkId })

      const res = await callRoute(createCard, {
        method: "POST",
        params: { id: deck.id },
        body: { front: "hello", back: "hola" },
      })
      expect(res.status).toBe(200)
      expect(res.data).toMatchObject({ front: "hello", back: "hola", deckId: deck.id })
    })
  })

  test("bulk insert creates N cards", async () => {
    await withTx(async (db) => {
      const { user, deck } = await seedDeckFor(db)
      mockClerk({ clerkId: user.clerkId })

      for (let i = 0; i < 5; i++) {
        const res = await callRoute(createCard, {
          method: "POST",
          params: { id: deck.id },
          body: { front: `f${i}`, back: `b${i}` },
        })
        expect(res.status).toBe(200)
      }
      const stored = await db.select().from(schema.cards).where(eq(schema.cards.deckId, deck.id))
      expect(stored).toHaveLength(5)
    })
  })

  test("PATCH partial keeps the omitted field", async () => {
    await withTx(async (db) => {
      const { user, deck } = await seedDeckFor(db)
      const card = await seedCard(db, deck.id, { front: "a", back: "b" })
      mockClerk({ clerkId: user.clerkId })

      const res = await callRoute(patchCard, {
        method: "PATCH",
        params: { id: deck.id, cardId: card.id },
        body: { front: "A!" },
      })
      expect(res.status).toBe(200)
      expect(res.data).toMatchObject({ front: "A!", back: "b" })
    })
  })

  test("DELETE removes only the owner's card", async () => {
    await withTx(async (db) => {
      const { user, deck } = await seedDeckFor(db)
      const other = await seedUser(db, {})
      const otherDeck = await db
        .insert(schema.decks)
        .values({
          title: "Other",
          slug: "other",
          creatorId: other.id,
          sourceLanguageId: deck.sourceLanguageId,
          targetLanguageId: deck.targetLanguageId,
        })
        .returning()
      const owned = await seedCard(db, deck.id, { front: "mine" })
      const theirs = await seedCard(db, otherDeck[0].id, { front: "theirs" })
      mockClerk({ clerkId: user.clerkId })

      const res = await callRoute(deleteCard, {
        method: "DELETE",
        params: { id: deck.id, cardId: owned.id },
      })
      expect(res.status).toBe(200)
      const after = await db.select().from(schema.cards).where(eq(schema.cards.id, owned.id))
      expect(after).toHaveLength(0)

      const untouched = await db.select().from(schema.cards).where(eq(schema.cards.id, theirs.id))
      expect(untouched).toHaveLength(1)
    })
  })

  test("cross-owner card mutation returns 404", async () => {
    await withTx(async (db) => {
      const { deck } = await seedDeckFor(db)
      const stranger = await seedUser(db, {})
      const card = await seedCard(db, deck.id)
      mockClerk({ clerkId: stranger.clerkId })

      const patch = await callRoute(patchCard, {
        method: "PATCH",
        params: { id: deck.id, cardId: card.id },
        body: { front: "hacked" },
      })
      const del = await callRoute(deleteCard, {
        method: "DELETE",
        params: { id: deck.id, cardId: card.id },
      })
      expect(patch.status).toBe(404)
      expect(del.status).toBe(404)
    })
  })
})
