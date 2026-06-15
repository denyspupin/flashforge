import { NextResponse } from "next/server"
import { eq, sql } from "drizzle-orm"

import { errorResponse, successResponse } from "@/lib/api/response"
import { requireAdmin } from "@/lib/auth/user"
import { db } from "@/lib/db/client"
import { cards, decks } from "@/lib/db/schema"

export const dynamic = "force-dynamic"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json(errorResponse("Forbidden", "FORBIDDEN"), {
      status: 403,
    })
  }

  const { id } = await params
  const now = sql`now()`

  const [updated] = await db
    .update(decks)
    .set({ deletedAt: null, updatedAt: now })
    .where(eq(decks.id, id))
    .returning({ id: decks.id })

  if (!updated) {
    return NextResponse.json(errorResponse("Deck not found", "NOT_FOUND"), {
      status: 404,
    })
  }

  await db
    .update(cards)
    .set({ deletedAt: null, updatedAt: now })
    .where(eq(cards.deckId, id))

  return NextResponse.json(successResponse({ id, restored: true }))
}
