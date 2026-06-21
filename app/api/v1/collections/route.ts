import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import {
  collections,
  collectionDecks,
  cards,
  decks,
} from "@/lib/db/schema"
import { eq, sql, isNull, and, desc, inArray } from "drizzle-orm"
import { successResponse, errorResponse } from "@/lib/api/response"
import { requireCurrentUser } from "@/lib/auth/user"
import { uniqueCollectionSlug } from "@/lib/slug"
import { revalidateCache } from "@/lib/cache/revalidate"
import {
  COMMUNITY_COLLECTIONS_CACHE_TAG,
  COMMUNITY_COLLECTIONS_DETAIL_CACHE_TAG,
} from "@/lib/cache/community-collections-detail"
import { z } from "zod"

export const dynamic = "force-dynamic"

const createCollectionSchema = z.object({
  title: z.string().min(1).max(256),
  description: z.string().optional(),
  sourceLanguageId: z.string().uuid(),
  targetLanguageId: z.string().uuid(),
  visibility: z.enum(["private", "public"]).default("private"),
})

export async function GET() {
  const user = await requireCurrentUser()

  if (!user) {
    return NextResponse.json(
      errorResponse("Authentication required", "UNAUTHORIZED"),
      { status: 401 }
    )
  }

  const query = db
    .select({
      id: collections.id,
      title: collections.title,
      slug: collections.slug,
      description: collections.description,
      visibility: collections.visibility,
      creatorId: collections.creatorId,
      isCurated: collections.isCurated,
      forkedFromCollectionId: collections.forkedFromCollectionId,
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
        FROM ${cards} c
        WHERE EXISTS (
          SELECT 1 FROM ${collectionDecks} cd
          WHERE cd.deck_id = c.deck_id
          AND cd.collection_id = ${sql.raw('"collections"."id"')}
        )
      )`,
    })
    .from(collections)
    .where(and(eq(collections.creatorId, user.id), isNull(collections.deletedAt)))
    .orderBy(desc(collections.createdAt))

  const rows = await query

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
      visibility: parsed.data.visibility,
      creatorId: user.id,
      sourceLanguageId: parsed.data.sourceLanguageId,
      targetLanguageId: parsed.data.targetLanguageId,
    })
    .returning()

  if (created.visibility === "public") {
    const memberRows = await db
      .select({ deckId: collectionDecks.deckId })
      .from(collectionDecks)
      .where(eq(collectionDecks.collectionId, created.id))
    const memberDeckIds = memberRows.map((r) => r.deckId)
    if (memberDeckIds.length) {
      await db
        .update(decks)
        .set({ visibility: "public" })
        .where(
          and(
            inArray(decks.id, memberDeckIds),
            eq(decks.creatorId, user.id)
          )
        )
    }
  }

  revalidateCache(COMMUNITY_COLLECTIONS_CACHE_TAG)
  revalidateCache(COMMUNITY_COLLECTIONS_DETAIL_CACHE_TAG)

  return NextResponse.json(successResponse(created))
}
