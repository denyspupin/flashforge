import { and, desc, eq, inArray, sql } from "drizzle-orm"
import { currentUser } from "@clerk/nextjs/server"

import { db } from "@/lib/db/client"
import {
  cards,
  deckTopics,
  decks,
  languages,
  studySessions,
  topics,
} from "@/lib/db/schema"
import { requireCurrentUser } from "@/lib/auth/user"
import { enrichLanguages } from "@/lib/languages/flags"
import type { Deck, Language, StudySession } from "@/types"

export type DashboardActiveSession = Pick<
  StudySession,
  "id" | "deckId" | "startedAt" | "cardsReviewed" | "cardsCorrect" | "status"
> & {
  deckTitle: string
}

export type DashboardData = {
  user: {
    id: string
    name: string | null
    xp: number
    streak: number
    streakUpdatedAt: string | null
  }
  deckCount: number
  activeSession: DashboardActiveSession | null
  recentDecks: Deck[]
  languagesById: Record<string, Language>
}

export async function loadDashboardData(): Promise<DashboardData | null> {
  const user = await requireCurrentUser()
  if (!user) return null

  const displayName = await resolveDisplayName(user.name)

  const [deckCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(decks)
    .where(eq(decks.creatorId, user.id))

  const deckCount = deckCountRow?.count ?? 0

  const [activeSession] = await db
    .select({
      id: studySessions.id,
      deckId: studySessions.deckId,
      startedAt: studySessions.startedAt,
      cardsReviewed: studySessions.cardsReviewed,
      cardsCorrect: studySessions.cardsCorrect,
      status: studySessions.status,
      deckTitle: decks.title,
    })
    .from(studySessions)
    .innerJoin(decks, eq(decks.id, studySessions.deckId))
    .where(
      and(
        eq(studySessions.userId, user.id),
        eq(studySessions.status, "active"),
        eq(decks.creatorId, user.id),
      ),
    )
    .orderBy(desc(studySessions.startedAt))
    .limit(1)

  const recentDeckRows = await db
    .select({
      id: decks.id,
      title: decks.title,
      slug: decks.slug,
      description: decks.description,
      visibility: decks.visibility,
      sourceLanguageId: decks.sourceLanguageId,
      targetLanguageId: decks.targetLanguageId,
      creatorId: decks.creatorId,
      isCurated: decks.isCurated,
      forkedFromDeckId: decks.forkedFromDeckId,
      createdAt: decks.createdAt,
      updatedAt: decks.updatedAt,
      cardCount: sql<number>`(
        SELECT count(*)::int FROM ${cards} WHERE ${cards.deckId} = decks.id
      )`,
    })
    .from(decks)
    .where(eq(decks.creatorId, user.id))
    .orderBy(desc(decks.updatedAt))
    .limit(6)

  const languageIds = Array.from(
    new Set(
      recentDeckRows.flatMap((d) => [d.sourceLanguageId, d.targetLanguageId]),
    ),
  )

  const languageRows = languageIds.length
    ? await db
        .select()
        .from(languages)
        .where(inArray(languages.id, languageIds))
    : []

  const languagesById: Record<string, Language> = Object.fromEntries(
    enrichLanguages(languageRows).map((l) => [l.id, l]),
  )

  const recentDeckIds = recentDeckRows.map((d) => d.id)

  const topicIdsForDecks = recentDeckIds.length
    ? await db
        .select({
          deckId: deckTopics.deckId,
          topicId: deckTopics.topicId,
        })
        .from(deckTopics)
        .where(inArray(deckTopics.deckId, recentDeckIds))
    : []

  const topicIdSet = Array.from(new Set(topicIdsForDecks.map((t) => t.topicId)))
  const topicRows = topicIdSet.length
    ? await db.select().from(topics).where(inArray(topics.id, topicIdSet))
    : []
  const topicsById = Object.fromEntries(topicRows.map((t) => [t.id, t]))

  const recentDecks: Deck[] = recentDeckRows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    visibility: row.visibility,
    sourceLanguageId: row.sourceLanguageId,
    targetLanguageId: row.targetLanguageId,
    creatorId: row.creatorId,
    isCurated: row.isCurated,
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

  return {
    user: {
      id: user.id,
      name: displayName,
      xp: user.xp,
      streak: user.streak,
      streakUpdatedAt: user.streakUpdatedAt
        ? user.streakUpdatedAt.toISOString()
        : null,
    },
    deckCount,
    activeSession: activeSession
      ? {
          ...activeSession,
          startedAt: activeSession.startedAt.toISOString(),
        }
      : null,
    recentDecks,
    languagesById,
  }
}

async function resolveDisplayName(
  dbName: string | null | undefined
): Promise<string | null> {
  const cleaned = dbName?.trim() || null
  if (cleaned) return cleaned

  try {
    const clerkUser = await currentUser()
    if (!clerkUser) return null

    const fallback =
      clerkUser.firstName?.trim() ||
      clerkUser.username?.trim() ||
      clerkUser.emailAddresses?.[0]?.emailAddress?.split("@")[0]?.trim() ||
      null

    return fallback
  } catch {
    return null
  }
}
