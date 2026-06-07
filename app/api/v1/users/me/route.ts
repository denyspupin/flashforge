import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db/client"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { successResponse, errorResponse } from "@/lib/api/response"

export const dynamic = "force-dynamic"

export async function GET() {
  const { userId: clerkId } = await auth()

  if (!clerkId) {
    return NextResponse.json(
      errorResponse("Authentication required", "UNAUTHORIZED"),
      { status: 401 }
    )
  }

  const data = await db.select().from(users).where(eq(users.clerkId, clerkId))

  if (!data.length) {
    return NextResponse.json(
      errorResponse("User not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  return NextResponse.json(successResponse(data[0]))
}
