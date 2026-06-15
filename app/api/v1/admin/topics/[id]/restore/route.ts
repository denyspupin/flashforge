import { NextResponse } from "next/server"
import { eq, sql } from "drizzle-orm"

import { errorResponse, successResponse } from "@/lib/api/response"
import { requireAdmin } from "@/lib/auth/user"
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
  return NextResponse.json(successResponse({ id, restored: true }))
}
