import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { notifications } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { successResponse, errorResponse } from "@/lib/api/response"
import { requireCurrentUser } from "@/lib/auth/user"

export const dynamic = "force-dynamic"

export async function PATCH() {
  const user = await requireCurrentUser()

  if (!user) {
    return NextResponse.json(
      errorResponse("Authentication required", "UNAUTHORIZED"),
      { status: 401 }
    )
  }

  await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.userId, user.id))

  return NextResponse.json(successResponse({ success: true }))
}
