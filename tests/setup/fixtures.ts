import type { TestDb } from "./db"
import {
  cards,
  collectionDecks,
  collections,
  deckTopics,
  decks,
  languages,
  notifications,
  studySessions,
  topics,
  users,
} from "@/lib/db/schema"
import { DEFAULT_LANGUAGES } from "@/lib/constants"

type SeedUserOverrides = {
  clerkId?: string
  name?: string | null
  role?: "user" | "curator" | "admin"
  xp?: number
  streak?: number
  streakUpdatedAt?: Date | null
  isBanned?: boolean
  deletedAt?: Date | null
}

export async function seedUser(
  db: TestDb,
  overrides: SeedUserOverrides = {},
): Promise<typeof users.$inferSelect> {
  const clerkId = overrides.clerkId ?? `user_${Math.random().toString(36).slice(2, 10)}`
  const [row] = await db
    .insert(users)
    .values({
      clerkId,
      name: overrides.name ?? "Test User",
      role: overrides.role ?? "user",
      xp: overrides.xp ?? 0,
      streak: overrides.streak ?? 0,
      streakUpdatedAt: overrides.streakUpdatedAt ?? null,
      isBanned: overrides.isBanned ?? false,
      deletedAt: overrides.deletedAt ?? null,
    })
    .returning()
  return row
}

export async function seedLanguage(
  db: TestDb,
  code: string,
  name?: string,
): Promise<typeof languages.$inferSelect> {
  const languageName = name ?? DEFAULT_LANGUAGES.find((l) => l.code === code)?.name ?? code
  const [row] = await db
    .insert(languages)
    .values({ code, name: languageName })
    .returning()
  return row
}

export async function seedTopic(
  db: TestDb,
  slug: string,
  name?: string,
): Promise<typeof topics.$inferSelect> {
  const [row] = await db
    .insert(topics)
    .values({ slug, name: name ?? slug })
    .returning()
  return row
}

type SeedDeckOverrides = {
  title?: string
  slug?: string
  description?: string | null
  visibility?: "private" | "public"
  sourceLanguageId: string
  targetLanguageId: string
  creatorId: string
  isCurated?: boolean
  forkedFromDeckId?: string | null
}

export async function seedDeck(
  db: TestDb,
  overrides: SeedDeckOverrides,
): Promise<typeof decks.$inferSelect> {
  const title = overrides.title ?? "Test Deck"
  const slug =
    overrides.slug ??
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  const [row] = await db
    .insert(decks)
    .values({
      title,
      slug,
      description: overrides.description ?? null,
      visibility: overrides.visibility ?? "private",
      sourceLanguageId: overrides.sourceLanguageId,
      targetLanguageId: overrides.targetLanguageId,
      creatorId: overrides.creatorId,
      isCurated: overrides.isCurated ?? false,
      forkedFromDeckId: overrides.forkedFromDeckId ?? null,
    })
    .returning()
  return row
}

export async function seedCard(
  db: TestDb,
  deckId: string,
  overrides: Partial<{ front: string; back: string }> = {},
): Promise<typeof cards.$inferSelect> {
  const [row] = await db
    .insert(cards)
    .values({
      deckId,
      front: overrides.front ?? "hello",
      back: overrides.back ?? "hola",
    })
    .returning()
  return row
}

export async function seedCards(
  db: TestDb,
  deckId: string,
  count: number,
): Promise<Array<typeof cards.$inferSelect>> {
  if (count <= 0) return []
  return db
    .insert(cards)
    .values(
      Array.from({ length: count }, (_, i) => ({
        deckId,
        front: `front ${i + 1}`,
        back: `back ${i + 1}`,
      })),
    )
    .returning()
}

export async function seedDeckTopics(
  db: TestDb,
  deckId: string,
  topicIds: string[],
): Promise<void> {
  if (topicIds.length === 0) return
  await db.insert(deckTopics).values(topicIds.map((topicId) => ({ deckId, topicId })))
}

export async function seedSession(
  db: TestDb,
  overrides: {
    userId: string
    deckId: string
    status?: "active" | "completed" | "abandoned"
    startedAt?: Date
    completedAt?: Date | null
    cardsReviewed?: number
    cardsCorrect?: number
    failedCardIds?: string[]
    xpAwarded?: number
  },
): Promise<typeof studySessions.$inferSelect> {
  const [row] = await db
    .insert(studySessions)
    .values({
      userId: overrides.userId,
      deckId: overrides.deckId,
      status: overrides.status ?? "active",
      startedAt: overrides.startedAt ?? new Date(),
      completedAt: overrides.completedAt ?? null,
      cardsReviewed: overrides.cardsReviewed ?? 0,
      cardsCorrect: overrides.cardsCorrect ?? 0,
      failedCardIds: overrides.failedCardIds ?? [],
      xpAwarded: overrides.xpAwarded ?? 0,
    })
    .returning()
  return row
}

export async function seedNotification(
  db: TestDb,
  overrides: {
    userId: string
    type: "fork_received" | "achievement_unlocked" | "collection_fork_received"
    data?: Record<string, unknown>
    read?: boolean
  },
): Promise<typeof notifications.$inferSelect> {
  const [row] = await db
    .insert(notifications)
    .values({
      userId: overrides.userId,
      type: overrides.type,
      data: overrides.data ?? {},
      read: overrides.read ?? false,
    })
    .returning()
  return row
}

type SeedCollectionOverrides = {
  title?: string
  slug?: string
  description?: string | null
  visibility?: "private" | "public"
  creatorId: string
  sourceLanguageId: string
  targetLanguageId: string
  isCurated?: boolean
  forkedFromCollectionId?: string | null
}

export async function seedCollection(
  db: TestDb,
  overrides: SeedCollectionOverrides,
): Promise<typeof collections.$inferSelect> {
  const title = overrides.title ?? "Test Collection"
  const slug = overrides.slug ?? title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
  const [row] = await db
    .insert(collections)
    .values({
      title,
      slug,
      description: overrides.description ?? null,
      visibility: overrides.visibility ?? "private",
      creatorId: overrides.creatorId,
      sourceLanguageId: overrides.sourceLanguageId,
      targetLanguageId: overrides.targetLanguageId,
      isCurated: overrides.isCurated ?? false,
      forkedFromCollectionId: overrides.forkedFromCollectionId ?? null,
    })
    .returning()
  return row
}

export async function seedCollectionDecks(
  db: TestDb,
  collectionId: string,
  deckIds: string[],
): Promise<void> {
  if (deckIds.length === 0) return
  await db
    .insert(collectionDecks)
    .values(
      deckIds.map((deckId, index) => ({
        collectionId,
        deckId,
        position: index,
      })),
    )
}
