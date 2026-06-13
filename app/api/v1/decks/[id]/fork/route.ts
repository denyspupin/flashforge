import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { decks, deckTopics, cards, notifications } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { successResponse, errorResponse } from "@/lib/api/response"
import { requireCurrentUser } from "@/lib/auth/user"
import { uniqueSlug } from "@/lib/slug"

export const dynamic = "force-dynamic"

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

  if (originalDeck[0].creatorId === user.id) {
    return NextResponse.json(
      errorResponse("You already own this deck", "CONFLICT"),
      { status: 409 }
    )
  }

  const newSlug = await uniqueSlug(originalDeck[0].slug)

  const [newDeck] = await db
    .insert(decks)
    .values({
      title: originalDeck[0].title,
      slug: newSlug,
      description: originalDeck[0].description,
      sourceLanguageId: originalDeck[0].sourceLanguageId,
      targetLanguageId: originalDeck[0].targetLanguageId,
      creatorId: user.id,
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

  if (originalDeck[0].creatorId !== user.id) {
    await db.insert(notifications).values({
      userId: originalDeck[0].creatorId,
      type: "fork_received",
      data: {
        deckId: newDeck.id,
        originalDeckId: originalDeck[0].id,
        deckTitle: newDeck.title,
        forkedBy: user.name || user.clerkId,
      },
    })
  }

  return NextResponse.json(successResponse(newDeck))
}
