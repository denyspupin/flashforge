import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { decks, cards, deckTopics, topics, users } from "@/lib/db/schema"
import { eq, and, sql, ilike, inArray, desc, asc } from "drizzle-orm"
import { successResponse } from "@/lib/api/response"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const topicId = searchParams.get("topicId")
  const q = searchParams.get("q")
  const sort = searchParams.get("sort") ?? "newest"

  const conditions = [eq(decks.visibility, "public")]

  if (q) {
    conditions.push(ilike(decks.title, `%${q}%`))
  }

  const baseQuery = db
    .select({
      id: decks.id,
      title: decks.title,
      slug: decks.slug,
      description: decks.description,
      visibility: decks.visibility,
      sourceLanguageId: decks.sourceLanguageId,
      targetLanguageId: decks.targetLanguageId,
      creatorId: decks.creatorId,
      creatorName: users.name,
      isCurated: decks.isCurated,
      forkedFromDeckId: decks.forkedFromDeckId,
      createdAt: decks.createdAt,
      cardCount: sql<number>`(
        SELECT count(*)::int FROM ${cards} WHERE ${cards.deckId} = ${decks.id}
      )`,
    })
    .from(decks)
    .leftJoin(users, eq(users.id, decks.creatorId))

  const whereClause = topicId
    ? and(...conditions, eq(deckTopics.topicId, topicId))
    : and(...conditions)

  let rows: Awaited<typeof baseQuery>
  if (topicId) {
    rows = await baseQuery
      .innerJoin(deckTopics, eq(deckTopics.deckId, decks.id))
      .where(whereClause)
      .orderBy(sort === "oldest" ? asc(decks.createdAt) : desc(decks.createdAt))
  } else {
    rows = await baseQuery
      .where(whereClause)
      .orderBy(sort === "oldest" ? asc(decks.createdAt) : desc(decks.createdAt))
  }

  let topicsByDeck: Map<string, { id: string; name: string; slug: string }[]> =
    new Map()

  if (rows.length) {
    const deckIds = rows.map((r) => r.id)
    const topicRows = await db
      .select({
        deckId: deckTopics.deckId,
        id: topics.id,
        name: topics.name,
        slug: topics.slug,
      })
      .from(deckTopics)
      .innerJoin(topics, eq(topics.id, deckTopics.topicId))
      .where(inArray(deckTopics.deckId, deckIds))

    topicsByDeck = topicRows.reduce((acc, row) => {
      const list = acc.get(row.deckId) ?? []
      list.push({ id: row.id, name: row.name, slug: row.slug })
      acc.set(row.deckId, list)
      return acc
    }, new Map<string, { id: string; name: string; slug: string }[]>())
  }

  const data = rows.map((row) => ({
    ...row,
    topics: topicsByDeck.get(row.id) ?? [],
  }))

  return NextResponse.json(successResponse(data))
}
