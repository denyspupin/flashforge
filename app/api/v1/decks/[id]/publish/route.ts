import { NextResponse } from "next/server"
import { revalidateCache } from "@/lib/cache/revalidate"
import { db } from "@/lib/db/client"
import { decks } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { successResponse, errorResponse } from "@/lib/api/response"
import { requireCurrentUser } from "@/lib/auth/user"
import {
  COMMUNITY_DECKS_CACHE_TAG,
  COMMUNITY_DECKS_DETAIL_CACHE_TAG,
} from "@/lib/cache/community-decks-detail"

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

  const deck = await db
    .select()
    .from(decks)
    .where(and(eq(decks.id, id), eq(decks.creatorId, user.id)))

  if (!deck.length) {
    return NextResponse.json(
      errorResponse("Deck not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  const [updated] = await db
    .update(decks)
    .set({ visibility: "public" })
    .where(eq(decks.id, id))
    .returning()

  revalidateCache(COMMUNITY_DECKS_CACHE_TAG)
  revalidateCache(COMMUNITY_DECKS_DETAIL_CACHE_TAG)

  return NextResponse.json(successResponse(updated))
}
