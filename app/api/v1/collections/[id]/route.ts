import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import {
  collections,
  collectionDecks,
  cards,
  decks,
  deckTopics,
  topics,
} from "@/lib/db/schema"
import { eq, and, isNull, inArray, asc, sql } from "drizzle-orm"
import { successResponse, errorResponse } from "@/lib/api/response"
import { requireCurrentUser } from "@/lib/auth/user"
import { slugify } from "@/lib/slug"
import { revalidateCache } from "@/lib/cache/revalidate"
import {
  COMMUNITY_COLLECTIONS_CACHE_TAG,
  COMMUNITY_COLLECTIONS_DETAIL_CACHE_TAG,
} from "@/lib/cache/community-collections-detail"
import { z } from "zod"

export const dynamic = "force-dynamic"

const updateCollectionSchema = z.object({
  title: z.string().min(1).max(256).optional(),
  description: z.string().optional(),
  sourceLanguageId: z.string().uuid().optional(),
  targetLanguageId: z.string().uuid().optional(),
})

export async function GET(
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

  const found = await db
    .select()
    .from(collections)
    .where(
      and(
        eq(collections.id, id),
        eq(collections.creatorId, user.id),
        isNull(collections.deletedAt)
      )
    )
    .limit(1)

  if (!found.length) {
    return NextResponse.json(
      errorResponse("Collection not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  const collectionRows = await db
    .select({
      deckId: collectionDecks.deckId,
      position: collectionDecks.position,
      id: decks.id,
      deckTitle: decks.title,
      deckSlug: decks.slug,
      description: decks.description,
      sourceLanguageId: decks.sourceLanguageId,
      targetLanguageId: decks.targetLanguageId,
      cardCount: sql<number>`(
        SELECT count(*)::int FROM ${cards} WHERE ${cards.deckId} = ${decks.id}
      )`,
    })
    .from(collectionDecks)
    .innerJoin(decks, eq(decks.id, collectionDecks.deckId))
    .where(
      and(
        eq(collectionDecks.collectionId, id),
        isNull(decks.deletedAt)
      )
    )
    .orderBy(asc(collectionDecks.position), asc(collectionDecks.createdAt))

  const deckIds = collectionRows.map((r) => r.deckId)

  const topicsByDeck = new Map<
    string,
    { id: string; name: string; slug: string }[]
  >()

  if (deckIds.length) {
    const topicRows = await db
      .select({
        deckId: deckTopics.deckId,
        id: topics.id,
        name: topics.name,
        slug: topics.slug,
      })
      .from(deckTopics)
      .innerJoin(topics, eq(topics.id, deckTopics.topicId))
      .where(inArray(deckTopics.deckId, deckIds))

    for (const row of topicRows) {
      const list = topicsByDeck.get(row.deckId) ?? []
      list.push({ id: row.id, name: row.name, slug: row.slug })
      topicsByDeck.set(row.deckId, list)
    }
  }

  const totalCards = collectionRows.reduce(
    (sum, row) => sum + (row.cardCount ?? 0),
    0
  )

  return NextResponse.json(
    successResponse({
      ...found[0],
      deckCount: collectionRows.length,
      totalCards,
      decks: collectionRows.map((row) => ({
        id: row.deckId,
        title: row.deckTitle,
        slug: row.deckSlug,
        description: row.description,
        sourceLanguageId: row.sourceLanguageId,
        targetLanguageId: row.targetLanguageId,
        cardCount: row.cardCount ?? 0,
        position: row.position,
        topics: topicsByDeck.get(row.deckId) ?? [],
      })),
    })
  )
}

export async function PATCH(
  request: Request,
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

  const body = await request.json()
  const parsed = updateCollectionSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      errorResponse("Invalid request body", "VALIDATION_ERROR"),
      { status: 400 }
    )
  }

  const existing = await db
    .select()
    .from(collections)
    .where(
      and(
        eq(collections.id, id),
        eq(collections.creatorId, user.id),
        isNull(collections.deletedAt)
      )
    )
    .limit(1)

  if (!existing.length) {
    return NextResponse.json(
      errorResponse("Collection not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  const updateData: Record<string, unknown> = {}
  if (parsed.data.title !== undefined) {
    updateData.title = parsed.data.title
    updateData.slug = slugify(parsed.data.title)
  }
  if (parsed.data.description !== undefined)
    updateData.description = parsed.data.description
  if (parsed.data.sourceLanguageId !== undefined)
    updateData.sourceLanguageId = parsed.data.sourceLanguageId
  if (parsed.data.targetLanguageId !== undefined)
    updateData.targetLanguageId = parsed.data.targetLanguageId

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(successResponse(existing[0]))
  }

  const [updated] = await db
    .update(collections)
    .set(updateData)
    .where(eq(collections.id, id))
    .returning()

  revalidateCache(COMMUNITY_COLLECTIONS_CACHE_TAG)
  revalidateCache(COMMUNITY_COLLECTIONS_DETAIL_CACHE_TAG)

  return NextResponse.json(successResponse(updated))
}

export async function DELETE(
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

  const existing = await db
    .select()
    .from(collections)
    .where(
      and(
        eq(collections.id, id),
        eq(collections.creatorId, user.id),
        isNull(collections.deletedAt)
      )
    )
    .limit(1)

  if (!existing.length) {
    return NextResponse.json(
      errorResponse("Collection not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  await db.delete(collections).where(eq(collections.id, id))

  revalidateCache(COMMUNITY_COLLECTIONS_CACHE_TAG)
  revalidateCache(COMMUNITY_COLLECTIONS_DETAIL_CACHE_TAG)

  return NextResponse.json(successResponse({ success: true }))
}
