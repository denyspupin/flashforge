import { afterAll, beforeAll, describe, expect, test } from "vitest"
import { eq } from "drizzle-orm"
import { setupTestPool, teardownTestPool, withTx } from "../../setup/db"
import { clearClerk, mockClerk } from "../../setup/clerk"
import { callRoute } from "../../setup/route-call"
import { seedCards, seedLanguage, seedUser } from "../../setup/fixtures"
import * as schema from "@/lib/db/schema"
import { GET as listDecks, POST as createDeck } from "@/app/api/v1/decks/route"
import {
  DELETE as deleteDeck,
  GET as getDeck,
  PATCH as patchDeck,
} from "@/app/api/v1/decks/[id]/route"

describe("decks CRUD", () => {
  beforeAll(async () => {
    await setupTestPool()
  })
  afterAll(async () => {
    await teardownTestPool()
  })

  test("create returns 200 with a derived slug from the title", async () => {
    await withTx(async (db) => {
      const user = await seedUser(db, {})
      const source = await seedLanguage(db, "en")
      const target = await seedLanguage(db, "es")
      mockClerk({ clerkId: user.clerkId })

      const res = await callRoute(createDeck, {
        method: "POST",
        body: {
          title: "Travel Phrases",
          description: "Basics for a trip",
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          visibility: "private",
        },
      })

      expect(res.status).toBe(200)
      expect(res.data).toMatchObject({
        title: "Travel Phrases",
        slug: "travel-phrases",
        visibility: "private",
        creatorId: user.id,
      })

      const stored = await db.select().from(schema.decks).where(eq(schema.decks.id, res.data!.id))
      expect(stored).toHaveLength(1)
    })
  })

  test("list returns only the caller's decks", async () => {
    await withTx(async (db) => {
      const owner = await seedUser(db, {})
      const stranger = await seedUser(db, {})
      const source = await seedLanguage(db, "en")
      const target = await seedLanguage(db, "es")
      const owned = await db
        .insert(schema.decks)
        .values({
          title: "Owned",
          slug: "owned",
          creatorId: owner.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
        })
        .returning()
      await db.insert(schema.decks).values({
        title: "Stranger's",
        slug: "strangers",
        creatorId: stranger.id,
        sourceLanguageId: source.id,
        targetLanguageId: target.id,
      })

      mockClerk({ clerkId: owner.clerkId })
      const res = await callRoute(listDecks, { method: "GET" })
      expect(res.status).toBe(200)
      expect(res.data).toHaveLength(1)
      expect(res.data![0].id).toBe(owned[0].id)
    })
  })

  test("PATCH title re-derives the slug", async () => {
    await withTx(async (db) => {
      const user = await seedUser(db, {})
      const source = await seedLanguage(db, "en")
      const target = await seedLanguage(db, "es")
      const deck = await db
        .insert(schema.decks)
        .values({
          title: "Old Title",
          slug: "old-title",
          creatorId: user.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
        })
        .returning()
      mockClerk({ clerkId: user.clerkId })

      const res = await callRoute(patchDeck, {
        method: "PATCH",
        params: { id: deck[0].id },
        body: { title: "Brand New Title" },
      })
      expect(res.status).toBe(200)
      expect(res.data).toMatchObject({ title: "Brand New Title", slug: "brand-new-title" })
    })
  })

  test("DELETE cascades to cards and sessions", async () => {
    await withTx(async (db) => {
      const user = await seedUser(db, {})
      const source = await seedLanguage(db, "en")
      const target = await seedLanguage(db, "es")
      const deck = await db
        .insert(schema.decks)
        .values({
          title: "Doomed",
          slug: "doomed",
          creatorId: user.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
        })
        .returning()
      await seedCards(db, deck[0].id, 3)
      await db.insert(schema.studySessions).values({
        userId: user.id,
        deckId: deck[0].id,
      })

      mockClerk({ clerkId: user.clerkId })
      const res = await callRoute(deleteDeck, {
        method: "DELETE",
        params: { id: deck[0].id },
      })
      expect(res.status).toBe(200)

      const cardsAfter = await db.select().from(schema.cards).where(eq(schema.cards.deckId, deck[0].id))
      const sessionsAfter = await db
        .select()
        .from(schema.studySessions)
        .where(eq(schema.studySessions.deckId, deck[0].id))
      expect(cardsAfter).toHaveLength(0)
      expect(sessionsAfter).toHaveLength(0)
    })
  })

  test("cross-owner access returns 404 (no info leak)", async () => {
    await withTx(async (db) => {
      const owner = await seedUser(db, {})
      const stranger = await seedUser(db, {})
      const source = await seedLanguage(db, "en")
      const target = await seedLanguage(db, "es")
      const deck = await db
        .insert(schema.decks)
        .values({
          title: "Private",
          slug: "private",
          creatorId: owner.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
        })
        .returning()
      mockClerk({ clerkId: stranger.clerkId })

      const get = await callRoute(getDeck, { method: "GET", params: { id: deck[0].id } })
      const patch = await callRoute(patchDeck, {
        method: "PATCH",
        params: { id: deck[0].id },
        body: { title: "Hijacked" },
      })
      const del = await callRoute(deleteDeck, { method: "DELETE", params: { id: deck[0].id } })

      expect(get.status).toBe(404)
      expect(patch.status).toBe(404)
      expect(del.status).toBe(404)
    })
  })

  test("invalid body returns 400", async () => {
    await withTx(async (db) => {
      const user = await seedUser(db, {})
      mockClerk({ clerkId: user.clerkId })

      const res = await callRoute(createDeck, {
        method: "POST",
        body: { description: "missing title" },
      })
      expect(res.status).toBe(400)
      expect(res.error?.code).toBe("VALIDATION_ERROR")
    })
  })

  test("unauthenticated request returns 401", async () => {
    clearClerk()
    const res = await callRoute(listDecks, { method: "GET" })
    expect(res.status).toBe(401)
  })
})
