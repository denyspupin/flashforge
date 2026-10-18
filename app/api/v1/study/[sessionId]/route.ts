import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { studySessions, decks, cards, languages } from "@/lib/db/schema"
import { eq, and, asc, sql } from "drizzle-orm"
import { successResponse, errorResponse } from "@/lib/api/response"
import { requireCurrentUser } from "@/lib/auth/user"
import { getLanguageFlag } from "@/lib/languages/flags"
import { MAX_SESSION_DURATION_MS } from "@/lib/constants"
import { z } from "zod"

export const dynamic = "force-dynamic"

const durationSchema = z.object({
  durationMs: z.number().int().min(0).max(MAX_SESSION_DURATION_MS),
})

export async function PATCH(
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

  const body = await request.json()
  const parsed = durationSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      errorResponse("Invalid request body", "VALIDATION_ERROR"),
      { status: 400 }
    )
  }

  const [updated] = await db
    .update(studySessions)
    .set({
      durationMs: sql`greatest(${studySessions.durationMs}, ${parsed.data.durationMs})`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(studySessions.id, sessionId),
        eq(studySessions.userId, user.id),
        eq(studySessions.status, "active")
      )
    )
    .returning()

  if (updated) {
    return NextResponse.json(successResponse(updated))
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

  if (sessionRows.length) {
    return NextResponse.json(
      errorResponse("Session is not active", "CONFLICT"),
      { status: 409 }
    )
  }

  return NextResponse.json(
    errorResponse("Session not found", "NOT_FOUND"),
    { status: 404 }
  )
}

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
        sourceLanguageFlag: getLanguageFlag(sourceLang[0]?.code),
        targetLanguageFlag: getLanguageFlag(targetLang[0]?.code),
      },
      cards: deckCards,
    })
  )
}
