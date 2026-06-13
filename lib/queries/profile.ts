import { and, desc, eq, sql } from "drizzle-orm"
import { currentUser } from "@clerk/nextjs/server"

import { db } from "@/lib/db/client"
import {
  cards,
  decks,
  languages,
  studySessions,
  userAchievements,
} from "@/lib/db/schema"
import { requireCurrentUser } from "@/lib/auth/user"
import type { Language } from "@/types"

export type ProfileData = {
  user: {
    id: string
    name: string | null
    email: string | null
    avatarUrl: string | null
    nativeLanguageId: string | null
    isCurator: boolean
    createdAt: string
    xp: number
    streak: number
    streakUpdatedAt: string | null
  }
  clerkImageUrl: string | null
  nativeLanguage: Language | null
  languages: Language[]
  stats: {
    deckCount: number
    cardCount: number
    completedSessionCount: number
    achievementCount: number
  }
}

export async function loadProfileData(): Promise<ProfileData | null> {
  const user = await requireCurrentUser()
  if (!user) return null

  const clerkUser = await currentUser()
  const clerkImageUrl = clerkUser?.imageUrl ?? null

  const displayName = await resolveDisplayName(user.name, user.avatarUrl)
  const email = await resolvePrimaryEmail()

  const allLanguages = await db.select().from(languages)
  const languagesById: Record<string, Language> = Object.fromEntries(
    allLanguages.map((l) => [l.id, l]),
  )
  const nativeLanguage = user.nativeLanguageId
    ? languagesById[user.nativeLanguageId] ?? null
    : null

  const [deckCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(decks)
    .where(eq(decks.creatorId, user.id))

  const [cardCountRow] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(cards)
    .innerJoin(decks, eq(decks.id, cards.deckId))
    .where(eq(decks.creatorId, user.id))

  const [completedSessionRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(studySessions)
    .where(
      and(
        eq(studySessions.userId, user.id),
        eq(studySessions.status, "completed"),
      ),
    )

  const [achievementRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(userAchievements)
    .where(eq(userAchievements.userId, user.id))

  const [latestSession] = await db
    .select({ startedAt: studySessions.startedAt })
    .from(studySessions)
    .where(eq(studySessions.userId, user.id))
    .orderBy(desc(studySessions.startedAt))
    .limit(1)

  return {
    user: {
      id: user.id,
      name: displayName,
      email,
      avatarUrl: user.avatarUrl,
      nativeLanguageId: user.nativeLanguageId,
      isCurator: user.isCurator,
      createdAt: user.createdAt.toISOString(),
      xp: user.xp,
      streak: user.streak,
      streakUpdatedAt: user.streakUpdatedAt
        ? user.streakUpdatedAt.toISOString()
        : null,
    },
    clerkImageUrl,
    nativeLanguage,
    languages: allLanguages,
    stats: {
      deckCount: deckCountRow?.count ?? 0,
      cardCount: cardCountRow?.count ?? 0,
      completedSessionCount: completedSessionRow?.count ?? 0,
      achievementCount: achievementRow?.count ?? 0,
    },
  }
}

async function resolveDisplayName(
  dbName: string | null | undefined,
  dbAvatar: string | null | undefined
): Promise<string | null> {
  const cleaned = dbName?.trim() || null
  if (cleaned) return cleaned

  try {
    const clerkUser = await currentUser()
    if (!clerkUser) return null

    return (
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      clerkUser.username?.trim() ||
      clerkUser.emailAddresses?.[0]?.emailAddress?.split("@")[0]?.trim() ||
      null
    )
  } catch {
    return null
  }
}

async function resolvePrimaryEmail(): Promise<string | null> {
  try {
    const clerkUser = await currentUser()
    if (!clerkUser) return null

    return (
      clerkUser.emailAddresses?.find((e) => e.id === clerkUser.primaryEmailAddressId)
        ?.emailAddress ??
      clerkUser.emailAddresses?.[0]?.emailAddress ??
      null
    )
  } catch {
    return null
  }
}
