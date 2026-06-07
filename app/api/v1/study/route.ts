import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db/client"
import { studySessions, users, decks, cards } from "@/lib/db/schema"
import { eq, and, asc } from "drizzle-orm"
import { successResponse, errorResponse } from "@/lib/api/response"
import { z } from "zod"

export const dynamic = "force-dynamic"

const startSchema = z.object({
  deck_id: z.string().uuid(),
})

export async function POST(request: Request) {
  const { userId: clerkId } = await auth()

  if (!clerkId) {
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
    .where(and(eq(decks.id, parsed.data.deck_id), eq(decks.creatorId, user[0].id)))

  if (!deck.length) {
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
        eq(studySessions.userId, user[0].id),
        eq(studySessions.deckId, parsed.data.deck_id),
        eq(studySessions.status, "active")
      )
    )

  let session = existing[0]

  if (!session) {
    const [created] = await db
      .insert(studySessions)
      .values({
        userId: user[0].id,
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
