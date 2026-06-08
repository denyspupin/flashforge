import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { cards, decks } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { successResponse, errorResponse } from "@/lib/api/response"
import { requireCurrentUser } from "@/lib/auth/user"
import { z } from "zod"

export const dynamic = "force-dynamic"

const updateCardSchema = z.object({
  front: z.string().min(1).optional(),
  back: z.string().min(1).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; cardId: string }> }
) {
  const { id, cardId } = await params
  const user = await requireCurrentUser()

  if (!user) {
    return NextResponse.json(
      errorResponse("Authentication required", "UNAUTHORIZED"),
      { status: 401 }
    )
  }

  const deck = await db
    .select()
    .from(decks)
    .where(and(eq(decks.id, id), eq(decks.creatorId, user.id)))

  if (!deck.length) {
    return NextResponse.json(
      errorResponse("Deck not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  const body = await request.json()
  const parsed = updateCardSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      errorResponse("Invalid request body", "VALIDATION_ERROR"),
      { status: 400 }
    )
  }

  const updateData: Record<string, unknown> = {}
  if (parsed.data.front !== undefined) updateData.front = parsed.data.front
  if (parsed.data.back !== undefined) updateData.back = parsed.data.back

  const [card] = await db
    .update(cards)
    .set(updateData)
    .where(and(eq(cards.id, cardId), eq(cards.deckId, id)))
    .returning()

  if (!card) {
    return NextResponse.json(
      errorResponse("Card not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  return NextResponse.json(successResponse(card))
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; cardId: string }> }
) {
  const { id, cardId } = await params
  const user = await requireCurrentUser()

  if (!user) {
    return NextResponse.json(
      errorResponse("Authentication required", "UNAUTHORIZED"),
      { status: 401 }
    )
  }

  const deck = await db
    .select()
    .from(decks)
    .where(and(eq(decks.id, id), eq(decks.creatorId, user.id)))

  if (!deck.length) {
    return NextResponse.json(
      errorResponse("Deck not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  await db
    .delete(cards)
    .where(and(eq(cards.id, cardId), eq(cards.deckId, id)))

  return NextResponse.json(successResponse({ success: true }))
}
