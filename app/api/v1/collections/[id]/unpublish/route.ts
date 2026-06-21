import { NextResponse } from "next/server"
import { revalidateCache } from "@/lib/cache/revalidate"
import { db } from "@/lib/db/client"
import { collections } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { successResponse, errorResponse } from "@/lib/api/response"
import { requireCurrentUser } from "@/lib/auth/user"
import {
  COMMUNITY_COLLECTIONS_CACHE_TAG,
  COMMUNITY_COLLECTIONS_DETAIL_CACHE_TAG,
} from "@/lib/cache/community-collections-detail"

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
    .set({ visibility: "private" })
    .where(eq(collections.id, id))
    .returning()

  revalidateCache(COMMUNITY_COLLECTIONS_CACHE_TAG)
  revalidateCache(COMMUNITY_COLLECTIONS_DETAIL_CACHE_TAG)

  return NextResponse.json(successResponse(updated))
}
