import { afterAll, beforeAll, describe, expect, test } from "vitest"
import { eq } from "drizzle-orm"
import { setupTestPool, teardownTestPool, withTx } from "../../setup/db"
import { mockClerk } from "../../setup/clerk"
import { callRoute } from "../../setup/route-call"
import { seedCards, seedLanguage, seedUser } from "../../setup/fixtures"
import type { TestDb } from "../../setup/db"
import * as schema from "@/lib/db/schema"
import { POST as publishDeck } from "@/app/api/v1/decks/[id]/publish/route"
import { POST as unpublishDeck } from "@/app/api/v1/decks/[id]/unpublish/route"
import { POST as forkDeck } from "@/app/api/v1/decks/[id]/fork/route"
import { GET as exportDeck } from "@/app/api/v1/decks/[id]/export/route"
import { POST as importDeck } from "@/app/api/v1/decks/import/route"
import { DECK_EXPORT } from "@/lib/constants"
import type { ImportPayload } from "@/lib/export-schema"

async function makeDeck(
  db: TestDb,
  overrides: {
    title?: string
    slug?: string
    visibility?: "private" | "public"
    creatorId: string
    sourceLanguageId: string
    targetLanguageId: string
  },
) {
  const [deck] = await db
    .insert(schema.decks)
    .values({
      title: overrides.title ?? "Deck",
      slug: overrides.slug ?? "deck",
      visibility: overrides.visibility ?? "private",
      creatorId: overrides.creatorId,
      sourceLanguageId: overrides.sourceLanguageId,
      targetLanguageId: overrides.targetLanguageId,
    })
    .returning()
  return deck
}

describe("publish / fork / import", () => {
  beforeAll(async () => {
    await setupTestPool()
  })
  afterAll(async () => {
    await teardownTestPool()
  })

  describe("publish", () => {
    test("flips visibility to public", async () => {
      await withTx(async (db) => {
        const user = await seedUser(db, {})
        const source = await seedLanguage(db, "en")
        const target = await seedLanguage(db, "es")
        const deck = await makeDeck(db, {
          creatorId: user.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "publish-1",
        })
        mockClerk({ clerkId: user.clerkId })

        const res = await callRoute(publishDeck, {
          method: "POST",
          params: { id: deck.id },
        })
        expect(res.status).toBe(200)
        expect(res.data).toMatchObject({ visibility: "public" })

        const stored = await db.select().from(schema.decks).where(eq(schema.decks.id, deck.id))
        expect(stored[0].visibility).toBe("public")
      })
    })

    test("non-owner publish returns 404", async () => {
      await withTx(async (db) => {
        const owner = await seedUser(db, {})
        const stranger = await seedUser(db, {})
        const source = await seedLanguage(db, "en")
        const target = await seedLanguage(db, "es")
        const deck = await makeDeck(db, {
          creatorId: owner.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "publish-2",
        })
        mockClerk({ clerkId: stranger.clerkId })

        const res = await callRoute(publishDeck, {
          method: "POST",
          params: { id: deck.id },
        })
        expect(res.status).toBe(404)
      })
    })

    test("unpublish flips visibility back to private", async () => {
      await withTx(async (db) => {
        const user = await seedUser(db, {})
        const source = await seedLanguage(db, "en")
        const target = await seedLanguage(db, "es")
        const deck = await makeDeck(db, {
          creatorId: user.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "publish-3",
          visibility: "public",
        })
        mockClerk({ clerkId: user.clerkId })

        const res = await callRoute(unpublishDeck, {
          method: "POST",
          params: { id: deck.id },
        })
        expect(res.status).toBe(200)
        expect(res.data).toMatchObject({ visibility: "private" })
      })
    })
  })

  describe("fork", () => {
    test("copies cards, derives unique slug, sends fork_received notification", async () => {
      await withTx(async (db) => {
        const author = await seedUser(db, {})
        const forker = await seedUser(db, {})
        const source = await seedLanguage(db, "en")
        const target = await seedLanguage(db, "es")
        const original = await makeDeck(db, {
          creatorId: author.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "forked-base",
          visibility: "public",
          title: "Forked",
        })
        await seedCards(db, original.id, 3)

        mockClerk({ clerkId: forker.clerkId })
        const res = await callRoute(forkDeck, {
          method: "POST",
          params: { id: original.id },
        })
        expect(res.status).toBe(200)
        expect(res.data).toMatchObject({
          title: "Forked",
          slug: "forked-base-copy",
          visibility: "private",
          creatorId: forker.id,
          forkedFromDeckId: original.id,
        })

        const newDeckId = res.data!.id
        const newCards = await db
          .select()
          .from(schema.cards)
          .where(eq(schema.cards.deckId, newDeckId))
        expect(newCards).toHaveLength(3)

        const notes = await db
          .select()
          .from(schema.notifications)
          .where(eq(schema.notifications.userId, author.id))
        expect(notes).toHaveLength(1)
        expect(notes[0].type).toBe("fork_received")
        expect(notes[0].data).toMatchObject({
          originalDeckId: original.id,
          deckId: newDeckId,
          deckTitle: "Forked",
        })
      })
    })

    test("forking own deck returns 409", async () => {
      await withTx(async (db) => {
        const user = await seedUser(db, {})
        const source = await seedLanguage(db, "en")
        const target = await seedLanguage(db, "es")
        const deck = await makeDeck(db, {
          creatorId: user.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "self-fork",
          visibility: "public",
        })
        mockClerk({ clerkId: user.clerkId })

        const res = await callRoute(forkDeck, {
          method: "POST",
          params: { id: deck.id },
        })
        expect(res.status).toBe(409)
      })
    })

    test("forking a private deck returns 404", async () => {
      await withTx(async (db) => {
        const owner = await seedUser(db, {})
        const stranger = await seedUser(db, {})
        const source = await seedLanguage(db, "en")
        const target = await seedLanguage(db, "es")
        const deck = await makeDeck(db, {
          creatorId: owner.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "private-fork",
          visibility: "private",
        })
        mockClerk({ clerkId: stranger.clerkId })

        const res = await callRoute(forkDeck, {
          method: "POST",
          params: { id: deck.id },
        })
        expect(res.status).toBe(404)
      })
    })
  })

  describe("import round-trip", () => {
    async function exportOwnedDeck(db: TestDb, userClerkId: string, deckId: string) {
      mockClerk({ clerkId: userClerkId })
      const res = await callRoute(exportDeck, {
        method: "GET",
        params: { id: deckId },
      })
      expect(res.status).toBe(200)
      return (await res.raw.json()) as ImportPayload
    }

    test("GET export produces a valid payload, POST import mode=existing appends cards", async () => {
      await withTx(async (db) => {
        const owner = await seedUser(db, {})
        const importer = await seedUser(db, {})
        const source = await seedLanguage(db, "en")
        const target = await seedLanguage(db, "es")
        const targetDeck = await makeDeck(db, {
          creatorId: importer.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "importer-target",
        })
        const sourceDeck = await makeDeck(db, {
          creatorId: owner.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "export-source",
          title: "Source Deck",
        })
        await seedCards(db, sourceDeck.id, 2)

        const payload = await exportOwnedDeck(db, owner.clerkId, sourceDeck.id)
        expect(payload.format).toBe(DECK_EXPORT.FORMAT)
        expect(payload.deck.sourceLanguage).toBe("en")
        expect(payload.cards).toHaveLength(2)

        mockClerk({ clerkId: importer.clerkId })
        const res = await callRoute(importDeck, {
          method: "POST",
          body: {
            payload,
            target: { mode: "existing", deckId: targetDeck.id },
          },
        })
        expect(res.status).toBe(200)
        expect(res.data).toMatchObject({ mode: "existing", cardsCreated: 2 })

        const cardsInTarget = await db
          .select()
          .from(schema.cards)
          .where(eq(schema.cards.deckId, targetDeck.id))
        expect(cardsInTarget).toHaveLength(2)
      })
    })

    test("mode=new creates a new deck with a unique slug", async () => {
      await withTx(async (db) => {
        const owner = await seedUser(db, {})
        const importer = await seedUser(db, {})
        const source = await seedLanguage(db, "en")
        const target = await seedLanguage(db, "es")
        const sourceDeck = await makeDeck(db, {
          creatorId: owner.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "export-2",
          title: "Travel Pack",
        })
        await seedCards(db, sourceDeck.id, 1)
        await db.insert(schema.decks).values({
          title: "Travel Pack",
          slug: "travel-pack",
          creatorId: importer.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
        })

        const payload = await exportOwnedDeck(db, owner.clerkId, sourceDeck.id)
        mockClerk({ clerkId: importer.clerkId })

        const res = await callRoute(importDeck, {
          method: "POST",
          body: { payload, target: { mode: "new" } },
        })
        expect(res.status).toBe(200)
        expect(res.data).toMatchObject({ mode: "new", cardsCreated: 1 })

        const newDeck = await db
          .select()
          .from(schema.decks)
          .where(eq(schema.decks.id, res.data!.deckId))
        expect(newDeck[0].slug).toBe("travel-pack-copy")
        expect(newDeck[0].creatorId).toBe(importer.id)
      })
    })

    test("mismatched language pair on existing target returns 400", async () => {
      await withTx(async (db) => {
        const owner = await seedUser(db, {})
        const importer = await seedUser(db, {})
        const en = await seedLanguage(db, "en")
        const es = await seedLanguage(db, "es")
        const de = await seedLanguage(db, "de")
        const sourceDeck = await makeDeck(db, {
          creatorId: owner.id,
          sourceLanguageId: en.id,
          targetLanguageId: es.id,
          slug: "lang-mismatch-source",
        })
        await seedCards(db, sourceDeck.id, 1)
        const targetDeck = await makeDeck(db, {
          creatorId: importer.id,
          sourceLanguageId: en.id,
          targetLanguageId: de.id,
          slug: "lang-mismatch-target",
        })

        const payload = await exportOwnedDeck(db, owner.clerkId, sourceDeck.id)
        mockClerk({ clerkId: importer.clerkId })

        const res = await callRoute(importDeck, {
          method: "POST",
          body: {
            payload,
            target: { mode: "existing", deckId: targetDeck.id },
          },
        })
        expect(res.status).toBe(400)
        expect(res.error?.code).toBe("VALIDATION_ERROR")
      })
    })

    test("importing more than MAX_IMPORT_CARDS cards returns 400", async () => {
      await withTx(async (db) => {
        const user = await seedUser(db, {})
        const source = await seedLanguage(db, "en")
        const target = await seedLanguage(db, "es")
        mockClerk({ clerkId: user.clerkId })

        const oversizedPayload: ImportPayload = {
          format: DECK_EXPORT.FORMAT,
          formatVersion: DECK_EXPORT.FORMAT_VERSION,
          deck: {
            title: "Too Many",
            sourceLanguage: "en",
            targetLanguage: "es",
            topics: [],
          },
          cards: Array.from({ length: DECK_EXPORT.MAX_IMPORT_CARDS + 1 }, (_, i) => ({
            front: `f${i}`,
            back: `b${i}`,
          })),
        }
        const res = await callRoute(importDeck, {
          method: "POST",
          body: { payload: oversizedPayload, target: { mode: "new" } },
        })
        expect(res.status).toBe(400)
      })
    })
  })
})
