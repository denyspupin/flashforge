import { NextResponse } from "next/server"
import { successResponse } from "@/lib/api/response"
import { getCommunityCollections } from "@/lib/cache/community-collections"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")
  const sort = searchParams.get("sort") ?? "newest"

  const data = await getCommunityCollections(q, sort)

  return NextResponse.json(successResponse(data))
}
