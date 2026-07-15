import { and, desc, eq, isNull, sql } from "drizzle-orm"
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
import { enrichLanguages } from "@/lib/languages/flags"
import type { Language } from "@/types"

export type ProfileData = {
  user: {
    id: string
    name: string | null
    email: string | null
    avatarUrl: string | null
    nativeLanguageId: string | null
    role: "user" | "curator" | "admin"
    theme: "light" | "dark" | "system"
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

  const [
    allLanguages,
    deckCountRow,
    cardCountRow,
    completedSessionRow,
    achievementRow,
    displayName,
    email,
  ] = await Promise.all([
    db.select().from(languages).where(isNull(languages.deletedAt)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(decks)
      .where(eq(decks.creatorId, user.id)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(cards)
      .innerJoin(decks, eq(decks.id, cards.deckId))
      .where(eq(decks.creatorId, user.id)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(studySessions)
      .where(
        and(
          eq(studySessions.userId, user.id),
          eq(studySessions.status, "completed"),
        ),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(userAchievements)
      .where(eq(userAchievements.userId, user.id)),
    resolveDisplayName(user.name, user.avatarUrl),
    resolvePrimaryEmail(),
  ])

  const clerkUser = await currentUser()
  const clerkImageUrl = clerkUser?.imageUrl ?? null

  const enrichedLanguages = enrichLanguages(allLanguages)
  const languagesById: Record<string, Language> = Object.fromEntries(
    enrichedLanguages.map((l) => [l.id, l]),
  )
  const nativeLanguage = user.nativeLanguageId
    ? languagesById[user.nativeLanguageId] ?? null
    : null

  return {
    user: {
      id: user.id,
      name: displayName,
      email,
      avatarUrl: user.avatarUrl,
      nativeLanguageId: user.nativeLanguageId,
      role: user.role,
      theme: user.theme,
      createdAt: user.createdAt.toISOString(),
      xp: user.xp,
      streak: user.streak,
      streakUpdatedAt: user.streakUpdatedAt
        ? user.streakUpdatedAt.toISOString()
        : null,
    },
    clerkImageUrl,
    nativeLanguage,
    languages: enrichedLanguages,
    stats: {
      deckCount: deckCountRow[0]?.count ?? 0,
      cardCount: cardCountRow[0]?.count ?? 0,
      completedSessionCount: completedSessionRow[0]?.count ?? 0,
      achievementCount: achievementRow[0]?.count ?? 0,
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
