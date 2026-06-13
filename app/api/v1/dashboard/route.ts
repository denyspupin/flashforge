import { NextResponse } from "next/server"

import { loadDashboardData } from "@/lib/queries/dashboard"
import { successResponse, errorResponse } from "@/lib/api/response"

export const dynamic = "force-dynamic"

export async function GET() {
  const data = await loadDashboardData()

  if (!data) {
    return NextResponse.json(
      errorResponse("Authentication required", "UNAUTHORIZED"),
      { status: 401 }
    )
  }

  return NextResponse.json(successResponse(data))
}
