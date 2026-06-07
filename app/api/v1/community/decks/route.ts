import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { decks } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { successResponse } from "@/lib/api/response"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const topicId = searchParams.get("topicId")

  let query = db.select().from(decks).where(eq(decks.visibility, "public"))

  if (topicId) {
    // TODO: filter by topic via join
  }

  const data = await query
  return NextResponse.json(successResponse(data))
}
