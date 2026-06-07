import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db/client"
import { studySessions, users } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { successResponse, errorResponse } from "@/lib/api/response"

export const dynamic = "force-dynamic"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const { userId: clerkId } = await auth()

  if (!clerkId) {
    return NextResponse.json(
      errorResponse("Authentication required", "UNAUTHORIZED"),
      { status: 401 }
    )
  }

  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))

  if (!userRows.length) {
    return NextResponse.json(
      errorResponse("User not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  const sessionRows = await db
    .select()
    .from(studySessions)
    .where(
      and(
        eq(studySessions.id, sessionId),
        eq(studySessions.userId, userRows[0].id),
        eq(studySessions.status, "active")
      )
    )

  if (!sessionRows.length) {
    return NextResponse.json(
      errorResponse("Active session not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  const [updated] = await db
    .update(studySessions)
    .set({
      status: "abandoned",
      updatedAt: new Date(),
    })
    .where(eq(studySessions.id, sessionId))
    .returning()

  return NextResponse.json(successResponse(updated))
}
