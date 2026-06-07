import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db/client"
import { cards, users, decks } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { successResponse, errorResponse } from "@/lib/api/response"
import { z } from "zod"

export const dynamic = "force-dynamic"

const cardSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { userId: clerkId } = await auth()

  if (!clerkId) {
    return NextResponse.json(
      errorResponse("Authentication required", "UNAUTHORIZED"),
      { status: 401 }
    )
  }

  const user = await db.select().from(users).where(eq(users.clerkId, clerkId))

  if (!user.length) {
    return NextResponse.json(
      errorResponse("User not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  const deck = await db
    .select()
    .from(decks)
    .where(and(eq(decks.id, id), eq(decks.creatorId, user[0].id)))

  if (!deck.length) {
    return NextResponse.json(
      errorResponse("Deck not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  const body = await request.json()
  const parsed = cardSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      errorResponse("Invalid request body", "VALIDATION_ERROR"),
      { status: 400 }
    )
  }

  const [card] = await db
    .insert(cards)
    .values({
      deckId: id,
      front: parsed.data.front,
      back: parsed.data.back,
    })
    .returning()

  return NextResponse.json(successResponse(card))
}
