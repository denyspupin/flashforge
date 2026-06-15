import { NextResponse } from "next/server"
import { eq, sql } from "drizzle-orm"

import { errorResponse, successResponse } from "@/lib/api/response"
import { requireAdmin } from "@/lib/auth/user"
import { db } from "@/lib/db/client"
import { users } from "@/lib/db/schema"

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
    .update(users)
    .set({ deletedAt: null, updatedAt: sql`now()` })
    .where(eq(users.id, id))
    .returning({ id: users.id })

  if (!updated) {
    return NextResponse.json(errorResponse("User not found", "NOT_FOUND"), {
      status: 404,
    })
  }

  return NextResponse.json(successResponse({ id, restored: true }))
}
