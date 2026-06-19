import { NextResponse } from "next/server"
import { z } from "zod"
import { eq, sql } from "drizzle-orm"

import { errorResponse, successResponse } from "@/lib/api/response"
import { requireAdmin } from "@/lib/auth/user"
import { db } from "@/lib/db/client"
import { collections } from "@/lib/db/schema"
import { getAdminCollection } from "@/lib/queries/admin-collections"
import { slugify } from "@/lib/slug"

export const dynamic = "force-dynamic"

const updateSchema = z.object({
  title: z.string().trim().min(1).max(256).optional(),
  description: z.string().max(2048).nullable().optional(),
  sourceLanguageId: z.string().uuid().optional(),
  targetLanguageId: z.string().uuid().optional(),
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
  const collection = await getAdminCollection(id)
  if (!collection) {
    return NextResponse.json(
      errorResponse("Collection not found", "NOT_FOUND"),
      { status: 404 },
    )
  }
  return NextResponse.json(successResponse(collection))
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
    parsed.data.title === undefined &&
    parsed.data.description === undefined &&
    parsed.data.sourceLanguageId === undefined &&
    parsed.data.targetLanguageId === undefined
  ) {
    return NextResponse.json(
      errorResponse("No fields to update", "VALIDATION_ERROR"),
      { status: 400 },
    )
  }

  const update: Record<string, unknown> = { updatedAt: sql`now()` }
  if (parsed.data.title !== undefined) {
    update.title = parsed.data.title
    update.slug = slugify(parsed.data.title)
  }
  if (parsed.data.description !== undefined)
    update.description = parsed.data.description
  if (parsed.data.sourceLanguageId !== undefined)
    update.sourceLanguageId = parsed.data.sourceLanguageId
  if (parsed.data.targetLanguageId !== undefined)
    update.targetLanguageId = parsed.data.targetLanguageId

  const [updated] = await db
    .update(collections)
    .set(update)
    .where(eq(collections.id, id))
    .returning({ id: collections.id })

  if (!updated) {
    return NextResponse.json(
      errorResponse("Collection not found", "NOT_FOUND"),
      { status: 404 },
    )
  }

  const detail = await getAdminCollection(id)
  return NextResponse.json(successResponse(detail))
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
  const [updated] = await db
    .update(collections)
    .set({ deletedAt: sql`now()`, updatedAt: sql`now()` })
    .where(eq(collections.id, id))
    .returning({ id: collections.id })

  if (!updated) {
    return NextResponse.json(
      errorResponse("Collection not found", "NOT_FOUND"),
      { status: 404 },
    )
  }

  return NextResponse.json(
    successResponse({ id, deletedAt: new Date().toISOString() }),
  )
}
