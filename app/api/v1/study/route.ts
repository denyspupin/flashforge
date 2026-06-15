import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { studySessions, decks, cards } from "@/lib/db/schema"
import { eq, and, asc, desc } from "drizzle-orm"
import { successResponse, errorResponse } from "@/lib/api/response"
import { requireCurrentUser } from "@/lib/auth/user"
import { z } from "zod"

export const dynamic = "force-dynamic"

const startSchema = z.object({
  deck_id: z.string().uuid(),
})

export async function POST(request: Request) {
  const user = await requireCurrentUser()

  if (!user) {
    return NextResponse.json(
      errorResponse("Authentication required", "UNAUTHORIZED"),
      { status: 401 }
    )
  }

  const body = await request.json()
  const parsed = startSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      errorResponse("Invalid request body", "VALIDATION_ERROR"),
      { status: 400 }
    )
  }

  const deck = await db
    .select()
    .from(decks)
    .where(eq(decks.id, parsed.data.deck_id))

  if (!deck.length) {
    return NextResponse.json(
      errorResponse("Deck not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  const isOwner = deck[0].creatorId === user.id
  const isPublic = deck[0].visibility === "public"

  if (!isOwner && !isPublic) {
    return NextResponse.json(
      errorResponse("Deck not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  const existing = await db
    .select()
    .from(studySessions)
    .where(
      and(
        eq(studySessions.userId, user.id),
        eq(studySessions.deckId, parsed.data.deck_id),
        eq(studySessions.status, "active")
      )
    )
    .orderBy(desc(studySessions.startedAt))
    .limit(1)

  let session = existing[0]

  if (!session) {
    const [created] = await db
      .insert(studySessions)
      .values({
        userId: user.id,
        deckId: parsed.data.deck_id,
        status: "active",
      })
      .returning()

    session = created
  }

  const deckCards = await db
    .select()
    .from(cards)
    .where(eq(cards.deckId, parsed.data.deck_id))
    .orderBy(asc(cards.createdAt))

  return NextResponse.json(
    successResponse({
      session,
      deck: deck[0],
      cards: deckCards,
    })
  )
}
