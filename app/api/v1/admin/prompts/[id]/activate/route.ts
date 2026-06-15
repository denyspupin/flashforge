import { and, eq, isNull, sql } from "drizzle-orm"
import { NextResponse } from "next/server"

import { errorResponse, successResponse } from "@/lib/api/response"
import { requireAdmin } from "@/lib/auth/user"
import { db } from "@/lib/db/client"
import { promptTemplates } from "@/lib/db/schema"
import { getAdminPrompt } from "@/lib/queries/admin-prompts"

export const dynamic = "force-dynamic"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json(errorResponse("Forbidden", "FORBIDDEN"), {
      status: 403,
    })
  }

  const { id } = await params
  const target = await getAdminPrompt(id)
  if (!target) {
    return NextResponse.json(errorResponse("Prompt not found", "NOT_FOUND"), {
      status: 404,
    })
  }

  if (target.deletedAt) {
    return NextResponse.json(
      errorResponse("Cannot activate a deleted version", "CONFLICT"),
      { status: 409 },
    )
  }

  await db
    .update(promptTemplates)
    .set({ isActive: false, updatedAt: sql`now()` })
    .where(
      and(
        eq(promptTemplates.slug, target.slug),
        isNull(promptTemplates.deletedAt),
      ),
    )

  const [activated] = await db
    .update(promptTemplates)
    .set({ isActive: true, updatedAt: sql`now()` })
    .where(eq(promptTemplates.id, id))
    .returning()

  if (!activated) {
    return NextResponse.json(errorResponse("Prompt not found", "NOT_FOUND"), {
      status: 404,
    })
  }
  return NextResponse.json(successResponse(activated))
}
