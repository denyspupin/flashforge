import { NextResponse } from "next/server"
import { successResponse, errorResponse } from "@/lib/api/response"
import { getCommunityDeckById } from "@/lib/cache/community-decks-detail"

export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const deck = await getCommunityDeckById(id)

  if (!deck) {
    return NextResponse.json(
      errorResponse("Deck not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  return NextResponse.json(successResponse(deck))
}
