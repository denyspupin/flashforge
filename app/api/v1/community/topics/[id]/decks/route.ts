import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { decks, deckTopics } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { successResponse } from "@/lib/api/response"

export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const data = await db
    .select()
    .from(decks)
    .innerJoin(deckTopics, eq(decks.id, deckTopics.deckId))
    .where(
      and(
        eq(deckTopics.topicId, id),
        eq(decks.visibility, "public")
      )
    )

  return NextResponse.json(successResponse(data))
}
