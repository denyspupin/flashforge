import { afterAll, beforeAll, describe, expect, test } from "vitest"
import { setupTestPool, teardownTestPool, withTx } from "../../setup/db"
import { mockClerk } from "../../setup/clerk"
import { uniqueSlug } from "@/lib/slug"
import { seedDeck, seedLanguage, seedUser } from "../../setup/fixtures"

describe("uniqueSlug", () => {
  beforeAll(async () => {
    await setupTestPool()
  })
  afterAll(async () => {
    await teardownTestPool()
  })

  test("returns `${base}-copy` when no collision", async () => {
    await withTx(async (db) => {
      const user = await seedUser(db, {})
      const source = await seedLanguage(db, "en")
      const target = await seedLanguage(db, "es")
      const deck = await seedDeck(db, {
        title: "Food",
        slug: "food",
        creatorId: user.id,
        sourceLanguageId: source.id,
        targetLanguageId: target.id,
      })
      expect(deck.slug).toBe("food")

      mockClerk({ clerkId: user.clerkId })
      const slug = await uniqueSlug("food")
      expect(slug).toBe("food-copy")
    })
  })

  test("increments suffix on collision (food-copy-2, food-copy-3)", async () => {
    await withTx(async (db) => {
      const user = await seedUser(db, {})
      const source = await seedLanguage(db, "en")
      const target = await seedLanguage(db, "es")
      await seedDeck(db, {
        title: "Food",
        slug: "food-copy",
        creatorId: user.id,
        sourceLanguageId: source.id,
        targetLanguageId: target.id,
      })
      await seedDeck(db, {
        title: "Food",
        slug: "food-copy-2",
        creatorId: user.id,
        sourceLanguageId: source.id,
        targetLanguageId: target.id,
      })

      mockClerk({ clerkId: user.clerkId })
      const slug = await uniqueSlug("food")
      expect(slug).toBe("food-copy-3")
    })
  })

  test("does not collide with unrelated slugs", async () => {
    await withTx(async (db) => {
      const user = await seedUser(db, {})
      const source = await seedLanguage(db, "en")
      const target = await seedLanguage(db, "es")
      await seedDeck(db, {
        title: "Travel",
        slug: "travel-copy",
        creatorId: user.id,
        sourceLanguageId: source.id,
        targetLanguageId: target.id,
      })
      await seedDeck(db, {
        title: "Food",
        slug: "food-2",
        creatorId: user.id,
        sourceLanguageId: source.id,
        targetLanguageId: target.id,
      })

      mockClerk({ clerkId: user.clerkId })
      expect(await uniqueSlug("food")).toBe("food-copy")
    })
  })

  test("handles empty base by slugifying to empty", async () => {
    await withTx(async (db) => {
      const user = await seedUser(db, {})
      mockClerk({ clerkId: user.clerkId })
      const slug = await uniqueSlug("")
      expect(slug).toBe("-copy")
    })
  })
})
