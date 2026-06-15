import { NextResponse } from "next/server"
import { z } from "zod"
import { eq, sql } from "drizzle-orm"

import { errorResponse, successResponse } from "@/lib/api/response"
import { requireAdmin } from "@/lib/auth/user"
import { db } from "@/lib/db/client"
import { topics } from "@/lib/db/schema"

export const dynamic = "force-dynamic"

const updateSchema = z.object({
  name: z.string().trim().min(1).max(256).optional(),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(256)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, digits, or hyphens")
    .optional(),
})

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

  if (parsed.data.name === undefined && parsed.data.slug === undefined) {
    return NextResponse.json(
      errorResponse("No fields to update", "VALIDATION_ERROR"),
      { status: 400 },
    )
  }

  const update: Record<string, unknown> = { updatedAt: sql`now()` }
  if (parsed.data.name !== undefined) update.name = parsed.data.name
  if (parsed.data.slug !== undefined) update.slug = parsed.data.slug

  try {
    const [updated] = await db
      .update(topics)
      .set(update)
      .where(eq(topics.id, id))
      .returning()
    if (!updated) {
      return NextResponse.json(errorResponse("Topic not found", "NOT_FOUND"), {
        status: 404,
      })
    }
    return NextResponse.json(successResponse(updated))
  } catch (err) {
    if (err instanceof Error && err.message.includes("topics_slug_unique")) {
      return NextResponse.json(
        errorResponse("A topic with this slug already exists", "CONFLICT"),
        { status: 409 },
      )
    }
    throw err
  }
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
    .update(topics)
    .set({ deletedAt: sql`now()`, updatedAt: sql`now()` })
    .where(eq(topics.id, id))
    .returning({ id: topics.id })

  if (!updated) {
    return NextResponse.json(errorResponse("Topic not found", "NOT_FOUND"), {
      status: 404,
    })
  }
  return NextResponse.json(
    successResponse({ id, deletedAt: new Date().toISOString() }),
  )
}
