import { unstable_cache } from "next/cache"
import { db } from "@/lib/db/client"
import {
  cards,
  decks,
  deckTopics,
  languages,
  topics,
  users,
} from "@/lib/db/schema"
import { eq, and, inArray } from "drizzle-orm"
import { enrichLanguage } from "@/lib/languages/flags"
import { COMMUNITY_DECKS_CACHE_TAG } from "@/lib/cache/community-decks"

export { COMMUNITY_DECKS_CACHE_TAG }

export const COMMUNITY_DECKS_DETAIL_CACHE_TAG = "community-decks-detail"

export type CommunityDeckDetailResult = {
  id: string
  title: string
  slug: string
  description: string | null
  visibility: "private" | "public"
  sourceLanguageId: string
  targetLanguageId: string
  creatorId: string
  creatorName: string
  isCurated: boolean
  forkedFromDeckId: string | null
  createdAt: Date
  cards: Array<{ id: string; deckId: string; front: string; back: string }>
  topics: Array<{ id: string; name: string; slug: string }>
  sourceLanguage: ReturnType<typeof enrichLanguage> | null
  targetLanguage: ReturnType<typeof enrichLanguage> | null
  cardCount: number
} | null

export const getCommunityDeckById = unstable_cache(
  async (id: string): Promise<CommunityDeckDetailResult> => {
    const deckRows = await db
      .select()
      .from(decks)
      .where(and(eq(decks.id, id), eq(decks.visibility, "public")))

    if (!deckRows.length) {
      return null
    }

    const deck = deckRows[0]

    const [deckCards, creatorRows, languageRows] = await Promise.all([
      db.select().from(cards).where(eq(cards.deckId, id)),
      db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(eq(users.id, deck.creatorId)),
      db
        .select()
        .from(languages)
        .where(
          inArray(languages.id, [deck.sourceLanguageId, deck.targetLanguageId])
        ),
    ])

    const topicRelations = await db
      .select({
        id: topics.id,
        name: topics.name,
        slug: topics.slug,
      })
      .from(deckTopics)
      .innerJoin(topics, eq(topics.id, deckTopics.topicId))
      .where(eq(deckTopics.deckId, id))

    const sourceLanguage = languageRows.find(
      (l) => l.id === deck.sourceLanguageId
    )
    const targetLanguage = languageRows.find(
      (l) => l.id === deck.targetLanguageId
    )

    return {
      ...deck,
      cards: deckCards,
      topics: topicRelations,
      creatorId: creatorRows[0]?.id ?? deck.creatorId,
      creatorName: creatorRows[0]?.name ?? "Unknown",
      sourceLanguage: sourceLanguage ? enrichLanguage(sourceLanguage) : null,
      targetLanguage: targetLanguage ? enrichLanguage(targetLanguage) : null,
      cardCount: deckCards.length,
    }
  },
  ["community-deck-detail"],
  { revalidate: 300, tags: [COMMUNITY_DECKS_DETAIL_CACHE_TAG] }
)
