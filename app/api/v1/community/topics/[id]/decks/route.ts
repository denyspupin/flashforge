import { NextResponse } from "next/server"
import { successResponse } from "@/lib/api/response"
import { getDecksForTopic } from "@/lib/cache/topic-decks"

export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const data = await getDecksForTopic(id)

  return NextResponse.json(successResponse(data))
}
