import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { decks, cards, deckTopics, topics, users, languages } from "@/lib/db/schema"
import { eq, and, inArray } from "drizzle-orm"
import { successResponse, errorResponse } from "@/lib/api/response"
import { enrichLanguage } from "@/lib/languages/flags"

export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const deckRows = await db
    .select()
    .from(decks)
    .where(and(eq(decks.id, id), eq(decks.visibility, "public")))

  if (!deckRows.length) {
    return NextResponse.json(
      errorResponse("Deck not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  const deck = deckRows[0]

  const [deckCards, creatorRows, languageRows] = await Promise.all([
    db.select().from(cards).where(eq(cards.deckId, id)),
    db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, deck.creatorId)),
    db
      .select()
      .from(languages)
      .where(
        inArray(languages.id, [deck.sourceLanguageId, deck.targetLanguageId])
      ),
  ])

  const topicRelations = await db
    .select({
      id: topics.id,
      name: topics.name,
      slug: topics.slug,
    })
    .from(deckTopics)
    .innerJoin(topics, eq(topics.id, deckTopics.topicId))
    .where(eq(deckTopics.deckId, id))

  const sourceLanguage = languageRows.find((l) => l.id === deck.sourceLanguageId)
  const targetLanguage = languageRows.find((l) => l.id === deck.targetLanguageId)

  return NextResponse.json(
    successResponse({
      ...deck,
      cards: deckCards,
      topics: topicRelations,
      creatorId: creatorRows[0]?.id ?? deck.creatorId,
      creatorName: creatorRows[0]?.name ?? "Unknown",
      sourceLanguage: sourceLanguage ? enrichLanguage(sourceLanguage) : null,
      targetLanguage: targetLanguage ? enrichLanguage(targetLanguage) : null,
      cardCount: deckCards.length,
    })
  )
}
