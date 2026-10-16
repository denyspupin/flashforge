import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { collections, collectionDecks } from "@/lib/db/schema"
import { eq, and, isNull } from "drizzle-orm"
import { successResponse, errorResponse } from "@/lib/api/response"
import { requireCurrentUser } from "@/lib/auth/user"
import { revalidateCache } from "@/lib/cache/revalidate"
import {
  COMMUNITY_COLLECTIONS_CACHE_TAG,
  COMMUNITY_COLLECTIONS_DETAIL_CACHE_TAG,
} from "@/lib/cache/community-collections-detail"

export const dynamic = "force-dynamic"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; deckId: string }> }
) {
  const { id, deckId } = await params
  const user = await requireCurrentUser()

  if (!user) {
    return NextResponse.json(
      errorResponse("Authentication required", "UNAUTHORIZED"),
      { status: 401 }
    )
  }

  const found = await db
    .select({ id: collections.id })
    .from(collections)
    .where(
      and(
        eq(collections.id, id),
        eq(collections.creatorId, user.id),
        isNull(collections.deletedAt)
      )
    )
    .limit(1)

  if (!found.length) {
    return NextResponse.json(
      errorResponse("Collection not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  await db
    .delete(collectionDecks)
    .where(
      and(
        eq(collectionDecks.collectionId, id),
        eq(collectionDecks.deckId, deckId)
      )
    )

  revalidateCache(COMMUNITY_COLLECTIONS_CACHE_TAG)
  revalidateCache(COMMUNITY_COLLECTIONS_DETAIL_CACHE_TAG)

  return NextResponse.json(successResponse({ success: true }))
}
