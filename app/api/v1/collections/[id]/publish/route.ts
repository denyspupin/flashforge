import { NextResponse } from "next/server"
import { revalidateCache } from "@/lib/cache/revalidate"
import { db } from "@/lib/db/client"
import {
  collections,
  collectionDecks,
  decks,
} from "@/lib/db/schema"
import { eq, and, inArray } from "drizzle-orm"
import { successResponse, errorResponse } from "@/lib/api/response"
import { requireCurrentUser } from "@/lib/auth/user"
import {
  COMMUNITY_COLLECTIONS_CACHE_TAG,
  COMMUNITY_COLLECTIONS_DETAIL_CACHE_TAG,
} from "@/lib/cache/community-collections-detail"
import { COMMUNITY_DECKS_CACHE_TAG } from "@/lib/cache/community-decks-detail"

export const dynamic = "force-dynamic"

export async function POST(
  _request: Request,
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

  const collection = await db
    .select()
    .from(collections)
    .where(and(eq(collections.id, id), eq(collections.creatorId, user.id)))

  if (!collection.length) {
    return NextResponse.json(
      errorResponse("Collection not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  const [updated] = await db
    .update(collections)
    .set({ visibility: "public" })
    .where(eq(collections.id, id))
    .returning()

  const memberRows = await db
    .select({ deckId: collectionDecks.deckId })
    .from(collectionDecks)
    .where(eq(collectionDecks.collectionId, id))

  const memberDeckIds = memberRows.map((r) => r.deckId)

  if (memberDeckIds.length) {
    await db
      .update(decks)
      .set({ visibility: "public" })
      .where(
        and(inArray(decks.id, memberDeckIds), eq(decks.creatorId, user.id))
      )
  }

  revalidateCache(COMMUNITY_COLLECTIONS_CACHE_TAG)
  revalidateCache(COMMUNITY_COLLECTIONS_DETAIL_CACHE_TAG)
  revalidateCache(COMMUNITY_DECKS_CACHE_TAG)

  return NextResponse.json(successResponse(updated))
}
