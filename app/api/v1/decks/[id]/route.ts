import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { decks, deckTopics, topics, cards } from "@/lib/db/schema"
import { eq, and, inArray, isNull } from "drizzle-orm"
import { successResponse, errorResponse } from "@/lib/api/response"
import { requireCurrentUser } from "@/lib/auth/user"
import { getActiveLanguageIds } from "@/lib/languages/valid"
import { slugify } from "@/lib/slug"
import { z } from "zod"

export const dynamic = "force-dynamic"

const updateDeckSchema = z.object({
  title: z.string().min(1).max(256).optional(),
  description: z.string().optional(),
  sourceLanguageId: z.string().uuid().optional(),
  targetLanguageId: z.string().uuid().optional(),
  topicIds: z.array(z.string().uuid()).optional(),
  visibility: z.enum(["private", "public"]).optional(),
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await requireCurrentUser()

  if (!user) {
    return NextResponse.json(
      errorResponse("Authentication required", "UNAUTHORIZED"),
      { status: 401 }
    )
  }

  const deck = await db
    .select()
    .from(decks)
    .where(and(eq(decks.id, id), eq(decks.creatorId, user.id)))

  if (!deck.length) {
    return NextResponse.json(
      errorResponse("Deck not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  const deckCards = await db.select().from(cards).where(eq(cards.deckId, id))

  const topicRelations = await db
    .select({ topicId: deckTopics.topicId })
    .from(deckTopics)
    .where(eq(deckTopics.deckId, id))

  const topicIds = topicRelations.map((t) => t.topicId)
  const deckTopicList = topicIds.length
    ? await db
        .select()
        .from(topics)
        .where(and(inArray(topics.id, topicIds), isNull(topics.deletedAt)))
    : []

  return NextResponse.json(
    successResponse({
      ...deck[0],
      cards: deckCards,
      topics: deckTopicList,
    })
  )
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await requireCurrentUser()

  if (!user) {
    return NextResponse.json(
      errorResponse("Authentication required", "UNAUTHORIZED"),
      { status: 401 }
    )
  }

  const body = await request.json()
  const parsed = updateDeckSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      errorResponse("Invalid request body", "VALIDATION_ERROR"),
      { status: 400 }
    )
  }

  const newLanguageIds = [
    parsed.data.sourceLanguageId,
    parsed.data.targetLanguageId,
  ].filter((id): id is string => id !== undefined)

  if (newLanguageIds.length) {
    const activeLanguages = await getActiveLanguageIds(newLanguageIds)
    if (newLanguageIds.some((id) => !activeLanguages.has(id))) {
      return NextResponse.json(
        errorResponse("Selected language is unavailable", "VALIDATION_ERROR"),
        { status: 400 },
      )
    }
  }

  const existing = await db
    .select()
    .from(decks)
    .where(and(eq(decks.id, id), eq(decks.creatorId, user.id)))

  if (!existing.length) {
    return NextResponse.json(
      errorResponse("Deck not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  const updateData: Record<string, unknown> = {}

  if (parsed.data.title !== undefined) {
    updateData.title = parsed.data.title
    updateData.slug = slugify(parsed.data.title)
  }
  if (parsed.data.description !== undefined)
    updateData.description = parsed.data.description
  if (parsed.data.sourceLanguageId !== undefined)
    updateData.sourceLanguageId = parsed.data.sourceLanguageId
  if (parsed.data.targetLanguageId !== undefined)
    updateData.targetLanguageId = parsed.data.targetLanguageId
  if (parsed.data.visibility !== undefined)
    updateData.visibility = parsed.data.visibility

  const [updated] = await db
    .update(decks)
    .set(updateData)
    .where(eq(decks.id, id))
    .returning()

  if (parsed.data.topicIds !== undefined) {
    await db.delete(deckTopics).where(eq(deckTopics.deckId, id))
    if (parsed.data.topicIds.length) {
      await db.insert(deckTopics).values(
        parsed.data.topicIds.map((topicId) => ({
          deckId: id,
          topicId,
        }))
      )
    }
  }

  return NextResponse.json(successResponse(updated))
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await requireCurrentUser()

  if (!user) {
    return NextResponse.json(
      errorResponse("Authentication required", "UNAUTHORIZED"),
      { status: 401 }
    )
  }

  const existing = await db
    .select()
    .from(decks)
    .where(and(eq(decks.id, id), eq(decks.creatorId, user.id)))

  if (!existing.length) {
    return NextResponse.json(
      errorResponse("Deck not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  await db.delete(decks).where(eq(decks.id, id))

  return NextResponse.json(successResponse({ success: true }))
}
