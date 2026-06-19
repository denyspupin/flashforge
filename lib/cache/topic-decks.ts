import { unstable_cache } from "next/cache"
import { db } from "@/lib/db/client"
import { decks, deckTopics } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

export const TOPIC_DECKS_CACHE_TAG = "topic-decks"

export const getDecksForTopic = unstable_cache(
  async (topicId: string) => {
    return db
      .select()
      .from(decks)
      .innerJoin(deckTopics, eq(decks.id, deckTopics.deckId))
      .where(
        and(eq(deckTopics.topicId, topicId), eq(decks.visibility, "public"))
      )
  },
  ["topic-decks"],
  { revalidate: 300, tags: [TOPIC_DECKS_CACHE_TAG] }
)
