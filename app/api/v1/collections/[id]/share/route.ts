import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { collections } from "@/lib/db/schema"
import { eq, and, isNull } from "drizzle-orm"
import { successResponse, errorResponse } from "@/lib/api/response"
import { requireCurrentUser } from "@/lib/auth/user"
import { generateShareToken } from "@/lib/share-token.server"

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
    .select({ id: collections.id, shareToken: collections.shareToken })
    .from(collections)
    .where(
      and(
        eq(collections.id, id),
        eq(collections.creatorId, user.id),
        isNull(collections.deletedAt)
      )
    )

  if (!collection.length) {
    return NextResponse.json(
      errorResponse("Collection not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  if (collection[0].shareToken) {
    return NextResponse.json(
      successResponse({ shareToken: collection[0].shareToken })
    )
  }

  const shareToken = generateShareToken()

  await db
    .update(collections)
    .set({ shareToken })
    .where(eq(collections.id, id))

  return NextResponse.json(successResponse({ shareToken }))
}

export async function DELETE(
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
    .select({ id: collections.id })
    .from(collections)
    .where(
      and(
        eq(collections.id, id),
        eq(collections.creatorId, user.id),
        isNull(collections.deletedAt)
      )
    )

  if (!collection.length) {
    return NextResponse.json(
      errorResponse("Collection not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  await db
    .update(collections)
    .set({ shareToken: null, updatedAt: new Date() })
    .where(eq(collections.id, id))

  return NextResponse.json(successResponse({ success: true }))
}
