import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { decks, cards, deckTopics, topics, users } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { successResponse, errorResponse } from "@/lib/api/response"

export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const deck = await db
    .select()
    .from(decks)
    .where(and(eq(decks.id, id), eq(decks.visibility, "public")))

  if (!deck.length) {
    return NextResponse.json(
      errorResponse("Deck not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  const deckCards = await db.select().from(cards).where(eq(cards.deckId, id))

  const topicRelations = await db
    .select({ topicId: deckTopics.topicId })
    .from(deckTopics)
    .where(eq(deckTopics.deckId, id))

  const creator = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, deck[0].creatorId))

  return NextResponse.json(
    successResponse({
      ...deck[0],
      cards: deckCards,
      creatorName: creator[0]?.name || "Unknown",
    })
  )
}
