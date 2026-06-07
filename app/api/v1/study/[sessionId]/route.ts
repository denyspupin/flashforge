import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db/client"
import { studySessions, users, decks, cards, languages } from "@/lib/db/schema"
import { eq, and, asc } from "drizzle-orm"
import { successResponse, errorResponse } from "@/lib/api/response"

export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
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

  const sessionRows = await db
    .select()
    .from(studySessions)
    .where(
      and(
        eq(studySessions.id, sessionId),
        eq(studySessions.userId, user[0].id)
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
