import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import {
  cards,
  collectionDecks,
  collections,
  decks,
  deckTopics,
  notifications,
} from "@/lib/db/schema"
import { eq, and, asc, inArray } from "drizzle-orm"
import { successResponse, errorResponse } from "@/lib/api/response"
import { requireCurrentUser } from "@/lib/auth/user"
import { getActiveLanguageIds } from "@/lib/languages/valid"
import { uniqueCollectionSlug, uniqueSlug } from "@/lib/slug"

export const dynamic = "force-dynamic"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await requireCurrentUser()

  if (!user) {
    return NextResponse.json(
      errorResponse("Authentication required", "UNAUTHORIZED"),
      { status: 401 }
    )
  }

  const originalCollectionRows = await db
    .select()
    .from(collections)
    .where(and(eq(collections.id, id), eq(collections.visibility, "public")))

  if (!originalCollectionRows.length) {
    return NextResponse.json(
      errorResponse("Collection not found or not public", "NOT_FOUND"),
      { status: 404 }
    )
  }

  const originalCollection = originalCollectionRows[0]

  if (originalCollection.creatorId === user.id) {
    return NextResponse.json(
      errorResponse("You already own this collection", "CONFLICT"),
      { status: 409 }
    )
  }

  const activeLanguages = await getActiveLanguageIds([
    originalCollection.sourceLanguageId,
    originalCollection.targetLanguageId,
  ])
  if (
    !activeLanguages.has(originalCollection.sourceLanguageId) ||
    !activeLanguages.has(originalCollection.targetLanguageId)
  ) {
    return NextResponse.json(
      errorResponse("This collection is no longer available", "CONFLICT"),
      { status: 409 }
    )
  }

  const memberRows = await db
    .select({
      deckId: collectionDecks.deckId,
      position: collectionDecks.position,
    })
    .from(collectionDecks)
    .where(eq(collectionDecks.collectionId, id))
    .orderBy(asc(collectionDecks.position), asc(collectionDecks.createdAt))

  const originalDeckIds = memberRows.map((r) => r.deckId)

  const [originalDecks, originalTopics, originalCards] = await Promise.all([
    originalDeckIds.length
      ? db
          .select()
          .from(decks)
          .where(
            and(
              inArray(decks.id, originalDeckIds),
              eq(decks.creatorId, originalCollection.creatorId)
            )
          )
      : Promise.resolve([] as Array<typeof decks.$inferSelect>),
    originalDeckIds.length
      ? db
          .select()
          .from(deckTopics)
          .where(inArray(deckTopics.deckId, originalDeckIds))
      : Promise.resolve([] as Array<typeof deckTopics.$inferSelect>),
    originalDeckIds.length
      ? db
          .select()
          .from(cards)
          .where(inArray(cards.deckId, originalDeckIds))
      : Promise.resolve([] as Array<typeof cards.$inferSelect>),
  ])

  const decksById = new Map(originalDecks.map((d) => [d.id, d]))
  const topicsByDeck = originalTopics.reduce<Map<string, Array<typeof deckTopics.$inferSelect>>>(
    (acc, row) => {
      const list = acc.get(row.deckId) ?? []
      list.push(row)
      acc.set(row.deckId, list)
      return acc
    },
    new Map()
  )
  const cardsByDeck = originalCards.reduce<Map<string, Array<typeof cards.$inferSelect>>>(
    (acc, row) => {
      const list = acc.get(row.deckId) ?? []
      list.push(row)
      acc.set(row.deckId, list)
      return acc
    },
    new Map()
  )

  const newCollectionSlug = await uniqueCollectionSlug(originalCollection.slug)

  const newCollection = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(collections)
      .values({
        title: originalCollection.title,
        slug: newCollectionSlug,
        description: originalCollection.description,
        visibility: "private",
        creatorId: user.id,
        sourceLanguageId: originalCollection.sourceLanguageId,
        targetLanguageId: originalCollection.targetLanguageId,
        forkedFromCollectionId: originalCollection.id,
      })
      .returning()

    if (!created) {
      throw new Error("Failed to create collection")
    }

    for (const member of memberRows) {
      const original = decksById.get(member.deckId)
      if (!original) continue

      const deckSlug = await uniqueSlug(original.slug, tx)

      const [newDeck] = await tx
        .insert(decks)
        .values({
          title: original.title,
          slug: deckSlug,
          description: original.description,
          visibility: "private",
          sourceLanguageId: original.sourceLanguageId,
          targetLanguageId: original.targetLanguageId,
          creatorId: user.id,
          forkedFromDeckId: original.id,
        })
        .returning()

      if (!newDeck) continue

      await tx.insert(collectionDecks).values({
        collectionId: created.id,
        deckId: newDeck.id,
        position: member.position,
      })

      const topicRows = topicsByDeck.get(original.id) ?? []
      if (topicRows.length) {
        await tx.insert(deckTopics).values(
          topicRows.map((t) => ({
            deckId: newDeck.id,
            topicId: t.topicId,
          }))
        )
      }

      const cardRows = cardsByDeck.get(original.id) ?? []
      if (cardRows.length) {
        await tx.insert(cards).values(
          cardRows.map((c) => ({
            deckId: newDeck.id,
            front: c.front,
            back: c.back,
          }))
        )
      }
    }

    return created
  })

  await db.insert(notifications).values({
    userId: originalCollection.creatorId,
    type: "collection_fork_received",
    data: {
      collectionId: newCollection.id,
      originalCollectionId: originalCollection.id,
      collectionTitle: newCollection.title,
      forkedBy: user.name || user.clerkId,
    },
  })

  return NextResponse.json(successResponse(newCollection))
}
