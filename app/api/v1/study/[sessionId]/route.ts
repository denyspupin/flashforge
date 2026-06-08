import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { studySessions, decks, cards, languages } from "@/lib/db/schema"
import { eq, and, asc } from "drizzle-orm"
import { successResponse, errorResponse } from "@/lib/api/response"
import { requireCurrentUser } from "@/lib/auth/user"

export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const user = await requireCurrentUser()

  if (!user) {
    return NextResponse.json(
      errorResponse("Authentication required", "UNAUTHORIZED"),
      { status: 401 }
    )
  }

  const sessionRows = await db
    .select()
    .from(studySessions)
    .where(
      and(
        eq(studySessions.id, sessionId),
        eq(studySessions.userId, user.id)
      )
    )

  if (!sessionRows.length) {
    return NextResponse.json(
      errorResponse("Session not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  const session = sessionRows[0]

  const deckRows = await db
    .select()
    .from(decks)
    .where(eq(decks.id, session.deckId))

  if (!deckRows.length) {
    return NextResponse.json(
      errorResponse("Deck not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  const [sourceLang, targetLang, deckCards] = await Promise.all([
    db.select().from(languages).where(eq(languages.id, deckRows[0].sourceLanguageId)),
    db.select().from(languages).where(eq(languages.id, deckRows[0].targetLanguageId)),
    db
      .select()
      .from(cards)
      .where(eq(cards.deckId, session.deckId))
      .orderBy(asc(cards.createdAt)),
  ])

  return NextResponse.json(
    successResponse({
      session,
      deck: {
        ...deckRows[0],
        sourceLanguage: sourceLang[0]?.name ?? "",
        targetLanguage: targetLang[0]?.name ?? "",
      },
      cards: deckCards,
    })
  )
}
