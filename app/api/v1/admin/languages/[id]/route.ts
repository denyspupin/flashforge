import { NextResponse } from "next/server"
import { z } from "zod"
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm"

import { errorResponse, successResponse } from "@/lib/api/response"
import { requireAdmin } from "@/lib/auth/user"
import { db } from "@/lib/db/client"
import { cards, decks, languages } from "@/lib/db/schema"

export const dynamic = "force-dynamic"

const updateSchema = z.object({
  name: z.string().trim().min(1).max(256).optional(),
  code: z
    .string()
    .trim()
    .min(2)
    .max(16)
    .regex(/^[a-z]{2,16}$/i, "Code must be 2-16 letters")
    .transform((v) => v.toLowerCase())
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

  if (parsed.data.name === undefined && parsed.data.code === undefined) {
    return NextResponse.json(
      errorResponse("No fields to update", "VALIDATION_ERROR"),
      { status: 400 },
    )
  }

  const update: Record<string, unknown> = { updatedAt: sql`now()` }
  if (parsed.data.name !== undefined) update.name = parsed.data.name
  if (parsed.data.code !== undefined) update.code = parsed.data.code

  try {
    const [updated] = await db
      .update(languages)
      .set(update)
      .where(eq(languages.id, id))
      .returning()
    if (!updated) {
      return NextResponse.json(
        errorResponse("Language not found", "NOT_FOUND"),
        { status: 404 },
      )
    }
    return NextResponse.json(successResponse(updated))
  } catch (err) {
    if (err instanceof Error && err.message.includes("languages_code_unique")) {
      return NextResponse.json(
        errorResponse("A language with this code already exists", "CONFLICT"),
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
  const now = sql`now()`

  const [updated] = await db
    .update(languages)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(languages.id, id))
    .returning({ id: languages.id })

  if (!updated) {
    return NextResponse.json(
      errorResponse("Language not found", "NOT_FOUND"),
      { status: 404 },
    )
  }

  const affectedDecks = await db
    .update(decks)
    .set({ deletedAt: now, updatedAt: now, visibility: "private" })
    .where(
      and(
        isNull(decks.deletedAt),
        or(eq(decks.sourceLanguageId, id), eq(decks.targetLanguageId, id)),
      ),
    )
    .returning({ id: decks.id })

  if (affectedDecks.length) {
    await db
      .update(cards)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        inArray(
          cards.deckId,
          affectedDecks.map((d) => d.id),
        ),
      )
  }

  return NextResponse.json(
    successResponse({
      id,
      deletedAt: new Date().toISOString(),
      affectedDeckCount: affectedDecks.length,
    }),
  )
}
