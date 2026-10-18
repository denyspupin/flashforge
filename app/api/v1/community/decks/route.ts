import { NextResponse } from "next/server"
import { successResponse, errorResponse } from "@/lib/api/response"
import { auth } from "@clerk/nextjs/server"
import { getCommunityDecks } from "@/lib/cache/community-decks"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json(
      errorResponse("Authentication required", "UNAUTHORIZED"),
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const topicId = searchParams.get("topicId")
  const q = searchParams.get("q")
  const sort = searchParams.get("sort") ?? "newest"

  const data = await getCommunityDecks(q, topicId, sort)

  return NextResponse.json(successResponse(data))
}
