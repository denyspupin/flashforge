import { afterAll, beforeAll, describe, expect, test } from "vitest"
import { eq } from "drizzle-orm"
import { setupTestPool, teardownTestPool, withTx } from "../../setup/db"
import { mockClerk, clearClerk } from "../../setup/clerk"
import { callRoute } from "../../setup/route-call"
import { seedLanguage, seedUser } from "../../setup/fixtures"
import type { TestDb } from "../../setup/db"
import * as schema from "@/lib/db/schema"
import {
  POST as createDeckShare,
  DELETE as deleteDeckShare,
} from "@/app/api/v1/decks/[id]/share/route"
import { GET as getCommunityDeck } from "@/app/api/v1/community/decks/[id]/route"
import { POST as forkDeck } from "@/app/api/v1/decks/[id]/fork/route"
import { POST as startStudy } from "@/app/api/v1/study/route"
import {
  POST as createCollectionShare,
  DELETE as deleteCollectionShare,
} from "@/app/api/v1/collections/[id]/share/route"
import { GET as getCommunityCollection } from "@/app/api/v1/community/collections/[id]/route"
import { POST as forkCollection } from "@/app/api/v1/collections/[id]/fork/route"

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

async function makeCollection(
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
  const [collection] = await db
    .insert(schema.collections)
    .values({
      title: overrides.title ?? "Collection",
      slug: overrides.slug ?? "collection",
      visibility: overrides.visibility ?? "private",
      creatorId: overrides.creatorId,
      sourceLanguageId: overrides.sourceLanguageId,
      targetLanguageId: overrides.targetLanguageId,
    })
    .returning()
  return collection
}

async function seededPair(db: TestDb) {
  const user = await seedUser(db, {})
  const source = await seedLanguage(db, "en")
  const target = await seedLanguage(db, "es")
  return { user, source, target }
}

describe("share links", () => {
  beforeAll(async () => {
    await setupTestPool()
  })
  afterAll(async () => {
    await teardownTestPool()
  })

  describe("deck share links", () => {
    test("owner creates a share token that stays stable on repeat", async () => {
      await withTx(async (db) => {
        const { user, source, target } = await seededPair(db)
        const deck = await makeDeck(db, {
          creatorId: user.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "share-deck-1",
        })
        mockClerk({ clerkId: user.clerkId })

        const first = await callRoute<{ shareToken: string }>(createDeckShare, {
          method: "POST",
          params: { id: deck.id },
        })
        expect(first.status).toBe(200)
        expect(first.data?.shareToken).toMatch(/[A-Za-z0-9_-]+/)

        const second = await callRoute<{ shareToken: string }>(createDeckShare, {
          method: "POST",
          params: { id: deck.id },
        })
        expect(second.data?.shareToken).toBe(first.data?.shareToken)
      })
    })

    test("non-owner cannot create or revoke a share link", async () => {
      await withTx(async (db) => {
        const { user, source, target } = await seededPair(db)
        const strangerUser = await seedUser(db, {})
        const deck = await makeDeck(db, {
          creatorId: user.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "share-deck-2",
        })
        mockClerk({ clerkId: strangerUser.clerkId })

        const created = await callRoute(createDeckShare, {
          method: "POST",
          params: { id: deck.id },
        })
        expect(created.status).toBe(404)

        const revoked = await callRoute(deleteDeckShare, {
          method: "DELETE",
          params: { id: deck.id },
        })
        expect(revoked.status).toBe(404)
      })
    })

    test("grant access to private deck by token in community API", async () => {
      await withTx(async (db) => {
        const { user, source, target } = await seededPair(db)
        const deck = await makeDeck(db, {
          creatorId: user.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "share-deck-3",
        })
        mockClerk({ clerkId: user.clerkId })

        const share = await callRoute<{ shareToken: string }>(createDeckShare, {
          method: "POST",
          params: { id: deck.id },
        })
        const token = share.data?.shareToken
        expect(token).toBeTruthy()

        const byToken = await callRoute(getCommunityDeck, {
          method: "GET",
          params: { id: deck.id },
          searchParams: { share: token ?? "" },
        })
        expect(byToken.status).toBe(200)
        expect(byToken.data).toMatchObject({ visibility: "private" })
        expect(byToken.data).not.toHaveProperty("shareToken")

        const withoutShare = await callRoute(getCommunityDeck, {
          method: "GET",
          params: { id: deck.id },
        })
        expect(withoutShare.status).toBe(404)

        const wrongToken = await callRoute(getCommunityDeck, {
          method: "GET",
          params: { id: deck.id },
          searchParams: { share: "not-the-real-token" },
        })
        expect(wrongToken.status).toBe(404)
      })
    })

    test("guest can open a shared deck link but nothing else", async () => {
      await withTx(async (db) => {
        const { user, source, target } = await seededPair(db)
        const privateDeck = await makeDeck(db, {
          creatorId: user.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "share-deck-guest-private",
        })
        const publicDeck = await makeDeck(db, {
          creatorId: user.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          visibility: "public",
          slug: "share-deck-guest-public",
        })
        mockClerk({ clerkId: user.clerkId })
        const share = await callRoute<{ shareToken: string }>(createDeckShare, {
          method: "POST",
          params: { id: privateDeck.id },
        })
        const token = share.data?.shareToken ?? ""

        clearClerk()
        const byToken = await callRoute(getCommunityDeck, {
          method: "GET",
          params: { id: privateDeck.id },
          searchParams: { share: token },
        })
        expect(byToken.status).toBe(200)
        expect(byToken.data).toMatchObject({ visibility: "private" })

        const privateNoToken = await callRoute(getCommunityDeck, {
          method: "GET",
          params: { id: privateDeck.id },
        })
        expect(privateNoToken.status).toBe(401)

        const publicNoToken = await callRoute(getCommunityDeck, {
          method: "GET",
          params: { id: publicDeck.id },
        })
        expect(publicNoToken.status).toBe(401)

        const malformedToken = await callRoute(getCommunityDeck, {
          method: "GET",
          params: { id: publicDeck.id },
          searchParams: { share: "not!a@token#" },
        })
        expect(malformedToken.status).toBe(401)
      })
    })

    test("revoked token stops granting access", async () => {
      await withTx(async (db) => {
        const { user, source, target } = await seededPair(db)
        const deck = await makeDeck(db, {
          creatorId: user.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "share-deck-4",
        })
        mockClerk({ clerkId: user.clerkId })

        const share = await callRoute<{ shareToken: string }>(createDeckShare, {
          method: "POST",
          params: { id: deck.id },
        })
        const token = share.data?.shareToken ?? ""

        await callRoute(deleteDeckShare, {
          method: "DELETE",
          params: { id: deck.id },
        })

        const afterRevoke = await callRoute(getCommunityDeck, {
          method: "GET",
          params: { id: deck.id },
          searchParams: { share: token },
        })
        expect(afterRevoke.status).toBe(404)
      })
    })

    test("fork works for signed-in visitor with a valid token", async () => {
      await withTx(async (db) => {
        const { user, source, target } = await seededPair(db)
        const strangerUser = await seedUser(db, {})
        const deck = await makeDeck(db, {
          creatorId: user.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "share-deck-5",
        })
        mockClerk({ clerkId: user.clerkId })
        const share = await callRoute<{ shareToken: string }>(createDeckShare, {
          method: "POST",
          params: { id: deck.id },
        })

        mockClerk({ clerkId: strangerUser.clerkId })
        const forked = await callRoute<{ id: string; shareToken: string | null }>(
          forkDeck,
          {
            method: "POST",
            params: { id: deck.id },
            searchParams: { share: share.data?.shareToken ?? "" },
          },
        )
        expect(forked.status).toBe(200)
        expect(forked.data?.id).not.toBe(deck.id)

        const denied = await callRoute(forkDeck, {
          method: "POST",
          params: { id: deck.id },
        })
        expect(denied.status).toBe(404)
      })
    })

    test("study accepts share token for signed-in visitor", async () => {
      await withTx(async (db) => {
        const { user, source, target } = await seededPair(db)
        const strangerUser = await seedUser(db, {})
        const deck = await makeDeck(db, {
          creatorId: user.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "share-deck-6",
        })
        mockClerk({ clerkId: user.clerkId })
        const share = await callRoute<{ shareToken: string }>(createDeckShare, {
          method: "POST",
          params: { id: deck.id },
        })

        mockClerk({ clerkId: strangerUser.clerkId })
        const allowed = await callRoute(startStudy, {
          method: "POST",
          body: { deck_id: deck.id, share: share.data?.shareToken },
        })
        expect(allowed.status).toBe(200)
        expect(allowed.data?.deck).not.toHaveProperty("shareToken")

        const denied = await callRoute(startStudy, {
          method: "POST",
          body: { deck_id: deck.id },
        })
        expect(denied.status).toBe(404)
      })
    })
  })

  describe("collection share links", () => {
    test("grant access to private collection by token, revocable", async () => {
      await withTx(async (db) => {
        const { user, source, target } = await seededPair(db)
        const collection = await makeCollection(db, {
          creatorId: user.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "share-collection-1",
        })
        const deck = await makeDeck(db, {
          creatorId: user.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "share-collection-1-deck",
        })
        await db
          .insert(schema.collectionDecks)
          .values({ collectionId: collection.id, deckId: deck.id, position: 0 })
        mockClerk({ clerkId: user.clerkId })

        const share = await callRoute<{ shareToken: string }>(
          createCollectionShare,
          {
            method: "POST",
            params: { id: collection.id },
          },
        )
        const token = share.data?.shareToken ?? ""

        const byToken = await callRoute(getCommunityCollection, {
          method: "GET",
          params: { id: collection.id },
          searchParams: { share: token },
        })
        expect(byToken.status).toBe(200)
        expect(byToken.data).toMatchObject({
          visibility: "private",
          deckCount: 1,
        })
        expect(byToken.data).not.toHaveProperty("shareToken")

        const denied = await callRoute(getCommunityCollection, {
          method: "GET",
          params: { id: collection.id },
          searchParams: { share: "not-the-real-token" },
        })
        expect(denied.status).toBe(404)

        await callRoute(deleteCollectionShare, {
          method: "DELETE",
          params: { id: collection.id },
        })

        const afterRevoke = await callRoute(getCommunityCollection, {
          method: "GET",
          params: { id: collection.id },
          searchParams: { share: token },
        })
        expect(afterRevoke.status).toBe(404)
      })
    })

    test("guest can open a shared collection link with valid token, 401 without", async () => {
      await withTx(async (db) => {
        const { user, source, target } = await seededPair(db)
        const collection = await makeCollection(db, {
          creatorId: user.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "share-collection-guest",
        })
        mockClerk({ clerkId: user.clerkId })
        const share = await callRoute<{ shareToken: string }>(
          createCollectionShare,
          {
            method: "POST",
            params: { id: collection.id },
          },
        )
        const token = share.data?.shareToken ?? ""

        clearClerk()
        const byToken = await callRoute(getCommunityCollection, {
          method: "GET",
          params: { id: collection.id },
          searchParams: { share: token },
        })
        expect(byToken.status).toBe(200)

        const withoutToken = await callRoute(getCommunityCollection, {
          method: "GET",
          params: { id: collection.id },
        })
        expect(withoutToken.status).toBe(401)
      })
    })

    test("non-owner cannot create a collection share link", async () => {
      await withTx(async (db) => {
        const { user, source, target } = await seededPair(db)
        const strangerUser = await seedUser(db, {})
        const collection = await makeCollection(db, {
          creatorId: user.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "share-collection-2",
        })
        mockClerk({ clerkId: strangerUser.clerkId })

        const created = await callRoute(createCollectionShare, {
          method: "POST",
          params: { id: collection.id },
        })
        expect(created.status).toBe(404)
      })
    })

    test("collection fork stays public-only", async () => {
      await withTx(async (db) => {
        const { user, source, target } = await seededPair(db)
        const strangerUser = await seedUser(db, {})
        const collection = await makeCollection(db, {
          creatorId: user.id,
          sourceLanguageId: source.id,
          targetLanguageId: target.id,
          slug: "share-collection-3",
        })
        mockClerk({ clerkId: user.clerkId })
        const share = await callRoute<{ shareToken: string }>(
          createCollectionShare,
          {
            method: "POST",
            params: { id: collection.id },
          },
        )

        mockClerk({ clerkId: strangerUser.clerkId })
        const forked = await callRoute(forkCollection, {
          method: "POST",
          params: { id: collection.id },
          searchParams: { share: share.data?.shareToken ?? "" },
        })
        expect(forked.status).toBe(404)
      })
    })
  })
})
