import { afterAll, beforeAll, describe, expect, test } from "vitest"
import { eq, sql } from "drizzle-orm"
import { setupTestPool, teardownTestPool, withTx } from "../../setup/db"
import { clearClerk, mockClerk } from "../../setup/clerk"
import { callRoute } from "../../setup/route-call"
import { seedCard, seedCollection, seedDeck, seedLanguage, seedUser } from "../../setup/fixtures"
import * as schema from "@/lib/db/schema"
import { GET as listFollows, POST as toggleFollow } from "@/app/api/v1/follows/route"

const CLEANUP_SQL = sql`TRUNCATE followed_decks, followed_collections, favorite_decks, favorite_collections, collections, collection_decks, decks, deck_topics, cards, topics, languages, users RESTART IDENTITY CASCADE`

describe("follows", () => {
  beforeAll(async () => {
    await setupTestPool()
  })
  afterAll(async () => {
    await teardownTestPool()
  })

  test("POST toggles a deck follow on and off", async () => {
    await withTx(async (db) => {
      const user = await seedUser(db, {})
      const source = await seedLanguage(db, "en")
      const target = await seedLanguage(db, "es")
      const deck = await seedDeck(db, {
        creatorId: user.id,
        sourceLanguageId: source.id,
        targetLanguageId: target.id,
        slug: "follow-deck",
      })
      mockClerk({ clerkId: user.clerkId })

      const on = await callRoute(toggleFollow, {
        method: "POST",
        body: { deckId: deck.id },
      })
      expect(on.status).toBe(200)
      expect(on.data).toMatchObject({ following: true })

      const rowsOn = await db
        .select()
        .from(schema.followedDecks)
        .where(eq(schema.followedDecks.deckId, deck.id))
      expect(rowsOn).toHaveLength(1)
      expect(rowsOn[0].userId).toBe(user.id)

      const off = await callRoute(toggleFollow, {
        method: "POST",
        body: { deckId: deck.id },
      })
      expect(off.status).toBe(200)
      expect(off.data).toMatchObject({ following: false })

      const rowsOff = await db
        .select()
        .from(schema.followedDecks)
        .where(eq(schema.followedDecks.deckId, deck.id))
      expect(rowsOff).toHaveLength(0)

      await db.execute(CLEANUP_SQL)
    })
  })

  test("POST toggles a collection follow on and off", async () => {
    await withTx(async (db) => {
      const user = await seedUser(db, {})
      const source = await seedLanguage(db, "en")
      const target = await seedLanguage(db, "es")
      const collection = await seedCollection(db, {
        creatorId: user.id,
        sourceLanguageId: source.id,
        targetLanguageId: target.id,
        slug: "follow-coll",
      })
      mockClerk({ clerkId: user.clerkId })

      const on = await callRoute(toggleFollow, {
        method: "POST",
        body: { collectionId: collection.id },
      })
      expect(on.status).toBe(200)
      expect(on.data).toMatchObject({ following: true })

      const rowsOn = await db
        .select()
        .from(schema.followedCollections)
        .where(eq(schema.followedCollections.collectionId, collection.id))
      expect(rowsOn).toHaveLength(1)

      const off = await callRoute(toggleFollow, {
        method: "POST",
        body: { collectionId: collection.id },
      })
      expect(off.status).toBe(200)
      expect(off.data).toMatchObject({ following: false })

      const rowsOff = await db
        .select()
        .from(schema.followedCollections)
        .where(eq(schema.followedCollections.collectionId, collection.id))
      expect(rowsOff).toHaveLength(0)

      await db.execute(CLEANUP_SQL)
    })
  })

  test("GET lists followed decks and collections with counts", async () => {
    await withTx(async (db) => {
      const user = await seedUser(db, {})
      const source = await seedLanguage(db, "en")
      const target = await seedLanguage(db, "es")
      const deck = await seedDeck(db, {
        creatorId: user.id,
        sourceLanguageId: source.id,
        targetLanguageId: target.id,
        slug: "follow-listed-deck",
      })
      await seedCard(db, deck.id)
      const deck2 = await seedDeck(db, {
        creatorId: user.id,
        sourceLanguageId: source.id,
        targetLanguageId: target.id,
        slug: "follow-unlisted-deck",
      })
      const collection = await seedCollection(db, {
        creatorId: user.id,
        sourceLanguageId: source.id,
        targetLanguageId: target.id,
        slug: "follow-listed-coll",
      })
      mockClerk({ clerkId: user.clerkId })

      await callRoute(toggleFollow, { method: "POST", body: { deckId: deck.id } })
      await callRoute(toggleFollow, {
        method: "POST",
        body: { collectionId: collection.id },
      })

      const res = await callRoute(listFollows, { method: "GET" })
      expect(res.status).toBe(200)
      const data = res.data as {
        followedDecks: Array<{ id: string; cardCount: number }>
        followedCollections: Array<{ id: string; deckCount: number; totalCards: number }>
        languagesById: Record<string, { code: string }>
      }
      expect(data.followedDecks).toHaveLength(1)
      expect(data.followedDecks[0].id).toBe(deck.id)
      expect(data.followedDecks[0].cardCount).toBe(1)
      expect(data.followedCollections).toHaveLength(1)
      expect(data.followedCollections[0].id).toBe(collection.id)
      expect(data.followedCollections[0].deckCount).toBe(0)
      expect(data.followedCollections[0].totalCards).toBe(0)
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
        slug: "follow-hidden-deck",
      })
      mockClerk({ clerkId: stranger.clerkId })

      const res = await callRoute(toggleFollow, {
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
        slug: "follow-hidden-coll",
      })
      mockClerk({ clerkId: stranger.clerkId })

      const res = await callRoute(toggleFollow, {
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

      const neither = await callRoute(toggleFollow, {
        method: "POST",
        body: {},
      })
      expect(neither.status).toBe(400)
      expect(neither.error).toMatchObject({ code: "VALIDATION_ERROR" })

      const both = await callRoute(toggleFollow, {
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

      const get = await callRoute(listFollows, { method: "GET" })
      expect(get.status).toBe(401)

      const post = await callRoute(toggleFollow, {
        method: "POST",
        body: { deckId: "6231b4b3-1a0e-4d2b-8cc8-6dd53a410b07" },
      })
      expect(post.status).toBe(401)
    })
  })
})
