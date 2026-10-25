import { afterAll, beforeAll, describe, expect, test } from "vitest"
import { eq, sql } from "drizzle-orm"
import { setupTestPool, teardownTestPool, withTx } from "../../setup/db"
import { clearClerk, mockClerk } from "../../setup/clerk"
import { callRoute } from "../../setup/route-call"
import {
  seedCard,
  seedCollection,
  seedCollectionDecks,
  seedDeck,
  seedDeckTopics,
  seedLanguage,
  seedTopic,
  seedUser,
} from "../../setup/fixtures"
import * as schema from "@/lib/db/schema"
import { GET as exportCollection } from "@/app/api/v1/collections/[id]/export/route"
import { POST as importCollection } from "@/app/api/v1/collections/import/route"
import { COLLECTION_EXPORT } from "@/lib/constants"
import { collectionImportPayloadSchema } from "@/lib/export-schema"
import type { CollectionImportPayload } from "@/lib/export-schema"

const CLEANUP_SQL = sql`TRUNCATE collections, collection_decks, decks, deck_topics, cards, topics, languages, users RESTART IDENTITY CASCADE`

describe("collections / export", () => {
  beforeAll(async () => {
    await setupTestPool()
  })
  afterAll(async () => {
    await teardownTestPool()
  })

  test("GET export produces a payload matching the import shape", async () => {
    await withTx(async (db) => {
      const user = await seedUser(db, {})
      const source = await seedLanguage(db, "en")
      const target = await seedLanguage(db, "es")
      const topic = await seedTopic(db, "travel")
      const deckA = await seedDeck(db, {
        title: "Airport",
        description: "At the airport",
        creatorId: user.id,
        sourceLanguageId: source.id,
        targetLanguageId: target.id,
      })
      const deckB = await seedDeck(db, {
        title: "Hotel",
        creatorId: user.id,
        sourceLanguageId: source.id,
        targetLanguageId: target.id,
      })
      await seedDeckTopics(db, deckA.id, [topic.id])
      await seedCard(db, deckA.id, { front: "gate", back: "puerta" })
      await seedCard(db, deckB.id, { front: "key", back: "llave" })
      const collection = await seedCollection(db, {
        title: "Travel Pack",
        description: "For trips",
        creatorId: user.id,
        sourceLanguageId: source.id,
        targetLanguageId: target.id,
      })
      await seedCollectionDecks(db, collection.id, [deckA.id, deckB.id])

      mockClerk({ clerkId: user.clerkId })
      const res = await callRoute(exportCollection, {
        method: "GET",
        params: { id: collection.id },
      })
      expect(res.status).toBe(200)

      const payload = (await res.raw.json()) as CollectionImportPayload
      expect(
        collectionImportPayloadSchema.safeParse(payload).success
      ).toBe(true)
      expect(payload.format).toBe(COLLECTION_EXPORT.FORMAT)
      expect(payload.collection.title).toBe("Travel Pack")
      expect(payload.collection.sourceLanguage).toBe("en")
      expect(payload.collection.targetLanguage).toBe("es")
      expect(payload.decks).toHaveLength(2)
      expect(payload.decks[0].title).toBe("Airport")
      expect(payload.decks[0].topics).toEqual(["travel"])
      expect(payload.decks[0].cards).toEqual([
        { front: "gate", back: "puerta" },
      ])
      expect(payload.decks[1].title).toBe("Hotel")
      expect(payload.decks[1].cards).toEqual([{ front: "key", back: "llave" }])

      const contentDisposition = res.raw.headers.get("content-disposition")
      expect(contentDisposition).toContain("attachment")

      await db.execute(CLEANUP_SQL)
    })
  })

  test("export round-trips through import", async () => {
    await withTx(async (db) => {
      const owner = await seedUser(db, {})
      const importer = await seedUser(db, {})
      const source = await seedLanguage(db, "en")
      const target = await seedLanguage(db, "es")
      const deck = await seedDeck(db, {
        title: "Airport",
        creatorId: owner.id,
        sourceLanguageId: source.id,
        targetLanguageId: target.id,
      })
      await seedCard(db, deck.id, { front: "gate", back: "puerta" })
      const collection = await seedCollection(db, {
        title: "Travel Pack",
        creatorId: owner.id,
        sourceLanguageId: source.id,
        targetLanguageId: target.id,
      })
      await seedCollectionDecks(db, collection.id, [deck.id])

      mockClerk({ clerkId: owner.clerkId })
      const exported = await callRoute(exportCollection, {
        method: "GET",
        params: { id: collection.id },
      })
      expect(exported.status).toBe(200)
      const payload = (await exported.raw.json()) as CollectionImportPayload

      mockClerk({ clerkId: importer.clerkId })
      const imported = await callRoute(importCollection, {
        method: "POST",
        body: { payload },
      })
      expect(imported.status).toBe(200)
      expect(imported.data).toMatchObject({ decksCreated: 1, cardsCreated: 1 })

      const importedDecks = await db
        .select()
        .from(schema.decks)
        .where(eq(schema.decks.creatorId, importer.id))
      expect(importedDecks).toHaveLength(1)
      expect(importedDecks[0].title).toBe("Airport")

      await db.execute(CLEANUP_SQL)
    })
  })

  test("unauthenticated request returns 401", async () => {
    clearClerk()
    const res = await callRoute(exportCollection, {
      method: "GET",
      params: { id: "00000000-0000-0000-0000-000000000000" },
    })
    expect(res.status).toBe(401)
  })

  test("non-owner cannot export", async () => {
    await withTx(async (db) => {
      const owner = await seedUser(db, {})
      const stranger = await seedUser(db, {})
      const source = await seedLanguage(db, "en")
      const target = await seedLanguage(db, "es")
      const collection = await seedCollection(db, {
        creatorId: owner.id,
        sourceLanguageId: source.id,
        targetLanguageId: target.id,
      })

      mockClerk({ clerkId: stranger.clerkId })
      const res = await callRoute(exportCollection, {
        method: "GET",
        params: { id: collection.id },
      })
      expect(res.status).toBe(404)

      await db.execute(CLEANUP_SQL)
    })
  })
})
