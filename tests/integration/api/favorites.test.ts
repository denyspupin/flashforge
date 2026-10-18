import { afterAll, beforeAll, describe, expect, test } from "vitest"
import { eq, sql } from "drizzle-orm"
import { setupTestPool, teardownTestPool, withTx } from "../../setup/db"
import { clearClerk, mockClerk } from "../../setup/clerk"
import { callRoute } from "../../setup/route-call"
import { seedCard, seedCollection, seedDeck, seedLanguage, seedUser } from "../../setup/fixtures"
import * as schema from "@/lib/db/schema"
import { GET as listFavorites, POST as toggleFavorite } from "@/app/api/v1/favorites/route"

const CLEANUP_SQL = sql`TRUNCATE favorite_decks, favorite_collections, collections, collection_decks, decks, deck_topics, cards, topics, languages, users RESTART IDENTITY CASCADE`

describe("favorites", () => {
  beforeAll(async () => {
    await setupTestPool()
  })
  afterAll(async () => {
    await teardownTestPool()
  })

  test("POST toggles a deck favorite on and off", async () => {
    await withTx(async (db) => {
      const user = await seedUser(db, {})
      const source = await seedLanguage(db, "en")
      const target = await seedLanguage(db, "es")
      const deck = await seedDeck(db, {
        creatorId: user.id,
        sourceLanguageId: source.id,
        targetLanguageId: target.id,
        slug: "fav-deck",
      })
      mockClerk({ clerkId: user.clerkId })

      const on = await callRoute(toggleFavorite, {
        method: "POST",
        body: { deckId: deck.id },
      })
      expect(on.status).toBe(200)
      expect(on.data).toMatchObject({ favorited: true })

      const rowsOn = await db
        .select()
        .from(schema.favoriteDecks)
        .where(eq(schema.favoriteDecks.deckId, deck.id))
      expect(rowsOn).toHaveLength(1)
      expect(rowsOn[0].userId).toBe(user.id)

      const off = await callRoute(toggleFavorite, {
        method: "POST",
        body: { deckId: deck.id },
      })
      expect(off.status).toBe(200)
      expect(off.data).toMatchObject({ favorited: false })

      const rowsOff = await db
        .select()
        .from(schema.favoriteDecks)
        .where(eq(schema.favoriteDecks.deckId, deck.id))
      expect(rowsOff).toHaveLength(0)

      await db.execute(CLEANUP_SQL)
    })
  })

  test("POST toggles a collection favorite on and off", async () => {
    await withTx(async (db) => {
      const user = await seedUser(db, {})
      const source = await seedLanguage(db, "en")
      const target = await seedLanguage(db, "es")
      const collection = await seedCollection(db, {
        creatorId: user.id,
        sourceLanguageId: source.id,
        targetLanguageId: target.id,
        slug: "fav-coll",
      })
      mockClerk({ clerkId: user.clerkId })

      const on = await callRoute(toggleFavorite, {
        method: "POST",
        body: { collectionId: collection.id },
      })
      expect(on.status).toBe(200)
      expect(on.data).toMatchObject({ favorited: true })

      const rowsOn = await db
        .select()
        .from(schema.favoriteCollections)
        .where(eq(schema.favoriteCollections.collectionId, collection.id))
      expect(rowsOn).toHaveLength(1)

      const off = await callRoute(toggleFavorite, {
        method: "POST",
        body: { collectionId: collection.id },
      })
      expect(off.status).toBe(200)
      expect(off.data).toMatchObject({ favorited: false })

      const rowsOff = await db
        .select()
        .from(schema.favoriteCollections)
        .where(eq(schema.favoriteCollections.collectionId, collection.id))
      expect(rowsOff).toHaveLength(0)

      await db.execute(CLEANUP_SQL)
    })
  })

  test("GET lists favorite decks and collections with counts", async () => {
    await withTx(async (db) => {
      const user = await seedUser(db, {})
      const source = await seedLanguage(db, "en")
      const target = await seedLanguage(db, "es")
      const deck = await seedDeck(db, {
        creatorId: user.id,
        sourceLanguageId: source.id,
        targetLanguageId: target.id,
        slug: "listed-deck",
      })
      await seedCard(db, deck.id)
      const deck2 = await seedDeck(db, {
        creatorId: user.id,
        sourceLanguageId: source.id,
        targetLanguageId: target.id,
        slug: "unlisted-deck",
      })
      const collection = await seedCollection(db, {
        creatorId: user.id,
        sourceLanguageId: source.id,
        targetLanguageId: target.id,
        slug: "listed-coll",
      })
      mockClerk({ clerkId: user.clerkId })

      await callRoute(toggleFavorite, { method: "POST", body: { deckId: deck.id } })
      await callRoute(toggleFavorite, {
        method: "POST",
        body: { collectionId: collection.id },
      })

      const res = await callRoute(listFavorites, { method: "GET" })
      expect(res.status).toBe(200)
      const data = res.data as {
        favoriteDecks: Array<{ id: string; cardCount: number }>
        favoriteCollections: Array<{ id: string; deckCount: number; totalCards: number }>
        languagesById: Record<string, { code: string }>
      }
      expect(data.favoriteDecks).toHaveLength(1)
      expect(data.favoriteDecks[0].id).toBe(deck.id)
      expect(data.favoriteDecks[0].cardCount).toBe(1)
      expect(data.favoriteCollections).toHaveLength(1)
      expect(data.favoriteCollections[0].id).toBe(collection.id)
      expect(data.favoriteCollections[0].deckCount).toBe(0)
      expect(data.favoriteCollections[0].totalCards).toBe(0)
      expect(Object.keys(data.languagesById).length).toBeGreaterThan(0)
      expect(res.data).not.toContain(deck2.id)

      await db.execute(CLEANUP_SQL)
    })
  })

  test("POST returns 404 for a private deck the caller cannot see", async () => {
    await withTx(async (db) => {
      const owner = await seedUser(db, {})
      const stranger = await seedUser(db, {})
      const source = await seedLanguage(db, "en")
      const target = await seedLanguage(db, "es")
      const deck = await seedDeck(db, {
        creatorId: owner.id,
        sourceLanguageId: source.id,
        targetLanguageId: target.id,
        slug: "hidden-deck",
      })
      mockClerk({ clerkId: stranger.clerkId })

      const res = await callRoute(toggleFavorite, {
        method: "POST",
        body: { deckId: deck.id },
      })
      expect(res.status).toBe(404)
      expect(res.error).toMatchObject({ code: "NOT_FOUND" })
    })
  })

  test("POST returns 404 for a private collection the caller cannot see", async () => {
    await withTx(async (db) => {
      const owner = await seedUser(db, {})
      const stranger = await seedUser(db, {})
      const source = await seedLanguage(db, "en")
      const target = await seedLanguage(db, "es")
      const collection = await seedCollection(db, {
        creatorId: owner.id,
        sourceLanguageId: source.id,
        targetLanguageId: target.id,
        slug: "hidden-coll",
      })
      mockClerk({ clerkId: stranger.clerkId })

      const res = await callRoute(toggleFavorite, {
        method: "POST",
        body: { collectionId: collection.id },
      })
      expect(res.status).toBe(404)
    })
  })

  test("POST rejects a body with neither or both target ids", async () => {
    await withTx(async (db) => {
      const user = await seedUser(db, {})
      mockClerk({ clerkId: user.clerkId })

      const neither = await callRoute(toggleFavorite, {
        method: "POST",
        body: {},
      })
      expect(neither.status).toBe(400)
      expect(neither.error).toMatchObject({ code: "VALIDATION_ERROR" })

      const both = await callRoute(toggleFavorite, {
        method: "POST",
        body: {
          deckId: "6231b4b3-1a0e-4d2b-8cc8-6dd53a410b07",
          collectionId: "b4a2d4b3-1a0e-4d2b-8cc8-6dd53a410b07",
        },
      })
      expect(both.status).toBe(400)
      expect(both.error).toMatchObject({ code: "VALIDATION_ERROR" })
    })
  })

  test("GET and POST require authentication", async () => {
    await withTx(async (db) => {
      clearClerk()

      const get = await callRoute(listFavorites, { method: "GET" })
      expect(get.status).toBe(401)

      const post = await callRoute(toggleFavorite, {
        method: "POST",
        body: { deckId: "6231b4b3-1a0e-4d2b-8cc8-6dd53a410b07" },
      })
      expect(post.status).toBe(401)
    })
  })
})
