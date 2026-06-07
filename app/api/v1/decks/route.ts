import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db/client"
import { decks, users, deckTopics, topics, languages, cards } from "@/lib/db/schema"
import { eq, and, inArray } from "drizzle-orm"
import { successResponse, errorResponse } from "@/lib/api/response"
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
  const { userId: clerkId } = await auth()

  if (!clerkId) {
    return NextResponse.json(
      errorResponse("Authentication required", "UNAUTHORIZED"),
      { status: 401 }
    )
  }

  const user = await db.select().from(users).where(eq(users.clerkId, clerkId))

  if (!user.length) {
    return NextResponse.json(
      errorResponse("User not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  const userDecks = await db
    .select()
    .from(decks)
    .where(eq(decks.creatorId, user[0].id))

  return NextResponse.json(successResponse(userDecks))
}

export async function POST(request: Request) {
  const { userId: clerkId } = await auth()

  if (!clerkId) {
    return NextResponse.json(
      errorResponse("Authentication required", "UNAUTHORIZED"),
      { status: 401 }
    )
  }

  const user = await db.select().from(users).where(eq(users.clerkId, clerkId))

  if (!user.length) {
    return NextResponse.json(
      errorResponse("User not found", "NOT_FOUND"),
      { status: 404 }
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
      creatorId: user[0].id,
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
