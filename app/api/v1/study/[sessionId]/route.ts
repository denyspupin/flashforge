import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db/client"
import { studySessions, users } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { successResponse, errorResponse } from "@/lib/api/response"

export const dynamic = "force-dynamic"

export async function GET(
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

  const user = await db.select().from(users).where(eq(users.clerkId, clerkId))

  if (!user.length) {
    return NextResponse.json(
      errorResponse("User not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  const data = await db
    .select()
    .from(studySessions)
    .where(
      and(
        eq(studySessions.id, sessionId),
        eq(studySessions.userId, user[0].id)
      )
    )

  if (!data.length) {
    return NextResponse.json(
      errorResponse("Session not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  return NextResponse.json(successResponse(data[0]))
}
