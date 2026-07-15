import { eq, sql } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"

import { errorResponse, successResponse } from "@/lib/api/response"
import { requireAdmin } from "@/lib/auth/user"
import { PROMPT_TEMPLATES } from "@/lib/constants"
import { db } from "@/lib/db/client"
import { promptTemplates } from "@/lib/db/schema"
import { getAdminPrompt } from "@/lib/queries/admin-prompts"

export const dynamic = "force-dynamic"

const updateSchema = z.object({
  description: z
    .string()
    .trim()
    .max(PROMPT_TEMPLATES.MAX_DESCRIPTION_LENGTH)
    .optional()
    .nullable(),
  changelog: z.string().trim().max(2000).optional().nullable(),
})

export async function GET(
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
  const prompt = await getAdminPrompt(id)
  if (!prompt) {
    return NextResponse.json(errorResponse("Prompt not found", "NOT_FOUND"), {
      status: 404,
    })
  }
  return NextResponse.json(successResponse(prompt))
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json(errorResponse("Forbidden", "FORBIDDEN"), {
      status: 403,
    })
  }

  const { id } = await params
  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      errorResponse("Invalid request body", "VALIDATION_ERROR"),
      { status: 400 },
    )
  }

  if (
    parsed.data.description === undefined &&
    parsed.data.changelog === undefined
  ) {
    return NextResponse.json(
      errorResponse("No fields to update", "VALIDATION_ERROR"),
      { status: 400 },
    )
  }

  const update: Record<string, unknown> = { updatedAt: sql`now()` }
  if (parsed.data.description !== undefined) {
    update.description = parsed.data.description
  }
  if (parsed.data.changelog !== undefined) {
    update.changelog = parsed.data.changelog
  }

  const [updated] = await db
    .update(promptTemplates)
    .set(update)
    .where(eq(promptTemplates.id, id))
    .returning()

  if (!updated) {
    return NextResponse.json(errorResponse("Prompt not found", "NOT_FOUND"), {
      status: 404,
    })
  }
  return NextResponse.json(successResponse(updated))
}

export async function DELETE(
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
  const existing = await getAdminPrompt(id)
  if (!existing) {
    return NextResponse.json(errorResponse("Prompt not found", "NOT_FOUND"), {
      status: 404,
    })
  }

  if (existing.isActive) {
    return NextResponse.json(
      errorResponse(
        "Cannot delete the active version. Activate another version first.",
        "CONFLICT",
      ),
      { status: 409 },
    )
  }

  const [deleted] = await db
    .update(promptTemplates)
    .set({ deletedAt: sql`now()`, updatedAt: sql`now()` })
    .where(eq(promptTemplates.id, id))
    .returning({ id: promptTemplates.id })

  if (!deleted) {
    return NextResponse.json(errorResponse("Prompt not found", "NOT_FOUND"), {
      status: 404,
    })
  }

  return NextResponse.json(
    successResponse({ id, deletedAt: new Date().toISOString() }),
  )
}
