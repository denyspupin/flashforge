import { unstable_cache } from "next/cache"
import { db } from "@/lib/db/client"
import { cards, decks, deckTopics, topics, users } from "@/lib/db/schema"
import { eq, and, sql, ilike, inArray, desc, asc } from "drizzle-orm"

export type CommunityDecksResult = Array<{
  id: string
  title: string
  slug: string
  description: string | null
  visibility: "private" | "public"
  sourceLanguageId: string
  targetLanguageId: string
  creatorId: string
  creatorName: string | null
  isCurated: boolean
  forkedFromDeckId: string | null
  createdAt: Date
  cardCount: number
  topics: { id: string; name: string; slug: string }[]
}>

export const COMMUNITY_DECKS_CACHE_TAG = "community-decks"

export const getCommunityDecks = unstable_cache(
  async (
    q: string | null,
    topicId: string | null,
    sort: string
  ): Promise<CommunityDecksResult> => {
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
          SELECT count(*)::int FROM ${cards} WHERE ${cards.deckId} = decks.id
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
        .orderBy(
          sort === "oldest" ? asc(decks.createdAt) : desc(decks.createdAt)
        )
    } else {
      rows = await baseQuery
        .where(whereClause)
        .orderBy(
          sort === "oldest" ? asc(decks.createdAt) : desc(decks.createdAt)
        )
    }

    let topicsByDeck: Map<
      string,
      { id: string; name: string; slug: string }[]
    > = new Map()

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

    return rows.map((row) => ({
      ...row,
      topics: topicsByDeck.get(row.id) ?? [],
    }))
  },
  ["community-decks"],
  { revalidate: 60, tags: [COMMUNITY_DECKS_CACHE_TAG] }
)
