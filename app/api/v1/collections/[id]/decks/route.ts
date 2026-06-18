import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import {
  collections,
  collectionDecks,
  decks,
} from "@/lib/db/schema"
import { eq, and, isNull, sql, asc } from "drizzle-orm"
import { successResponse, errorResponse } from "@/lib/api/response"
import { requireCurrentUser } from "@/lib/auth/user"
import { z } from "zod"

export const dynamic = "force-dynamic"

const addDeckSchema = z.object({
  deckId: z.string().uuid(),
})

async function loadOwnedCollection(userId: string, collectionId: string) {
  const found = await db
    .select()
    .from(collections)
    .where(
      and(
        eq(collections.id, collectionId),
        eq(collections.creatorId, userId),
        isNull(collections.deletedAt)
      )
    )
    .limit(1)

  return found[0] ?? null
}

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

  const collection = await loadOwnedCollection(user.id, id)
  if (!collection) {
    return NextResponse.json(
      errorResponse("Collection not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  const rows = await db
    .select({
      id: decks.id,
      title: decks.title,
      slug: decks.slug,
      description: decks.description,
      sourceLanguageId: decks.sourceLanguageId,
      targetLanguageId: decks.targetLanguageId,
      position: collectionDecks.position,
    })
    .from(collectionDecks)
    .innerJoin(decks, eq(decks.id, collectionDecks.deckId))
    .where(eq(collectionDecks.collectionId, id))
    .orderBy(asc(collectionDecks.position), asc(collectionDecks.createdAt))

  return NextResponse.json(successResponse(rows))
}

export async function POST(
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
  const parsed = addDeckSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      errorResponse("Invalid request body", "VALIDATION_ERROR"),
      { status: 400 }
    )
  }

  const collection = await loadOwnedCollection(user.id, id)
  if (!collection) {
    return NextResponse.json(
      errorResponse("Collection not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  const [deck] = await db
    .select()
    .from(decks)
    .where(and(eq(decks.id, parsed.data.deckId), isNull(decks.deletedAt)))
    .limit(1)

  if (!deck) {
    return NextResponse.json(
      errorResponse("Deck not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  if (deck.creatorId !== user.id) {
    return NextResponse.json(
      errorResponse("You can only add your own decks to a collection", "FORBIDDEN"),
      { status: 403 }
    )
  }

  if (
    deck.sourceLanguageId !== collection.sourceLanguageId ||
    deck.targetLanguageId !== collection.targetLanguageId
  ) {
    return NextResponse.json(
      errorResponse(
        "Deck language pair must match the collection's language pair",
        "VALIDATION_ERROR"
      ),
      { status: 400 }
    )
  }

  const [maxRow] = await db
    .select({ max: sql<number | null>`MAX(${collectionDecks.position})` })
    .from(collectionDecks)
    .where(eq(collectionDecks.collectionId, id))

  const nextPosition = (maxRow?.max ?? -1) + 1

  const [created] = await db
    .insert(collectionDecks)
    .values({
      collectionId: id,
      deckId: parsed.data.deckId,
      position: nextPosition,
    })
    .onConflictDoNothing()
    .returning()

  return NextResponse.json(
    successResponse(
      created ?? { collectionId: id, deckId: parsed.data.deckId, position: nextPosition }
    )
  )
}
