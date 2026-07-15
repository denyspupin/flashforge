import { unstable_cache } from "next/cache"
import { isNull } from "drizzle-orm"
import { db } from "@/lib/db/client"
import { topics } from "@/lib/db/schema"

export const TOPICS_CACHE_TAG = "topics"

export const getActiveTopics = unstable_cache(
  async () => {
    return db.select().from(topics).where(isNull(topics.deletedAt))
  },
  ["active-topics"],
  { revalidate: 3600, tags: [TOPICS_CACHE_TAG] }
)
