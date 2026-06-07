import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db/client"
import { notifications, users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { successResponse, errorResponse } from "@/lib/api/response"

export const dynamic = "force-dynamic"

export async function PATCH() {
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

  await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.userId, user[0].id))

  return NextResponse.json(successResponse({ success: true }))
}
