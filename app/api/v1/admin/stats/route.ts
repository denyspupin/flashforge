import { NextResponse } from "next/server"

import { errorResponse, successResponse } from "@/lib/api/response"
import { requireAdmin } from "@/lib/auth/user"
import { loadAdminStats } from "@/lib/cache/admin-stats"

export const dynamic = "force-dynamic"

export async function GET() {
  const admin = await requireAdmin()

  if (!admin) {
    return NextResponse.json(
      errorResponse("Forbidden", "FORBIDDEN"),
      { status: 403 },
    )
  }

  const stats = await loadAdminStats()
  return NextResponse.json(successResponse(stats))
}
