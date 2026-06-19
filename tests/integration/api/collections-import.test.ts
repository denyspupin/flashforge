import { afterAll, beforeAll, describe, expect, test } from "vitest"
import { eq, inArray, sql } from "drizzle-orm"
import { setupTestPool, teardownTestPool, withTx } from "../../setup/db"
import { mockClerk } from "../../setup/clerk"
import { callRoute } from "../../setup/route-call"
import { seedLanguage, seedUser } from "../../setup/fixtures"
import * as schema from "@/lib/db/schema"
import { POST as importCollection } from "@/app/api/v1/collections/import/route"
import { COLLECTION_EXPORT } from "@/lib/constants"
import type { CollectionImportPayload } from "@/lib/export-schema"

const CLEANUP_SQL = sql`TRUNCATE collections, collection_decks, decks, deck_topics, cards, topics, languages, users RESTART IDENTITY CASCADE`

describe("collections / import", () => {
  beforeAll(async () => {
    await setupTestPool()
  })
  afterAll(async () => {
    await teardownTestPool()
  })

  test("auto-creates missing topics and attaches them to each deck", async () => {
    await withTx(async (db) => {
      const user = await seedUser(db, {})
      const source = await seedLanguage(db, "en")
      const target = await seedLanguage(db, "es")
      mockClerk({ clerkId: user.clerkId })

      const payload: CollectionImportPayload = {
        format: COLLECTION_EXPORT.FORMAT,
        formatVersion: COLLECTION_EXPORT.FORMAT_VERSION,
        collection: {
          title: "Travel Pack",
          description: "For trips",
          sourceLanguage: "en",
          targetLanguage: "es",
        },
        decks: [
          {
            title: "Airport",
            description: null,
            topics: ["travel", "airport"],
            cards: [{ front: "gate", back: "puerta" }],
          },
          {
            title: "Hotel",
            description: null,
            topics: ["travel", "hotel"],
            cards: [{ front: "key", back: "llave" }],
          },
        ],
      }

      const res = await callRoute(importCollection, {
        method: "POST",
        body: { payload },
      })
      expect(res.status).toBe(200)
      expect(res.data).toMatchObject({ decksCreated: 2, cardsCreated: 2 })

      const createdTopics = await db
        .select({ slug: schema.topics.slug, name: schema.topics.name })
        .from(schema.topics)
        .where(inArray(schema.topics.slug, ["travel", "airport", "hotel"]))
      expect(createdTopics.map((t) => t.slug).sort()).toEqual([
        "airport",
        "hotel",
        "travel",
      ])
      expect(createdTopics.every((t) => t.name === t.slug)).toBe(true)

      const decks = await db
        .select({ id: schema.decks.id, title: schema.decks.title })
        .from(schema.decks)
        .where(eq(schema.decks.creatorId, user.id))

      for (const deck of decks) {
        const deckTopicRows = await db
          .select({ topicId: schema.deckTopics.topicId })
          .from(schema.deckTopics)
          .where(eq(schema.deckTopics.deckId, deck.id))
        expect(deckTopicRows).toHaveLength(2)
      }

      await db.execute(CLEANUP_SQL)
    })
  })
})
