import { NextResponse } from "next/server"
import { successResponse, errorResponse } from "@/lib/api/response"
import {
  getCommunityDeckById,
  getSharedDeckById,
} from "@/lib/cache/community-decks-detail"
import { isValidShareToken } from "@/lib/share-token"

export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const share = new URL(request.url).searchParams.get("share")

  const deck =
    share && isValidShareToken(share)
      ? await getSharedDeckById(id, share)
      : await getCommunityDeckById(id)

  if (!deck) {
    return NextResponse.json(
      errorResponse("Deck not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  return NextResponse.json(successResponse(deck))
}
