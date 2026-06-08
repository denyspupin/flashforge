import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { decks, deckTopics, cards } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"
import { successResponse, errorResponse } from "@/lib/api/response"
import { requireCurrentUser } from "@/lib/auth/user"
import { z } from "zod"

export const dynamic = "force-dynamic"

const createDeckSchema = z.object({
  title: z.string().min(1).max(256),
  description: z.string().optional(),
  sourceLanguageId: z.string().uuid(),
  targetLanguageId: z.string().uuid(),
  topicIds: z.array(z.string().uuid()).optional(),
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

  const userDecks = await db
    .select({
      id: decks.id,
      title: decks.title,
      slug: decks.slug,
      description: decks.description,
      visibility: decks.visibility,
      sourceLanguageId: decks.sourceLanguageId,
      targetLanguageId: decks.targetLanguageId,
      creatorId: decks.creatorId,
      isCurated: decks.isCurated,
      forkedFromDeckId: decks.forkedFromDeckId,
      createdAt: decks.createdAt,
      updatedAt: decks.updatedAt,
      cardCount: sql<number>`(
        SELECT count(*)::int FROM ${cards} WHERE ${cards.deckId} = ${decks.id}
      )`,
    })
    .from(decks)
    .where(eq(decks.creatorId, user.id))

  return NextResponse.json(successResponse(userDecks))
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
  const parsed = createDeckSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      errorResponse("Invalid request body", "VALIDATION_ERROR"),
      { status: 400 }
    )
  }

  const slug = parsed.data.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

  const [deck] = await db
    .insert(decks)
    .values({
      title: parsed.data.title,
      slug,
      description: parsed.data.description || null,
      sourceLanguageId: parsed.data.sourceLanguageId,
      targetLanguageId: parsed.data.targetLanguageId,
      creatorId: user.id,
      visibility: parsed.data.visibility,
    })
    .returning()

  if (parsed.data.topicIds?.length) {
    await db.insert(deckTopics).values(
      parsed.data.topicIds.map((topicId) => ({
        deckId: deck.id,
        topicId,
      }))
    )
  }

  return NextResponse.json(successResponse(deck))
}
