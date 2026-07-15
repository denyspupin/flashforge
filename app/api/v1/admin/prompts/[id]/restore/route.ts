import { eq, sql } from "drizzle-orm"
import { NextResponse } from "next/server"

import { errorResponse, successResponse } from "@/lib/api/response"
import { requireAdmin } from "@/lib/auth/user"
import { db } from "@/lib/db/client"
import { promptTemplates } from "@/lib/db/schema"

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
  const [restored] = await db
    .update(promptTemplates)
    .set({ deletedAt: null, updatedAt: sql`now()` })
    .where(eq(promptTemplates.id, id))
    .returning({ id: promptTemplates.id })

  if (!restored) {
    return NextResponse.json(errorResponse("Prompt not found", "NOT_FOUND"), {
      status: 404,
    })
  }
  return NextResponse.json(successResponse({ id, restored: true }))
}
