import { NextResponse } from "next/server"
import { successResponse } from "@/lib/api/response"
import { getCommunityDecks } from "@/lib/cache/community-decks"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const topicId = searchParams.get("topicId")
  const q = searchParams.get("q")
  const sort = searchParams.get("sort") ?? "newest"

  const data = await getCommunityDecks(q, topicId, sort)

  return NextResponse.json(successResponse(data))
}
