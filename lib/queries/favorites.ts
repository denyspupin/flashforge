import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm"

import { db } from "@/lib/db/client"
import {
  cards,
  collectionDecks,
  collections,
  deckTopics,
  decks,
  favoriteCollections,
  favoriteDecks,
  languages,
  topics,
} from "@/lib/db/schema"
import { requireCurrentUser } from "@/lib/auth/user"
import { enrichLanguages } from "@/lib/languages/flags"
import type { Collection, Deck, Language } from "@/types"

export type FavoritesData = {
  favoriteDecks: Deck[]
  favoriteCollections: Collection[]
  languagesById: Record<string, Language>
}

export async function loadFavorites(): Promise<FavoritesData | null> {
  const user = await requireCurrentUser()
  if (!user) return null

  const [favoriteDeckRows, favoriteCollectionRows] = await Promise.all([
    db
      .select({
        id: decks.id,
        title: decks.title,
        slug: decks.slug,
        description: decks.description,
        visibility: decks.visibility,
        sourceLanguageId: decks.sourceLanguageId,
        targetLanguageId: decks.targetLanguageId,
        creatorId: decks.creatorId,
        forkedFromDeckId: decks.forkedFromDeckId,
        createdAt: decks.createdAt,
        updatedAt: decks.updatedAt,
        cardCount: sql<number>`(
          SELECT count(*)::int FROM ${cards} WHERE ${cards.deckId} = decks.id
        )`,
      })
      .from(favoriteDecks)
      .innerJoin(decks, eq(decks.id, favoriteDecks.deckId))
      .where(and(eq(favoriteDecks.userId, user.id), isNull(decks.deletedAt)))
      .orderBy(desc(favoriteDecks.createdAt)),
    db
      .select({
        id: collections.id,
        title: collections.title,
        slug: collections.slug,
        description: collections.description,
        visibility: collections.visibility,
        creatorId: collections.creatorId,
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
      .from(favoriteCollections)
      .innerJoin(
        collections,
        eq(collections.id, favoriteCollections.collectionId),
      )
      .where(
        and(
          eq(favoriteCollections.userId, user.id),
          isNull(collections.deletedAt),
        ),
      )
      .orderBy(desc(favoriteCollections.createdAt)),
  ])

  const languageIds = Array.from(
    new Set(
      [...favoriteDeckRows, ...favoriteCollectionRows].flatMap((row) => [
        row.sourceLanguageId,
        row.targetLanguageId,
      ]),
    ),
  )
  const deckIds = favoriteDeckRows.map((row) => row.id)

  const [languageRows, topicIdsForDecks] = await Promise.all([
    languageIds.length === 0
      ? []
      : db
          .select()
          .from(languages)
          .where(
            and(
              inArray(languages.id, languageIds),
              isNull(languages.deletedAt),
            ),
          ),
    deckIds.length === 0
      ? []
      : db
          .select({
            deckId: deckTopics.deckId,
            topicId: deckTopics.topicId,
          })
          .from(deckTopics)
          .where(inArray(deckTopics.deckId, deckIds)),
  ])

  const topicIdSet = Array.from(new Set(topicIdsForDecks.map((t) => t.topicId)))
  const topicRows = topicIdSet.length
    ? await db
        .select()
        .from(topics)
        .where(and(inArray(topics.id, topicIdSet), isNull(topics.deletedAt)))
    : []
  const topicsById = Object.fromEntries(topicRows.map((t) => [t.id, t]))

  const languagesById: Record<string, Language> = Object.fromEntries(
    enrichLanguages(languageRows).map((l) => [l.id, l]),
  )

  const favoriteDecksResult: Deck[] = favoriteDeckRows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    visibility: row.visibility,
    sourceLanguageId: row.sourceLanguageId,
    targetLanguageId: row.targetLanguageId,
    creatorId: row.creatorId,
    forkedFromDeckId: row.forkedFromDeckId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    cardCount: row.cardCount,
    topics: topicIdsForDecks
      .filter((t) => t.deckId === row.id)
      .map((t) => topicsById[t.topicId])
      .filter((t): t is NonNullable<typeof t> => Boolean(t))
      .map((t) => ({ id: t.id, name: t.name, slug: t.slug })),
  }))

  const favoriteCollectionsResult: Collection[] = favoriteCollectionRows.map(
    (row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description,
      visibility: row.visibility,
      creatorId: row.creatorId,
      forkedFromCollectionId: row.forkedFromCollectionId,
      sourceLanguageId: row.sourceLanguageId,
      targetLanguageId: row.targetLanguageId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      deckCount: row.deckCount,
      totalCards: row.totalCards,
    }),
  )

  return {
    favoriteDecks: favoriteDecksResult,
    favoriteCollections: favoriteCollectionsResult,
    languagesById,
  }
}
