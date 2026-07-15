import { and, count, desc, eq, ilike, isNotNull, isNull, or, sql } from "drizzle-orm"

import { db } from "@/lib/db/client"
import { cards, decks, studySessions, users } from "@/lib/db/schema"
import { PAGINATION } from "@/lib/constants"

export type AdminDeckRow = {
  id: string
  title: string
  slug: string
  description: string | null
  visibility: "private" | "public"
  isCurated: boolean
  sourceLanguageId: string
  targetLanguageId: string
  creatorId: string
  creatorName: string | null
  forkedFromDeckId: string | null
  cardCount: number
  sessionCount: number
  deletedAt: string | null
  createdAt: string
}

export type AdminDeckDetail = AdminDeckRow & {
  updatedAt: string
  cards: Array<{
    id: string
    front: string
    back: string
    timesReviewed: number
    timesCorrect: number
    deletedAt: string | null
  }>
}

export type AdminDeckListResult = {
  items: AdminDeckRow[]
  total: number
  page: number
  limit: number
}

export type AdminDeckListFilters = {
  q?: string
  visibility?: "private" | "public"
  curated?: boolean
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

function buildWhere(filters: AdminDeckListFilters) {
  const conditions = []

  if (filters.q) {
    const term = `%${filters.q}%`
    const match = or(ilike(decks.title, term), ilike(decks.slug, term))
    if (match) conditions.push(match)
  }

  if (filters.visibility) {
    conditions.push(eq(decks.visibility, filters.visibility))
  }

  if (filters.curated !== undefined) {
    conditions.push(eq(decks.isCurated, filters.curated))
  }

  if (filters.creatorId) {
    conditions.push(eq(decks.creatorId, filters.creatorId))
  }

  if (filters.deleted === true) {
    conditions.push(isNotNull(decks.deletedAt))
  } else if (filters.deleted === false) {
    conditions.push(isNull(decks.deletedAt))
  }

  return conditions.length ? and(...conditions) : undefined
}

export async function listAdminDecks(
  filters: AdminDeckListFilters = {}
): Promise<AdminDeckListResult> {
  const page = clampPage(filters.page)
  const limit = clampLimit(filters.limit)
  const offset = (page - 1) * limit
  const where = buildWhere(filters)

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: decks.id,
        title: decks.title,
        slug: decks.slug,
        description: decks.description,
        visibility: decks.visibility,
        isCurated: decks.isCurated,
        sourceLanguageId: decks.sourceLanguageId,
        targetLanguageId: decks.targetLanguageId,
        creatorId: decks.creatorId,
        creatorName: users.name,
        forkedFromDeckId: decks.forkedFromDeckId,
        cardCount: sql<number>`(
          SELECT count(*)::int FROM ${cards}
          WHERE ${cards.deckId} = ${decks.id}
            AND ${cards.deletedAt} IS NULL
        )`,
        sessionCount: sql<number>`(
          SELECT count(*)::int FROM ${studySessions}
          WHERE ${studySessions.deckId} = ${decks.id}
        )`,
        deletedAt: decks.deletedAt,
        createdAt: decks.createdAt,
      })
      .from(decks)
      .leftJoin(users, eq(users.id, decks.creatorId))
      .where(where)
      .orderBy(desc(decks.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ value: count() })
      .from(decks)
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

export async function getAdminDeck(id: string): Promise<AdminDeckDetail | null> {
  const [deckRow] = await db
    .select({
      id: decks.id,
      title: decks.title,
      slug: decks.slug,
      description: decks.description,
      visibility: decks.visibility,
      isCurated: decks.isCurated,
      sourceLanguageId: decks.sourceLanguageId,
      targetLanguageId: decks.targetLanguageId,
      creatorId: decks.creatorId,
      creatorName: users.name,
      forkedFromDeckId: decks.forkedFromDeckId,
      cardCount: sql<number>`(
        SELECT count(*)::int FROM ${cards}
        WHERE ${cards.deckId} = ${decks.id}
          AND ${cards.deletedAt} IS NULL
      )`,
      sessionCount: sql<number>`(
        SELECT count(*)::int FROM ${studySessions}
        WHERE ${studySessions.deckId} = ${decks.id}
      )`,
      deletedAt: decks.deletedAt,
      createdAt: decks.createdAt,
      updatedAt: decks.updatedAt,
    })
    .from(decks)
    .leftJoin(users, eq(users.id, decks.creatorId))
    .where(eq(decks.id, id))
    .limit(1)

  if (!deckRow) return null

  const deckCards = await db
    .select({
      id: cards.id,
      front: cards.front,
      back: cards.back,
      timesReviewed: cards.timesReviewed,
      timesCorrect: cards.timesCorrect,
      deletedAt: cards.deletedAt,
    })
    .from(cards)
    .where(eq(cards.deckId, id))
    .orderBy(desc(cards.createdAt))

  return {
    ...deckRow,
    deletedAt: deckRow.deletedAt ? deckRow.deletedAt.toISOString() : null,
    createdAt: deckRow.createdAt.toISOString(),
    updatedAt: deckRow.updatedAt.toISOString(),
    cards: deckCards.map((c) => ({
      ...c,
      deletedAt: c.deletedAt ? c.deletedAt.toISOString() : null,
    })),
  }
}
