import { unstable_cache } from "next/cache"
import { isNull } from "drizzle-orm"
import { db } from "@/lib/db/client"
import { languages } from "@/lib/db/schema"
import { enrichLanguages } from "@/lib/languages/flags"

export const LANGUAGES_CACHE_TAG = "languages"

export const getActiveLanguages = unstable_cache(
  async () => {
    const data = await db
      .select()
      .from(languages)
      .where(isNull(languages.deletedAt))
    return enrichLanguages(data)
  },
  ["active-languages"],
  { revalidate: 3600, tags: [LANGUAGES_CACHE_TAG] }
)
