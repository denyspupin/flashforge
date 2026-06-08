import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { studySessions } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { successResponse, errorResponse } from "@/lib/api/response"
import { requireCurrentUser } from "@/lib/auth/user"

export const dynamic = "force-dynamic"

export async function GET() {
  const user = await requireCurrentUser()

  if (!user) {
    return NextResponse.json(
      errorResponse("Authentication required", "UNAUTHORIZED"),
      { status: 401 }
    )
  }

  const data = await db
    .select()
    .from(studySessions)
    .where(eq(studySessions.userId, user.id))

  return NextResponse.json(successResponse(data))
}
