import { afterAll, beforeAll, describe, expect, test } from "vitest"
import { eq, sql } from "drizzle-orm"
import { setupTestPool, teardownTestPool, withTx } from "../../setup/db"
import { mockClerk } from "../../setup/clerk"
import { callRoute } from "../../setup/route-call"
import {
  seedCards,
  seedCollection,
  seedCollectionDecks,
  seedDeck,
  seedLanguage,
  seedUser,
} from "../../setup/fixtures"
import * as schema from "@/lib/db/schema"
import { POST as publishCollection } from "@/app/api/v1/collections/[id]/publish/route"
import { POST as unpublishCollection } from "@/app/api/v1/collections/[id]/unpublish/route"
import { POST as forkCollection } from "@/app/api/v1/collections/[id]/fork/route"
import { GET as listCommunityCollections } from "@/app/api/v1/community/collections/route"
import { GET as getPublicCollection } from "@/app/api/v1/community/collections/[id]/route"
import { GET as listMyCollections } from "@/app/api/v1/collections/route"

const CLEANUP_SQL = sql`TRUNCATE collections, collection_decks, decks, deck_topics, cards, topics, languages, users, notifications RESTART IDENTITY CASCADE`

describe("collection publish / unpublish / fork", () => {
  beforeAll(async () => {
    await setupTestPool()
  })
  afterAll(async () => {
    await teardownTestPool()
  })

  describe("publish", () => {
    test("flips visibility to public and auto-publishes member decks", async () => {
      await withTx(async (db) => {
        const user = await seedUser(db, {})
        const source = await seedLanguage(db, "en")
        const target = await seedLanguage(db, "es")
        const deck = await seedDeck(db, {
          creatorId: user.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "publish-coll-deck",
        })
        const collection = await seedCollection(db, {
          creatorId: user.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "publish-coll",
        })
        await seedCollectionDecks(db, collection.id, [deck.id])
        mockClerk({ clerkId: user.clerkId })

        const res = await callRoute(publishCollection, {
          method: "POST",
          params: { id: collection.id },
        })
        expect(res.status).toBe(200)
        expect(res.data).toMatchObject({ visibility: "public" })

        const collectionRow = await db
          .select()
          .from(schema.collections)
          .where(eq(schema.collections.id, collection.id))
        expect(collectionRow[0].visibility).toBe("public")

        const deckRow = await db
          .select()
          .from(schema.decks)
          .where(eq(schema.decks.id, deck.id))
        expect(deckRow[0].visibility).toBe("public")
      })
    })

    test("non-owner publish returns 404", async () => {
      await withTx(async (db) => {
        const owner = await seedUser(db, {})
        const stranger = await seedUser(db, {})
        const source = await seedLanguage(db, "en")
        const target = await seedLanguage(db, "es")
        const collection = await seedCollection(db, {
          creatorId: owner.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "stranger-publish",
        })
        mockClerk({ clerkId: stranger.clerkId })

        const res = await callRoute(publishCollection, {
          method: "POST",
          params: { id: collection.id },
        })
        expect(res.status).toBe(404)
      })
    })

    test("unpublish flips visibility back to private without touching decks", async () => {
      await withTx(async (db) => {
        const user = await seedUser(db, {})
        const source = await seedLanguage(db, "en")
        const target = await seedLanguage(db, "es")
        const deck = await seedDeck(db, {
          creatorId: user.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "unpublish-deck",
          visibility: "public",
        })
        const collection = await seedCollection(db, {
          creatorId: user.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "unpublish-coll",
          visibility: "public",
        })
        await seedCollectionDecks(db, collection.id, [deck.id])
        mockClerk({ clerkId: user.clerkId })

        const res = await callRoute(unpublishCollection, {
          method: "POST",
          params: { id: collection.id },
        })
        expect(res.status).toBe(200)
        expect(res.data).toMatchObject({ visibility: "private" })

        const collectionRow = await db
          .select()
          .from(schema.collections)
          .where(eq(schema.collections.id, collection.id))
        expect(collectionRow[0].visibility).toBe("private")

        const deckRow = await db
          .select()
          .from(schema.decks)
          .where(eq(schema.decks.id, deck.id))
        expect(deckRow[0].visibility).toBe("public")
      })
    })
  })

  describe("fork", () => {
    test("copies collection_decks, deep-copies decks as private, sets forkedFromCollectionId, sends notification", async () => {
      await withTx(async (db) => {
        const author = await seedUser(db, {})
        const forker = await seedUser(db, {})
        const source = await seedLanguage(db, "en")
        const target = await seedLanguage(db, "es")
        const originalDeck = await seedDeck(db, {
          creatorId: author.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "forked-deck",
          title: "Original",
          visibility: "public",
        })
        await seedCards(db, originalDeck.id, 2)
        const original = await seedCollection(db, {
          creatorId: author.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "forked-coll",
          title: "Original Collection",
          visibility: "public",
        })
        await seedCollectionDecks(db, original.id, [originalDeck.id])

        mockClerk({ clerkId: forker.clerkId })
        const res = await callRoute(forkCollection, {
          method: "POST",
          params: { id: original.id },
        })
        expect(res.status).toBe(200)
        expect(res.data).toMatchObject({
          title: "Original Collection",
          visibility: "private",
          creatorId: forker.id,
          forkedFromCollectionId: original.id,
        })

        const newCollectionId = res.data!.id

        const newCollection = await db
          .select()
          .from(schema.collections)
          .where(eq(schema.collections.id, newCollectionId))
        expect(newCollection).toHaveLength(1)

        const newMemberDecks = await db
          .select()
          .from(schema.collectionDecks)
          .where(eq(schema.collectionDecks.collectionId, newCollectionId))
        expect(newMemberDecks).toHaveLength(1)

        const newDeck = await db
          .select()
          .from(schema.decks)
          .where(eq(schema.decks.id, newMemberDecks[0].deckId))
        expect(newDeck[0]).toMatchObject({
          title: "Original",
          visibility: "private",
          creatorId: forker.id,
          forkedFromDeckId: originalDeck.id,
        })

        const newCards = await db
          .select()
          .from(schema.cards)
          .where(eq(schema.cards.deckId, newDeck[0].id))
        expect(newCards).toHaveLength(2)

        const notes = await db
          .select()
          .from(schema.notifications)
          .where(eq(schema.notifications.userId, author.id))
        expect(notes).toHaveLength(1)
        expect(notes[0].type).toBe("collection_fork_received")
        expect(notes[0].data).toMatchObject({
          originalCollectionId: original.id,
          collectionId: newCollectionId,
          collectionTitle: "Original Collection",
        })

        await db.execute(CLEANUP_SQL)
      })
    })

    test("forking own collection returns 409", async () => {
      await withTx(async (db) => {
        const user = await seedUser(db, {})
        const source = await seedLanguage(db, "en")
        const target = await seedLanguage(db, "es")
        const collection = await seedCollection(db, {
          creatorId: user.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "self-fork-coll",
          visibility: "public",
        })
        mockClerk({ clerkId: user.clerkId })

        const res = await callRoute(forkCollection, {
          method: "POST",
          params: { id: collection.id },
        })
        expect(res.status).toBe(409)
      })
    })

    test("forking a private collection returns 404", async () => {
      await withTx(async (db) => {
        const owner = await seedUser(db, {})
        const stranger = await seedUser(db, {})
        const source = await seedLanguage(db, "en")
        const target = await seedLanguage(db, "es")
        const collection = await seedCollection(db, {
          creatorId: owner.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "private-fork-coll",
          visibility: "private",
        })
        mockClerk({ clerkId: stranger.clerkId })

        const res = await callRoute(forkCollection, {
          method: "POST",
          params: { id: collection.id },
        })
        expect(res.status).toBe(404)
      })
    })
  })

  describe("community feed", () => {
    test("returns only public collections", async () => {
      await withTx(async (db) => {
        const user = await seedUser(db, {})
        const source = await seedLanguage(db, "en")
        const target = await seedLanguage(db, "es")
        const publicColl = await seedCollection(db, {
          creatorId: user.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "public-coll",
          visibility: "public",
        })
        await seedCollection(db, {
          creatorId: user.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "private-coll",
          visibility: "private",
        })

        const res = await callRoute(listCommunityCollections, { method: "GET" })
        expect(res.status).toBe(200)
        const items = res.data as Array<{ id: string }>
        expect(items).toHaveLength(1)
        expect(items[0].id).toBe(publicColl.id)
      })
    })

    test("q matches title case-insensitively", async () => {
      await withTx(async (db) => {
        const user = await seedUser(db, {})
        const source = await seedLanguage(db, "en")
        const target = await seedLanguage(db, "es")
        await seedCollection(db, {
          creatorId: user.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "travel-coll",
          title: "Travel Pack",
          visibility: "public",
        })
        await seedCollection(db, {
          creatorId: user.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "food-coll",
          title: "Food Vocabulary",
          visibility: "public",
        })

        const res = await callRoute(listCommunityCollections, {
          method: "GET",
          searchParams: { q: "TRAVEL" },
        })
        const items = res.data as Array<{ title: string }>
        expect(items).toHaveLength(1)
        expect(items[0].title).toBe("Travel Pack")
      })
    })

    test("GET /api/v1/community/collections/:id returns 404 for private collections", async () => {
      await withTx(async (db) => {
        const user = await seedUser(db, {})
        const source = await seedLanguage(db, "en")
        const target = await seedLanguage(db, "es")
        const collection = await seedCollection(db, {
          creatorId: user.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "hidden-coll",
          visibility: "private",
        })

        const res = await callRoute(getPublicCollection, {
          method: "GET",
          params: { id: collection.id },
        })
        expect(res.status).toBe(404)
      })
    })

    test("GET /api/v1/community/collections/:id returns full detail for public collections", async () => {
      await withTx(async (db) => {
        const user = await seedUser(db, { name: "Alice" })
        const source = await seedLanguage(db, "en")
        const target = await seedLanguage(db, "es")
        const deck = await seedDeck(db, {
          creatorId: user.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "detail-deck",
          title: "Detail Deck",
          visibility: "public",
        })
        await seedCards(db, deck.id, 3)
        const collection = await seedCollection(db, {
          creatorId: user.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "detail-coll",
          title: "Detail Collection",
          visibility: "public",
        })
        await seedCollectionDecks(db, collection.id, [deck.id])

        const res = await callRoute(getPublicCollection, {
          method: "GET",
          params: { id: collection.id },
        })
        expect(res.status).toBe(200)
        const data = res.data as {
          title: string
          creatorName: string
          deckCount: number
          totalCards: number
          sourceLanguage: { name: string }
          targetLanguage: { name: string }
          decks: Array<{ id: string; cardCount: number }>
        }
        expect(data.title).toBe("Detail Collection")
        expect(data.creatorName).toBe("Alice")
        expect(data.deckCount).toBe(1)
        expect(data.totalCards).toBe(3)
        expect(data.sourceLanguage.name).toBeTruthy()
        expect(data.targetLanguage.name).toBeTruthy()
        expect(data.decks[0].id).toBe(deck.id)
        expect(data.decks[0].cardCount).toBe(3)
      })
    })
  })

  describe("My Collections list", () => {
    test("totalCards reflects the actual number of cards in member decks", async () => {
      await withTx(async (db) => {
        const user = await seedUser(db, {})
        const source = await seedLanguage(db, "en")
        const target = await seedLanguage(db, "es")
        const deck = await seedDeck(db, {
          creatorId: user.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "my-coll-deck",
        })
        await seedCards(db, deck.id, 4)
        const collection = await seedCollection(db, {
          creatorId: user.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "my-coll",
        })
        await seedCollectionDecks(db, collection.id, [deck.id])
        mockClerk({ clerkId: user.clerkId })

        const res = await callRoute(listMyCollections, { method: "GET" })
        expect(res.status).toBe(200)
        const items = res.data as Array<{ id: string; deckCount: number; totalCards: number }>
        const found = items.find((c) => c.id === collection.id)
        expect(found).toBeDefined()
        expect(found?.deckCount).toBe(1)
        expect(found?.totalCards).toBe(4)
      })
    })

    test("totalCards is 0 for a collection with no decks", async () => {
      await withTx(async (db) => {
        const user = await seedUser(db, {})
        const source = await seedLanguage(db, "en")
        const target = await seedLanguage(db, "es")
        const collection = await seedCollection(db, {
          creatorId: user.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "empty-coll",
        })
        mockClerk({ clerkId: user.clerkId })

        const res = await callRoute(listMyCollections, { method: "GET" })
        expect(res.status).toBe(200)
        const items = res.data as Array<{ id: string; totalCards: number }>
        const found = items.find((c) => c.id === collection.id)
        expect(found?.totalCards).toBe(0)
      })
    })
  })
})
