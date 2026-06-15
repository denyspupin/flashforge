import { and, count, desc, eq, gte, isNull, sql } from "drizzle-orm"

import { db } from "@/lib/db/client"
import {
  cards,
  deckTopics,
  decks,
  languages,
  studySessions,
  topics,
  users,
} from "@/lib/db/schema"

export type AdminStats = {
  users: {
    total: number
    active: number
    banned: number
    deleted: number
    newLast7d: number
    newLast30d: number
  }
  content: {
    decks: number
    publicDecks: number
    privateDecks: number
    curatedDecks: number
    cards: number
  }
  activity: {
    sessionsLast7d: number
    sessionsLast30d: number
    activeUsersLast7d: number
    activeUsersLast30d: number
  }
  taxonomy: {
    topLanguagePairs: Array<{
      sourceLanguageId: string
      targetLanguageId: string
      sourceName: string
      sourceCode: string
      targetName: string
      targetCode: string
      deckCount: number
    }>
    topTopics: Array<{ topicId: string; name: string; slug: string; deckCount: number }>
  }
  generatedAt: string
}

const DAY_MS = 24 * 60 * 60 * 1000

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_MS)
}

export async function loadAdminStats(): Promise<AdminStats> {
  const [
    userTotalsRow,
    deckTotalsRow,
    publicDecksRow,
    privateDecksRow,
    curatedDecksRow,
    cardTotalsRow,
    sessions7dRow,
    sessions30dRow,
    activeUsers7dRow,
    activeUsers30dRow,
  ] = await Promise.all([
    db
      .select({
        total: count(),
        banned: sql<number>`count(*) FILTER (WHERE ${users.isBanned})::int`,
        deleted: sql<number>`count(*) FILTER (WHERE ${users.deletedAt} IS NOT NULL)::int`,
        newLast7d: sql<number>`count(*) FILTER (WHERE ${users.createdAt} >= ${daysAgo(7)})::int`,
        newLast30d: sql<number>`count(*) FILTER (WHERE ${users.createdAt} >= ${daysAgo(30)})::int`,
      })
      .from(users),
    db
      .select({
        total: sql<number>`count(*) FILTER (WHERE ${decks.deletedAt} IS NULL)::int`,
      })
      .from(decks),
    db
      .select({ count: count() })
      .from(decks)
      .where(
        and(
          eq(decks.visibility, "public"),
          isNull(decks.deletedAt),
        ),
      ),
    db
      .select({ count: count() })
      .from(decks)
      .where(
        and(
          eq(decks.visibility, "private"),
          isNull(decks.deletedAt),
        ),
      ),
    db
      .select({ count: count() })
      .from(decks)
      .where(and(eq(decks.isCurated, true), isNull(decks.deletedAt))),
    db
      .select({ count: count() })
      .from(cards)
      .where(isNull(cards.deletedAt)),
    db
      .select({ count: count() })
      .from(studySessions)
      .where(gte(studySessions.startedAt, daysAgo(7))),
    db
      .select({ count: count() })
      .from(studySessions)
      .where(gte(studySessions.startedAt, daysAgo(30))),
    db
      .select({
        count: sql<number>`count(DISTINCT ${studySessions.userId})::int`,
      })
      .from(studySessions)
      .where(gte(studySessions.startedAt, daysAgo(7))),
    db
      .select({
        count: sql<number>`count(DISTINCT ${studySessions.userId})::int`,
      })
      .from(studySessions)
      .where(gte(studySessions.startedAt, daysAgo(30))),
  ])

  const userTotals = userTotalsRow[0]
  const deckTotals = deckTotalsRow[0]
  const activeUsers = (userTotals?.total ?? 0) - (userTotals?.deleted ?? 0)

  const topLanguagePairs = await db
    .select({
      sourceLanguageId: decks.sourceLanguageId,
      targetLanguageId: decks.targetLanguageId,
      sourceName: sql<string>`src.name`,
      sourceCode: sql<string>`src.code`,
      targetName: sql<string>`tgt.name`,
      targetCode: sql<string>`tgt.code`,
      deckCount: sql<number>`count(*)::int`,
    })
    .from(decks)
    .innerJoin(sql`${languages} src`, sql`src.id = ${decks.sourceLanguageId}`)
    .innerJoin(sql`${languages} tgt`, sql`tgt.id = ${decks.targetLanguageId}`)
    .where(isNull(decks.deletedAt))
    .groupBy(decks.sourceLanguageId, decks.targetLanguageId, sql`src.name`, sql`src.code`, sql`tgt.name`, sql`tgt.code`)
    .orderBy(desc(sql`count(*)`))
    .limit(5)

  const topTopics = await db
    .select({
      topicId: topics.id,
      name: topics.name,
      slug: topics.slug,
      deckCount: sql<number>`count(*)::int`,
    })
    .from(deckTopics)
    .innerJoin(topics, eq(topics.id, deckTopics.topicId))
    .innerJoin(decks, eq(decks.id, deckTopics.deckId))
    .where(isNull(decks.deletedAt))
    .groupBy(topics.id, topics.name, topics.slug)
    .orderBy(desc(sql`count(*)`))
    .limit(5)

  return {
    users: {
      total: userTotals?.total ?? 0,
      active: activeUsers,
      banned: userTotals?.banned ?? 0,
      deleted: userTotals?.deleted ?? 0,
      newLast7d: userTotals?.newLast7d ?? 0,
      newLast30d: userTotals?.newLast30d ?? 0,
    },
    content: {
      decks: deckTotals?.total ?? 0,
      publicDecks: publicDecksRow[0]?.count ?? 0,
      privateDecks: privateDecksRow[0]?.count ?? 0,
      curatedDecks: curatedDecksRow[0]?.count ?? 0,
      cards: cardTotalsRow[0]?.count ?? 0,
    },
    activity: {
      sessionsLast7d: sessions7dRow[0]?.count ?? 0,
      sessionsLast30d: sessions30dRow[0]?.count ?? 0,
      activeUsersLast7d: activeUsers7dRow[0]?.count ?? 0,
      activeUsersLast30d: activeUsers30dRow[0]?.count ?? 0,
    },
    taxonomy: {
      topLanguagePairs,
      topTopics,
    },
    generatedAt: new Date().toISOString(),
  }
}
