import { NextResponse } from "next/server"
import { successResponse, errorResponse } from "@/lib/api/response"
import { auth } from "@clerk/nextjs/server"
import { getCommunityCollections } from "@/lib/cache/community-collections"

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
  const q = searchParams.get("q")
  const sort = searchParams.get("sort") ?? "newest"

  const data = await getCommunityCollections(q, sort)

  return NextResponse.json(successResponse(data))
}
