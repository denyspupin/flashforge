import { NextResponse } from "next/server"
import { successResponse, errorResponse } from "@/lib/api/response"
import { getCommunityCollectionById } from "@/lib/cache/community-collections-detail"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const collection = await getCommunityCollectionById(id)

  if (!collection) {
    return NextResponse.json(
      errorResponse("Collection not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  return NextResponse.json(successResponse(collection))
}
