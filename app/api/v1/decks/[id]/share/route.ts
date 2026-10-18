import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { decks } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { successResponse, errorResponse } from "@/lib/api/response"
import { requireCurrentUser } from "@/lib/auth/user"
import { generateShareToken } from "@/lib/share-token.server"

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

  const deck = await db
    .select({ id: decks.id, shareToken: decks.shareToken })
    .from(decks)
    .where(and(eq(decks.id, id), eq(decks.creatorId, user.id)))

  if (!deck.length) {
    return NextResponse.json(
      errorResponse("Deck not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  if (deck[0].shareToken) {
    return NextResponse.json(
      successResponse({ shareToken: deck[0].shareToken })
    )
  }

  const shareToken = generateShareToken()

  await db.update(decks).set({ shareToken }).where(eq(decks.id, id))

  return NextResponse.json(successResponse({ shareToken }))
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

  const deck = await db
    .select({ id: decks.id })
    .from(decks)
    .where(and(eq(decks.id, id), eq(decks.creatorId, user.id)))

  if (!deck.length) {
    return NextResponse.json(
      errorResponse("Deck not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  await db
    .update(decks)
    .set({ shareToken: null })
    .where(eq(decks.id, id))

  return NextResponse.json(successResponse({ success: true }))
}
