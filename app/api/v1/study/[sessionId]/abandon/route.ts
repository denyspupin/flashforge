import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { studySessions } from "@/lib/db/schema"
import { eq, and, sql } from "drizzle-orm"
import { successResponse, errorResponse } from "@/lib/api/response"
import { requireCurrentUser } from "@/lib/auth/user"
import { MAX_SESSION_DURATION_MS } from "@/lib/constants"
import { z } from "zod"

export const dynamic = "force-dynamic"

const abandonSchema = z.object({
  durationMs: z.number().int().min(0).max(MAX_SESSION_DURATION_MS).optional(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const user = await requireCurrentUser()

  if (!user) {
    return NextResponse.json(
      errorResponse("Authentication required", "UNAUTHORIZED"),
      { status: 401 }
    )
  }

  const sessionRows = await db
    .select()
    .from(studySessions)
    .where(
      and(
        eq(studySessions.id, sessionId),
        eq(studySessions.userId, user.id),
        eq(studySessions.status, "active")
      )
    )

  if (!sessionRows.length) {
    return NextResponse.json(
      errorResponse("Active session not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  const parsed = abandonSchema.safeParse(
    await request.json().catch(() => ({}))
  )

  if (!parsed.success) {
    return NextResponse.json(
      errorResponse("Invalid request body", "VALIDATION_ERROR"),
      { status: 400 }
    )
  }

  const [updated] = await db
    .update(studySessions)
    .set({
      status: "abandoned",
      durationMs: sql`greatest(${studySessions.durationMs}, ${parsed.data.durationMs ?? 0})`,
      updatedAt: new Date(),
    })
    .where(eq(studySessions.id, sessionId))
    .returning()

  return NextResponse.json(successResponse(updated))
}
