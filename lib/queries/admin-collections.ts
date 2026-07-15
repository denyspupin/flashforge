import { and, count, desc, eq, ilike, isNotNull, isNull, or, sql } from "drizzle-orm"

import { db } from "@/lib/db/client"
import {
  cards,
  collectionDecks,
  collections,
  decks,
  languages,
  users,
} from "@/lib/db/schema"
import { PAGINATION } from "@/lib/constants"

export type AdminCollectionRow = {
  id: string
  title: string
  slug: string
  description: string | null
  sourceLanguageId: string
  targetLanguageId: string
  sourceLanguageName: string | null
  targetLanguageName: string | null
  creatorId: string
  creatorName: string | null
  deckCount: number
  totalCards: number
  deletedAt: string | null
  createdAt: string
}

export type AdminCollectionDetail = AdminCollectionRow & {
  updatedAt: string
  decks: Array<{
    id: string
    title: string
    slug: string
    description: string | null
    cardCount: number
    timesReviewed: number
    timesCorrect: number
    deletedAt: string | null
    position: number
  }>
}

export type AdminCollectionListResult = {
  items: AdminCollectionRow[]
  total: number
  page: number
  limit: number
}

export type AdminCollectionListFilters = {
  q?: string
  creatorId?: string
  deleted?: boolean
  page?: number
  limit?: number
}

function clampLimit(value: number | undefined): number {
  if (!value) return PAGINATION.DEFAULT_LIMIT
  return Math.min(Math.max(1, value), PAGINATION.MAX_LIMIT)
}

function clampPage(value: number | undefined): number {
  if (!value) return PAGINATION.DEFAULT_PAGE
  return Math.max(1, value)
}

function buildWhere(filters: AdminCollectionListFilters) {
  const conditions = []

  if (filters.q) {
    const term = `%${filters.q}%`
    const match = or(
      ilike(collections.title, term),
      ilike(collections.slug, term),
    )
    if (match) conditions.push(match)
  }

  if (filters.creatorId) {
    conditions.push(eq(collections.creatorId, filters.creatorId))
  }

  if (filters.deleted === true) {
    conditions.push(isNotNull(collections.deletedAt))
  } else if (filters.deleted === false) {
    conditions.push(isNull(collections.deletedAt))
  }

  return conditions.length ? and(...conditions) : undefined
}

export async function listAdminCollections(
  filters: AdminCollectionListFilters = {}
): Promise<AdminCollectionListResult> {
  const page = clampPage(filters.page)
  const limit = clampLimit(filters.limit)
  const offset = (page - 1) * limit
  const where = buildWhere(filters)

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: collections.id,
        title: collections.title,
        slug: collections.slug,
        description: collections.description,
        sourceLanguageId: collections.sourceLanguageId,
        targetLanguageId: collections.targetLanguageId,
        sourceLanguageName: sql<string | null>`src.name`,
        targetLanguageName: sql<string | null>`tgt.name`,
        creatorId: collections.creatorId,
        creatorName: users.name,
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
        deletedAt: collections.deletedAt,
        createdAt: collections.createdAt,
      })
      .from(collections)
      .leftJoin(users, eq(users.id, collections.creatorId))
      .leftJoin(
        sql`${languages} src`,
        sql`src.id = ${collections.sourceLanguageId}`,
      )
      .leftJoin(
        sql`${languages} tgt`,
        sql`tgt.id = ${collections.targetLanguageId}`,
      )
      .where(where)
      .orderBy(desc(collections.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ value: count() })
      .from(collections)
      .where(where),
  ])

  return {
    items: rows.map((row) => ({
      ...row,
      deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
    })),
    total: totalRow[0]?.value ?? 0,
    page,
    limit,
  }
}

export async function getAdminCollection(
  id: string
): Promise<AdminCollectionDetail | null> {
  const [row] = await db
    .select({
      id: collections.id,
      title: collections.title,
      slug: collections.slug,
      description: collections.description,
      sourceLanguageId: collections.sourceLanguageId,
      targetLanguageId: collections.targetLanguageId,
      sourceLanguageName: sql<string | null>`src.name`,
      targetLanguageName: sql<string | null>`tgt.name`,
      creatorId: collections.creatorId,
      creatorName: users.name,
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
      deletedAt: collections.deletedAt,
      createdAt: collections.createdAt,
      updatedAt: collections.updatedAt,
    })
    .from(collections)
    .leftJoin(users, eq(users.id, collections.creatorId))
    .leftJoin(
      sql`${languages} src`,
      sql`src.id = ${collections.sourceLanguageId}`,
    )
    .leftJoin(
      sql`${languages} tgt`,
      sql`tgt.id = ${collections.targetLanguageId}`,
    )
    .where(eq(collections.id, id))
    .limit(1)

  if (!row) return null

  const collectionDecksRows = await db
    .select({
      deckId: collectionDecks.deckId,
      position: collectionDecks.position,
      deckTitle: decks.title,
      deckSlug: decks.slug,
      description: decks.description,
      cardCount: sql<number>`(
        SELECT count(*)::int FROM ${cards}
        WHERE ${cards.deckId} = ${decks.id}
          AND ${cards.deletedAt} IS NULL
      )`,
      timesReviewed: sql<number>`(
        SELECT COALESCE(SUM(${cards.timesReviewed}), 0)::int
        FROM ${cards}
        WHERE ${cards.deckId} = ${decks.id}
          AND ${cards.deletedAt} IS NULL
      )`,
      timesCorrect: sql<number>`(
        SELECT COALESCE(SUM(${cards.timesCorrect}), 0)::int
        FROM ${cards}
        WHERE ${cards.deckId} = ${decks.id}
          AND ${cards.deletedAt} IS NULL
      )`,
      deletedAt: decks.deletedAt,
    })
    .from(collectionDecks)
    .innerJoin(decks, eq(decks.id, collectionDecks.deckId))
    .where(eq(collectionDecks.collectionId, id))
    .orderBy(desc(collectionDecks.position), desc(collectionDecks.createdAt))

  return {
    ...row,
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    decks: collectionDecksRows.map((d) => ({
      id: d.deckId,
      title: d.deckTitle,
      slug: d.deckSlug,
      description: d.description,
      cardCount: d.cardCount ?? 0,
      timesReviewed: d.timesReviewed,
      timesCorrect: d.timesCorrect ?? 0,
      deletedAt: d.deletedAt ? d.deletedAt.toISOString() : null,
      position: d.position,
    })),
  }
}
