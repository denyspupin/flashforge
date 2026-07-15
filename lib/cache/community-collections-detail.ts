import { unstable_cache } from "next/cache"
import { db } from "@/lib/db/client"
import {
  cards,
  collections,
  collectionDecks,
  decks,
  deckTopics,
  languages,
  topics,
  users,
} from "@/lib/db/schema"
import { eq, and, inArray, asc, sql } from "drizzle-orm"
import { enrichLanguage } from "@/lib/languages/flags"
import { COMMUNITY_COLLECTIONS_CACHE_TAG } from "@/lib/cache/community-collections"

export { COMMUNITY_COLLECTIONS_CACHE_TAG }

export const COMMUNITY_COLLECTIONS_DETAIL_CACHE_TAG =
  "community-collections-detail"

export type CommunityCollectionDeck = {
  id: string
  title: string
  slug: string
  description: string | null
  visibility: "public"
  sourceLanguageId: string
  targetLanguageId: string
  creatorId: string
  isCurated: boolean
  forkedFromDeckId: string | null
  cardCount: number
  position: number
  topics: { id: string; name: string; slug: string }[]
}

export type CommunityCollectionDetailResult = {
  id: string
  title: string
  slug: string
  description: string | null
  visibility: "public"
  creatorId: string
  creatorName: string
  isCurated: boolean
  forkedFromCollectionId: string | null
  sourceLanguageId: string
  targetLanguageId: string
  sourceLanguage: ReturnType<typeof enrichLanguage> | null
  targetLanguage: ReturnType<typeof enrichLanguage> | null
  createdAt: Date
  deckCount: number
  totalCards: number
  decks: CommunityCollectionDeck[]
} | null

export const getCommunityCollectionById = unstable_cache(
  async (id: string): Promise<CommunityCollectionDetailResult> => {
    const collectionRows = await db
      .select()
      .from(collections)
      .where(and(eq(collections.id, id), eq(collections.visibility, "public")))

    if (!collectionRows.length) {
      return null
    }

    const collection = collectionRows[0]

    const [creatorRows, languageRows, deckRows] = await Promise.all([
      db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(eq(users.id, collection.creatorId)),
      db
        .select()
        .from(languages)
        .where(
          inArray(languages.id, [
            collection.sourceLanguageId,
            collection.targetLanguageId,
          ])
        ),
      db
        .select({
          id: collectionDecks.deckId,
          position: collectionDecks.position,
          title: decks.title,
          slug: decks.slug,
          description: decks.description,
          sourceLanguageId: decks.sourceLanguageId,
          targetLanguageId: decks.targetLanguageId,
          creatorId: decks.creatorId,
          isCurated: decks.isCurated,
          forkedFromDeckId: decks.forkedFromDeckId,
          cardCount: sql<number>`(
            SELECT count(*)::int FROM ${cards} WHERE ${cards.deckId} = ${decks.id}
          )`,
        })
        .from(collectionDecks)
        .innerJoin(decks, eq(decks.id, collectionDecks.deckId))
        .where(eq(collectionDecks.collectionId, id))
        .orderBy(asc(collectionDecks.position), asc(collectionDecks.createdAt)),
    ])

    const deckIds = deckRows.map((d) => d.id)

    const topicRelations = deckIds.length
      ? await db
          .select({
            deckId: deckTopics.deckId,
            id: topics.id,
            name: topics.name,
            slug: topics.slug,
          })
          .from(deckTopics)
          .innerJoin(topics, eq(topics.id, deckTopics.topicId))
          .where(inArray(deckTopics.deckId, deckIds))
      : []

    const topicsByDeck = topicRelations.reduce<
      Map<string, { id: string; name: string; slug: string }[]>
    >((acc, row) => {
      const list = acc.get(row.deckId) ?? []
      list.push({ id: row.id, name: row.name, slug: row.slug })
      acc.set(row.deckId, list)
      return acc
    }, new Map())

    const sourceLanguage = languageRows.find(
      (l) => l.id === collection.sourceLanguageId
    )
    const targetLanguage = languageRows.find(
      (l) => l.id === collection.targetLanguageId
    )

    return {
      id: collection.id,
      title: collection.title,
      slug: collection.slug,
      description: collection.description,
      visibility: "public" as const,
      creatorId: collection.creatorId,
      creatorName: creatorRows[0]?.name ?? "Unknown",
      isCurated: collection.isCurated,
      forkedFromCollectionId: collection.forkedFromCollectionId,
      sourceLanguageId: collection.sourceLanguageId,
      targetLanguageId: collection.targetLanguageId,
      sourceLanguage: sourceLanguage ? enrichLanguage(sourceLanguage) : null,
      targetLanguage: targetLanguage ? enrichLanguage(targetLanguage) : null,
      createdAt: collection.createdAt,
      deckCount: deckRows.length,
      totalCards: deckRows.reduce((sum, d) => sum + (d.cardCount ?? 0), 0),
      decks: deckRows.map((row) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        description: row.description,
        visibility: "public" as const,
        sourceLanguageId: row.sourceLanguageId,
        targetLanguageId: row.targetLanguageId,
        creatorId: row.creatorId,
        isCurated: row.isCurated,
        forkedFromDeckId: row.forkedFromDeckId,
        cardCount: row.cardCount ?? 0,
        position: row.position,
        topics: topicsByDeck.get(row.id) ?? [],
      })),
    }
  },
  ["community-collection-detail"],
  { revalidate: 300, tags: [COMMUNITY_COLLECTIONS_DETAIL_CACHE_TAG] }
)
