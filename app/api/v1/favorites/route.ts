import { NextResponse } from "next/server"
import { z } from "zod"
import { and, eq, isNull } from "drizzle-orm"

import { loadFavorites } from "@/lib/queries/favorites"
import { db } from "@/lib/db/client"
import {
  collections,
  decks,
  favoriteCollections,
  favoriteDecks,
} from "@/lib/db/schema"
import { successResponse, errorResponse } from "@/lib/api/response"
import { requireCurrentUser } from "@/lib/auth/user"

export const dynamic = "force-dynamic"

const toggleFavoriteSchema = z
  .object({
    deckId: z.string().uuid().optional(),
    collectionId: z.string().uuid().optional(),
  })
  .refine(
    (data) => Boolean(data.deckId) !== Boolean(data.collectionId),
    "Provide exactly one of deckId or collectionId"
  )

export async function GET() {
  const data = await loadFavorites()

  if (!data) {
    return NextResponse.json(
      errorResponse("Authentication required", "UNAUTHORIZED"),
      { status: 401 }
    )
  }

  return NextResponse.json(successResponse(data))
}

export async function POST(request: Request) {
  const user = await requireCurrentUser()

  if (!user) {
    return NextResponse.json(
      errorResponse("Authentication required", "UNAUTHORIZED"),
      { status: 401 }
    )
  }

  const parsed = toggleFavoriteSchema.safeParse(await request.json().catch(() => null))

  if (!parsed.success) {
    return NextResponse.json(
      errorResponse("Invalid request body", "VALIDATION_ERROR"),
      { status: 400 }
    )
  }

  const { deckId, collectionId } = parsed.data

  if (collectionId) {
    const [collection] = await db
      .select({
        id: collections.id,
        visibility: collections.visibility,
        creatorId: collections.creatorId,
      })
      .from(collections)
      .where(
        and(eq(collections.id, collectionId), isNull(collections.deletedAt))
      )

    if (
      !collection ||
      (collection.visibility !== "public" &&
        collection.creatorId !== user.id)
    ) {
      return NextResponse.json(
        errorResponse("Collection not found", "NOT_FOUND"),
        { status: 404 }
      )
    }

    const existing = await db
      .select({ collectionId: favoriteCollections.collectionId })
      .from(favoriteCollections)
      .where(
        and(
          eq(favoriteCollections.userId, user.id),
          eq(favoriteCollections.collectionId, collectionId)
        )
      )

    if (existing.length) {
      await db
        .delete(favoriteCollections)
        .where(
          and(
            eq(favoriteCollections.userId, user.id),
            eq(favoriteCollections.collectionId, collectionId)
          )
        )
      return NextResponse.json(successResponse({ favorited: false }))
    }

    await db
      .insert(favoriteCollections)
      .values({ userId: user.id, collectionId })
      .onConflictDoNothing()
    return NextResponse.json(successResponse({ favorited: true }))
  }

  if (deckId) {
    const [deck] = await db
      .select({
        id: decks.id,
        visibility: decks.visibility,
        creatorId: decks.creatorId,
      })
      .from(decks)
      .where(and(eq(decks.id, deckId), isNull(decks.deletedAt)))

    if (!deck || (deck.visibility !== "public" && deck.creatorId !== user.id)) {
      return NextResponse.json(
        errorResponse("Deck not found", "NOT_FOUND"),
        { status: 404 }
      )
    }

    const existing = await db
      .select({ deckId: favoriteDecks.deckId })
      .from(favoriteDecks)
      .where(
        and(eq(favoriteDecks.userId, user.id), eq(favoriteDecks.deckId, deckId))
      )

    if (existing.length) {
      await db
        .delete(favoriteDecks)
        .where(
          and(eq(favoriteDecks.userId, user.id), eq(favoriteDecks.deckId, deckId))
        )
      return NextResponse.json(successResponse({ favorited: false }))
    }

    await db
      .insert(favoriteDecks)
      .values({ userId: user.id, deckId })
      .onConflictDoNothing()
    return NextResponse.json(successResponse({ favorited: true }))
  }

  return NextResponse.json(
    errorResponse("Invalid request body", "VALIDATION_ERROR"),
    { status: 400 }
  )
}
