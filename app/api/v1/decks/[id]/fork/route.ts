import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db/client"
import { decks, users, deckTopics, cards, notifications } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { successResponse, errorResponse } from "@/lib/api/response"

export const dynamic = "force-dynamic"

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

  const originalDeck = await db
    .select()
    .from(decks)
    .where(and(eq(decks.id, id), eq(decks.visibility, "public")))

  if (!originalDeck.length) {
    return NextResponse.json(
      errorResponse("Deck not found or not public", "NOT_FOUND"),
      { status: 404 }
    )
  }

  const [newDeck] = await db
    .insert(decks)
    .values({
      title: originalDeck[0].title,
      slug: originalDeck[0].slug + "-copy",
      description: originalDeck[0].description,
      sourceLanguageId: originalDeck[0].sourceLanguageId,
      targetLanguageId: originalDeck[0].targetLanguageId,
      creatorId: user[0].id,
      visibility: "private",
      forkedFromDeckId: originalDeck[0].id,
    })
    .returning()

  const originalCards = await db
    .select()
    .from(cards)
    .where(eq(cards.deckId, id))

  if (originalCards.length) {
    await db.insert(cards).values(
      originalCards.map((card) => ({
        deckId: newDeck.id,
        front: card.front,
        back: card.back,
      }))
    )
  }

  const originalTopics = await db
    .select()
    .from(deckTopics)
    .where(eq(deckTopics.deckId, id))

  if (originalTopics.length) {
    await db.insert(deckTopics).values(
      originalTopics.map((dt) => ({
        deckId: newDeck.id,
        topicId: dt.topicId,
      }))
    )
  }

  await db.insert(notifications).values({
    userId: originalDeck[0].creatorId,
    type: "fork_received",
    data: {
      deckId: newDeck.id,
      deckTitle: newDeck.title,
      forkedBy: user[0].name || user[0].clerkId,
    },
  })

  return NextResponse.json(successResponse(newDeck))
}
