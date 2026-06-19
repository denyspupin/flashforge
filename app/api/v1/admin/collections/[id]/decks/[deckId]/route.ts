import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"

import { errorResponse, successResponse } from "@/lib/api/response"
import { requireAdmin } from "@/lib/auth/user"
import { db } from "@/lib/db/client"
import { collectionDecks } from "@/lib/db/schema"

export const dynamic = "force-dynamic"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; deckId: string }> },
) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json(errorResponse("Forbidden", "FORBIDDEN"), {
      status: 403,
    })
  }

  const { id, deckId } = await params

  const [removed] = await db
    .delete(collectionDecks)
    .where(
      and(
        eq(collectionDecks.collectionId, id),
        eq(collectionDecks.deckId, deckId),
      ),
    )
    .returning({ deckId: collectionDecks.deckId })

  if (!removed) {
    return NextResponse.json(
      errorResponse("Deck not in collection", "NOT_FOUND"),
      { status: 404 },
    )
  }

  return NextResponse.json(
    successResponse({ id, deckId, removed: true }),
  )
}
