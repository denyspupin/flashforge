import { NextResponse } from "next/server"
import { z } from "zod"
import { eq, sql } from "drizzle-orm"

import { errorResponse, successResponse } from "@/lib/api/response"
import { requireAdmin } from "@/lib/auth/user"
import { db } from "@/lib/db/client"
import { cards, decks } from "@/lib/db/schema"
import { getAdminDeck } from "@/lib/queries/admin-decks"

export const dynamic = "force-dynamic"

const updateSchema = z.object({
  isCurated: z.boolean().optional(),
  title: z.string().min(1).max(256).optional(),
  description: z.string().max(2048).nullable().optional(),
  visibility: z.enum(["private", "public"]).optional(),
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
  const deck = await getAdminDeck(id)
  if (!deck) {
    return NextResponse.json(errorResponse("Deck not found", "NOT_FOUND"), {
      status: 404,
    })
  }
  return NextResponse.json(successResponse(deck))
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
    parsed.data.isCurated === undefined &&
    parsed.data.title === undefined &&
    parsed.data.description === undefined &&
    parsed.data.visibility === undefined
  ) {
    return NextResponse.json(
      errorResponse("No fields to update", "VALIDATION_ERROR"),
      { status: 400 },
    )
  }

  const update: Record<string, unknown> = { updatedAt: sql`now()` }
  if (parsed.data.isCurated !== undefined) update.isCurated = parsed.data.isCurated
  if (parsed.data.title !== undefined) update.title = parsed.data.title
  if (parsed.data.description !== undefined)
    update.description = parsed.data.description
  if (parsed.data.visibility !== undefined)
    update.visibility = parsed.data.visibility

  const [updated] = await db
    .update(decks)
    .set(update)
    .where(eq(decks.id, id))
    .returning({ id: decks.id })

  if (!updated) {
    return NextResponse.json(errorResponse("Deck not found", "NOT_FOUND"), {
      status: 404,
    })
  }

  const detail = await getAdminDeck(id)
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
  const now = sql`now()`

  const [updated] = await db
    .update(decks)
    .set({ deletedAt: now, updatedAt: now, visibility: "private" })
    .where(eq(decks.id, id))
    .returning({ id: decks.id })

  if (!updated) {
    return NextResponse.json(errorResponse("Deck not found", "NOT_FOUND"), {
      status: 404,
    })
  }

  await db
    .update(cards)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(cards.deckId, id))

  return NextResponse.json(
    successResponse({ id, deletedAt: new Date().toISOString() }),
  )
}
