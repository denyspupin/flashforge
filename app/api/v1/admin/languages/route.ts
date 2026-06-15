import { NextResponse } from "next/server"
import { z } from "zod"
import { asc, eq, sql } from "drizzle-orm"

import { errorResponse, successResponse } from "@/lib/api/response"
import { requireAdmin } from "@/lib/auth/user"
import { db } from "@/lib/db/client"
import { decks, languages } from "@/lib/db/schema"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  name: z.string().trim().min(1).max(256),
  code: z
    .string()
    .trim()
    .min(2)
    .max(16)
    .regex(/^[a-z]{2,16}$/i, "Code must be 2-16 letters")
    .transform((v) => v.toLowerCase()),
})

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json(errorResponse("Forbidden", "FORBIDDEN"), {
      status: 403,
    })
  }

  const rows = await db
    .select({
      id: languages.id,
      name: languages.name,
      code: languages.code,
      deletedAt: languages.deletedAt,
      createdAt: languages.createdAt,
      deckCount: sql<number>`(
        SELECT count(*)::int FROM ${decks}
        WHERE (decks.source_language_id = languages.id OR decks.target_language_id = languages.id)
          AND decks.deleted_at IS NULL
      )`,
    })
    .from(languages)
    .orderBy(asc(languages.name))

  return NextResponse.json(
    successResponse(
      rows.map((r) => ({
        ...r,
        deletedAt: r.deletedAt ? r.deletedAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
      })),
    ),
  )
}

export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json(errorResponse("Forbidden", "FORBIDDEN"), {
      status: 403,
    })
  }

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      errorResponse("Invalid request body", "VALIDATION_ERROR"),
      { status: 400 },
    )
  }

  try {
    const [created] = await db
      .insert(languages)
      .values({ name: parsed.data.name, code: parsed.data.code })
      .returning()

    return NextResponse.json(successResponse(created), { status: 201 })
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
