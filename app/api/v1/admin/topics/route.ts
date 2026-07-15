import { NextResponse } from "next/server"
import { revalidateCache } from "@/lib/cache/revalidate"
import { z } from "zod"
import { asc, eq, isNull, sql } from "drizzle-orm"

import { errorResponse, successResponse } from "@/lib/api/response"
import { requireAdmin } from "@/lib/auth/user"
import { TOPICS_CACHE_TAG } from "@/lib/cache/topics"
import { db } from "@/lib/db/client"
import { deckTopics, decks, topics } from "@/lib/db/schema"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  name: z.string().trim().min(1).max(256),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(256)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, digits, or hyphens")
    .optional(),
})

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 256)
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json(errorResponse("Forbidden", "FORBIDDEN"), {
      status: 403,
    })
  }

  const rows = await db
    .select({
      id: topics.id,
      name: topics.name,
      slug: topics.slug,
      deletedAt: topics.deletedAt,
      createdAt: topics.createdAt,
      deckCount: sql<number>`(
        SELECT count(*)::int FROM ${deckTopics}
        INNER JOIN ${decks} ON ${decks.id} = ${deckTopics.deckId}
        WHERE ${deckTopics.topicId} = ${topics.id}
          AND ${decks.deletedAt} IS NULL
      )`,
    })
    .from(topics)
    .orderBy(asc(topics.name))

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

  const slug = parsed.data.slug || slugify(parsed.data.name)
  if (!slug) {
    return NextResponse.json(
      errorResponse("Could not derive slug from name", "VALIDATION_ERROR"),
      { status: 400 },
    )
  }

  try {
    const [created] = await db
      .insert(topics)
      .values({ name: parsed.data.name, slug })
      .returning()

    revalidateCache(TOPICS_CACHE_TAG)

    return NextResponse.json(successResponse(created), { status: 201 })
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
