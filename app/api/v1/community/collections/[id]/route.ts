import { NextResponse } from "next/server"
import { successResponse, errorResponse } from "@/lib/api/response"
import {
  getCommunityCollectionById,
  getSharedCollectionById,
} from "@/lib/cache/community-collections-detail"
import { isValidShareToken } from "@/lib/share-token"

export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const share = new URL(request.url).searchParams.get("share")

  const collection =
    share && isValidShareToken(share)
      ? await getSharedCollectionById(id, share)
      : await getCommunityCollectionById(id)

  if (!collection) {
    return NextResponse.json(
      errorResponse("Collection not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  return NextResponse.json(successResponse(collection))
}
