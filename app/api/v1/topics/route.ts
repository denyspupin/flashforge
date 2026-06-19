import { NextResponse } from "next/server"
import { successResponse } from "@/lib/api/response"
import { getActiveTopics } from "@/lib/cache/topics"

export const dynamic = "force-dynamic"

export async function GET() {
  const data = await getActiveTopics()
  return NextResponse.json(successResponse(data))
}
