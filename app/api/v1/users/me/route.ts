import { NextResponse } from "next/server"
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

  return NextResponse.json(successResponse(user))
}
