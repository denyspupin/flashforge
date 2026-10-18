import { NextResponse } from "next/server"
import { successResponse, errorResponse } from "@/lib/api/response"
import { auth } from "@clerk/nextjs/server"
import { getDecksForTopic } from "@/lib/cache/topic-decks"

export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json(
      errorResponse("Authentication required", "UNAUTHORIZED"),
      { status: 401 }
    )
  }

  const { id } = await params

  const data = await getDecksForTopic(id)

  return NextResponse.json(successResponse(data))
}
