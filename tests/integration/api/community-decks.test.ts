import { afterAll, beforeAll, describe, expect, test } from "vitest"
import { eq } from "drizzle-orm"
import { setupTestPool, teardownTestPool, withTx } from "../../setup/db"
import { clearClerk } from "../../setup/clerk"
import { callRoute } from "../../setup/route-call"
import { seedCards, seedLanguage, seedUser } from "../../setup/fixtures"
import type { TestDb } from "../../setup/db"
import * as schema from "@/lib/db/schema"
import { GET as listCommunity } from "@/app/api/v1/community/decks/route"

async function makePublicDeck(
  db: TestDb,
  overrides: {
    creatorId: string
    sourceLanguageId: string
    targetLanguageId: string
    title: string
    slug?: string
    visibility?: "private" | "public"
  },
) {
  const [deck] = await db
    .insert(schema.decks)
    .values({
      title: overrides.title,
      slug: overrides.slug ?? overrides.title.toLowerCase().replace(/\s+/g, "-"),
      creatorId: overrides.creatorId,
      sourceLanguageId: overrides.sourceLanguageId,
      targetLanguageId: overrides.targetLanguageId,
      visibility: overrides.visibility ?? "public",
    })
    .returning()
  return deck
}

describe("community feed", () => {
  beforeAll(async () => {
    await setupTestPool()
  })
  afterAll(async () => {
    await teardownTestPool()
  })

  test("returns only public decks, not private ones", async () => {
    await withTx(async (db) => {
      const user = await seedUser(db, {})
      const source = await seedLanguage(db, "en")
      const target = await seedLanguage(db, "es")
      const publicDeck = await makePublicDeck(db, {
        creatorId: user.id,
        sourceLanguageId: source.id,
        targetLanguageId: target.id,
        title: "Public",
        slug: "public",
      })
      await makePublicDeck(db, {
        creatorId: user.id,
        sourceLanguageId: source.id,
        targetLanguageId: target.id,
        title: "Hidden",
        slug: "hidden",
        visibility: "private",
      })

      clearClerk()
      const res = await callRoute(listCommunity, { method: "GET" })
      expect(res.status).toBe(200)
      const items = res.data as Array<{ id: string }>
      expect(items).toHaveLength(1)
      expect(items[0].id).toBe(publicDeck.id)
    })
  })

  test("q is a case-insensitive substring match on title", async () => {
    await withTx(async (db) => {
      const user = await seedUser(db, {})
      const source = await seedLanguage(db, "en")
      const target = await seedLanguage(db, "es")
      await makePublicDeck(db, {
        creatorId: user.id,
        sourceLanguageId: source.id,
        targetLanguageId: target.id,
        title: "Travel Phrases",
        slug: "travel-phrases-q",
      })
      await makePublicDeck(db, {
        creatorId: user.id,
        sourceLanguageId: source.id,
        targetLanguageId: target.id,
        title: "Food Vocabulary",
        slug: "food-vocab-q",
      })

      clearClerk()
      const res = await callRoute(listCommunity, {
        method: "GET",
        searchParams: { q: "TRAVEL" },
      })
      const items = res.data as Array<{ title: string }>
      expect(items).toHaveLength(1)
      expect(items[0].title).toBe("Travel Phrases")
    })
  })

  test("topicId filter inner-joins to deckTopics", async () => {
    await withTx(async (db) => {
      const user = await seedUser(db, {})
      const source = await seedLanguage(db, "en")
      const target = await seedLanguage(db, "es")
      const travel = await db
        .insert(schema.topics)
        .values({ slug: "travel", name: "Travel" })
        .returning()
      const food = await db
        .insert(schema.topics)
        .values({ slug: "food", name: "Food" })
        .returning()
      const travelDeck = await makePublicDeck(db, {
        creatorId: user.id,
        sourceLanguageId: source.id,
        targetLanguageId: target.id,
        title: "Travel",
        slug: "topic-travel",
      })
      await makePublicDeck(db, {
        creatorId: user.id,
        sourceLanguageId: source.id,
        targetLanguageId: target.id,
        title: "Food",
        slug: "topic-food",
      })
      await db.insert(schema.deckTopics).values({ deckId: travelDeck.id, topicId: travel[0].id })
      await db.insert(schema.deckTopics).values({ deckId: travelDeck.id, topicId: food[0].id })

      clearClerk()
      const res = await callRoute(listCommunity, {
        method: "GET",
        searchParams: { topicId: food[0].id },
      })
      const items = res.data as Array<{ id: string; topics: { slug: string }[] }>
      expect(items).toHaveLength(1)
      expect(items[0].id).toBe(travelDeck.id)
      expect(items[0].topics.map((t) => t.slug)).toEqual(expect.arrayContaining(["food", "travel"]))
    })
  })

  test("sort=oldest reverses the default newest order", async () => {
    await withTx(async (db) => {
      const user = await seedUser(db, {})
      const source = await seedLanguage(db, "en")
      const target = await seedLanguage(db, "es")
      const first = await makePublicDeck(db, {
        creatorId: user.id,
        sourceLanguageId: source.id,
        targetLanguageId: target.id,
        title: "First",
        slug: "sort-first",
      })
      await new Promise((r) => setTimeout(r, 5))
      const second = await makePublicDeck(db, {
        creatorId: user.id,
        sourceLanguageId: source.id,
        targetLanguageId: target.id,
        title: "Second",
        slug: "sort-second",
      })
      await db.update(schema.decks).set({ createdAt: new Date(Date.now() - 1000) }).where(eq(schema.decks.id, first.id))
      await db.update(schema.decks).set({ createdAt: new Date() }).where(eq(schema.decks.id, second.id))

      clearClerk()
      const newest = await callRoute(listCommunity, { method: "GET" })
      const newestIds = (newest.data as Array<{ id: string }>).map((d) => d.id)
      expect(newestIds).toEqual([second.id, first.id])

      const oldest = await callRoute(listCommunity, {
        method: "GET",
        searchParams: { sort: "oldest" },
      })
      const oldestIds = (oldest.data as Array<{ id: string }>).map((d) => d.id)
      expect(oldestIds).toEqual([first.id, second.id])
    })
  })

  test("cardCount reflects the actual number of cards", async () => {
    await withTx(async (db) => {
      const user = await seedUser(db, {})
      const source = await seedLanguage(db, "en")
      const tgt = await seedLanguage(db, "es")
      const deck = await makePublicDeck(db, {
        creatorId: user.id,
        sourceLanguageId: source.id,
        targetLanguageId: tgt.id,
        title: "Counted",
        slug: "card-count",
      })
      await seedCards(db, deck.id, 4)

      clearClerk()
      const res = await callRoute(listCommunity, { method: "GET" })
      const items = res.data as Array<{ id: string; cardCount: number }>
      const counted = items.find((d) => d.id === deck.id)
      expect(counted?.cardCount).toBe(4)
    })
  })
})
