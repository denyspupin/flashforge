import { and, count, desc, eq, ilike, isNotNull, isNull, or, sql } from "drizzle-orm"

import { db } from "@/lib/db/client"
import { decks, studySessions, users } from "@/lib/db/schema"
import { PAGINATION } from "@/lib/constants"

export type AdminUserRow = {
  id: string
  clerkId: string
  name: string | null
  avatarUrl: string | null
  role: "user" | "curator" | "admin"
  isBanned: boolean
  deletedAt: string | null
  createdAt: string
  deckCount: number
  sessionCount: number
}

export type AdminUserDetail = AdminUserRow & {
  nativeLanguageId: string | null
  xp: number
  streak: number
  streakUpdatedAt: string | null
  updatedAt: string
}

export type AdminUserListResult = {
  items: AdminUserRow[]
  total: number
  page: number
  limit: number
}

export type AdminUserListFilters = {
  q?: string
  role?: "user" | "curator" | "admin"
  banned?: boolean
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

function buildWhere(filters: AdminUserListFilters) {
  const conditions = []

  if (filters.q) {
    const term = `%${filters.q}%`
    const match = or(ilike(users.name, term), ilike(users.clerkId, term))
    if (match) conditions.push(match)
  }

  if (filters.role) {
    conditions.push(eq(users.role, filters.role))
  }

  if (filters.banned !== undefined) {
    conditions.push(eq(users.isBanned, filters.banned))
  }

  if (filters.deleted === true) {
    conditions.push(isNotNull(users.deletedAt))
  } else if (filters.deleted === false) {
    conditions.push(isNull(users.deletedAt))
  }

  return conditions.length ? and(...conditions) : undefined
}

export async function listAdminUsers(
  filters: AdminUserListFilters = {}
): Promise<AdminUserListResult> {
  const page = clampPage(filters.page)
  const limit = clampLimit(filters.limit)
  const offset = (page - 1) * limit
  const where = buildWhere(filters)

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: users.id,
        clerkId: users.clerkId,
        name: users.name,
        avatarUrl: users.avatarUrl,
        role: users.role,
        isBanned: users.isBanned,
        deletedAt: users.deletedAt,
        createdAt: users.createdAt,
        deckCount: sql<number>`(
          SELECT count(*)::int FROM ${decks}
          WHERE ${decks.creatorId} = ${users.id}
            AND ${decks.deletedAt} IS NULL
        )`,
        sessionCount: sql<number>`(
          SELECT count(*)::int FROM ${studySessions}
          WHERE ${studySessions.userId} = ${users.id}
        )`,
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ value: count() })
      .from(users)
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

export async function getAdminUser(id: string): Promise<AdminUserDetail | null> {
  const rows = await db
    .select({
      id: users.id,
      clerkId: users.clerkId,
      name: users.name,
      avatarUrl: users.avatarUrl,
      nativeLanguageId: users.nativeLanguageId,
      role: users.role,
      isBanned: users.isBanned,
      deletedAt: users.deletedAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      xp: users.xp,
      streak: users.streak,
      streakUpdatedAt: users.streakUpdatedAt,
      deckCount: sql<number>`(
        SELECT count(*)::int FROM ${decks}
        WHERE ${decks.creatorId} = ${users.id}
          AND ${decks.deletedAt} IS NULL
      )`,
      sessionCount: sql<number>`(
        SELECT count(*)::int FROM ${studySessions}
        WHERE ${studySessions.userId} = ${users.id}
      )`,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)

  const row = rows[0]
  if (!row) return null

  return {
    ...row,
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    streakUpdatedAt: row.streakUpdatedAt
      ? row.streakUpdatedAt.toISOString()
      : null,
  }
}
