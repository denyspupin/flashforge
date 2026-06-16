import { and, inArray, isNull } from "drizzle-orm"

import { db } from "@/lib/db/client"
import { languages } from "@/lib/db/schema"

export async function getActiveLanguageIds(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set()

  const rows = await db
    .select({ id: languages.id })
    .from(languages)
    .where(and(inArray(languages.id, ids), isNull(languages.deletedAt)))

  return new Set(rows.map((r) => r.id))
}
