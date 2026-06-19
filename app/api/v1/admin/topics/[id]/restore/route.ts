import { NextResponse } from "next/server"
import { revalidateCache } from "@/lib/cache/revalidate"
import { eq, sql } from "drizzle-orm"

import { errorResponse, successResponse } from "@/lib/api/response"
import { requireAdmin } from "@/lib/auth/user"
import { TOPICS_CACHE_TAG } from "@/lib/cache/topics"
import { db } from "@/lib/db/client"
import { topics } from "@/lib/db/schema"

export const dynamic = "force-dynamic"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json(errorResponse("Forbidden", "FORBIDDEN"), {
      status: 403,
    })
  }

  const { id } = await params
  const [updated] = await db
    .update(topics)
    .set({ deletedAt: null, updatedAt: sql`now()` })
    .where(eq(topics.id, id))
    .returning({ id: topics.id })

  if (!updated) {
    return NextResponse.json(errorResponse("Topic not found", "NOT_FOUND"), {
      status: 404,
    })
  }

  revalidateCache(TOPICS_CACHE_TAG)

  return NextResponse.json(successResponse({ id, restored: true }))
}
