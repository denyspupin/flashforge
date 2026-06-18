import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import {
  collections,
  collectionDecks,
  cards,
} from "@/lib/db/schema"
import { eq, sql, isNull, and, desc } from "drizzle-orm"
import { successResponse, errorResponse } from "@/lib/api/response"
import { requireCurrentUser } from "@/lib/auth/user"
import { uniqueCollectionSlug } from "@/lib/slug"
import { z } from "zod"

export const dynamic = "force-dynamic"

const createCollectionSchema = z.object({
  title: z.string().min(1).max(256),
  description: z.string().optional(),
  sourceLanguageId: z.string().uuid(),
  targetLanguageId: z.string().uuid(),
})

export async function GET() {
  const user = await requireCurrentUser()

  if (!user) {
    return NextResponse.json(
      errorResponse("Authentication required", "UNAUTHORIZED"),
      { status: 401 }
    )
  }

  const rows = await db
    .select({
      id: collections.id,
      title: collections.title,
      slug: collections.slug,
      description: collections.description,
      creatorId: collections.creatorId,
      sourceLanguageId: collections.sourceLanguageId,
      targetLanguageId: collections.targetLanguageId,
      createdAt: collections.createdAt,
      updatedAt: collections.updatedAt,
      deckCount: sql<number>`(
        SELECT count(*)::int FROM ${collectionDecks}
        WHERE ${collectionDecks.collectionId} = ${collections.id}
      )`,
      totalCards: sql<number>`(
        SELECT COALESCE(count(*)::int, 0)
        FROM ${cards}
        WHERE ${cards.deckId} IN (
          SELECT ${collectionDecks.deckId}
          FROM ${collectionDecks}
          WHERE ${collectionDecks.collectionId} = ${collections.id}
        )
      )`,
    })
    .from(collections)
    .where(and(eq(collections.creatorId, user.id), isNull(collections.deletedAt)))
    .orderBy(desc(collections.createdAt))

  return NextResponse.json(successResponse(rows))
}

export async function POST(request: Request) {
  const user = await requireCurrentUser()

  if (!user) {
    return NextResponse.json(
      errorResponse("Authentication required", "UNAUTHORIZED"),
      { status: 401 }
    )
  }

  const body = await request.json()
  const parsed = createCollectionSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      errorResponse("Invalid request body", "VALIDATION_ERROR"),
      { status: 400 }
    )
  }

  const slug = await uniqueCollectionSlug(parsed.data.title)

  const [created] = await db
    .insert(collections)
    .values({
      title: parsed.data.title,
      slug,
      description: parsed.data.description || null,
      creatorId: user.id,
      sourceLanguageId: parsed.data.sourceLanguageId,
      targetLanguageId: parsed.data.targetLanguageId,
    })
    .returning()

  return NextResponse.json(successResponse(created))
}
