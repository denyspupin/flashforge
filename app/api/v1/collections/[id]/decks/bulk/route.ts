import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import {
  collections,
  collectionDecks,
  decks,
} from "@/lib/db/schema"
import { eq, and, isNull, sql, inArray } from "drizzle-orm"
import { successResponse, errorResponse } from "@/lib/api/response"
import { requireCurrentUser } from "@/lib/auth/user"
import { z } from "zod"

export const dynamic = "force-dynamic"

const bulkAddSchema = z.object({
  deckIds: z.array(z.string().uuid()).min(1).max(50),
})

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
  const parsed = bulkAddSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      errorResponse("Invalid request body", "VALIDATION_ERROR"),
      { status: 400 }
    )
  }

  const collection = await db
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

  if (!collection.length) {
    return NextResponse.json(
      errorResponse("Collection not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  const collectionRow = collection[0]
  const deckIds = Array.from(new Set(parsed.data.deckIds))

  const found = await db
    .select()
    .from(decks)
    .where(and(inArray(decks.id, deckIds), isNull(decks.deletedAt)))

  const foundIds = new Set(found.map((d) => d.id))
  const missing = deckIds.filter((d) => !foundIds.has(d))
  if (missing.length) {
    return NextResponse.json(
      errorResponse(`Deck not found: ${missing.join(", ")}`, "NOT_FOUND"),
      { status: 404 }
    )
  }

  const invalid = found.filter(
    (d) =>
      d.creatorId !== user.id ||
      d.sourceLanguageId !== collectionRow.sourceLanguageId ||
      d.targetLanguageId !== collectionRow.targetLanguageId
  )
  if (invalid.length) {
    return NextResponse.json(
      errorResponse(
        `These decks don't match the collection's language pair: ${invalid
          .map((d) => d.title)
          .join(", ")}`,
        "VALIDATION_ERROR"
      ),
      { status: 400 }
    )
  }

  const [maxRow] = await db
    .select({ max: sql<number | null>`MAX(${collectionDecks.position})` })
    .from(collectionDecks)
    .where(eq(collectionDecks.collectionId, id))

  const startPosition = (maxRow?.max ?? -1) + 1

  const values = found.map((d, i) => ({
    collectionId: id,
    deckId: d.id,
    position: startPosition + i,
  }))

  const inserted = await db
    .insert(collectionDecks)
    .values(values)
    .onConflictDoNothing()
    .returning({ deckId: collectionDecks.deckId })

  return NextResponse.json(
    successResponse({
      added: inserted.map((r) => r.deckId),
      addedCount: inserted.length,
    })
  )
}
