import { unstable_cache } from "next/cache"
import { db } from "@/lib/db/client"
import { promptTemplates, users } from "@/lib/db/schema"
import { and, eq, isNull } from "drizzle-orm"
import type { AdminPrompt } from "@/lib/queries/admin-prompts"

export const PROMPTS_CACHE_TAG = "prompts"

const PROMPT_SELECT = {
  id: promptTemplates.id,
  slug: promptTemplates.slug,
  version: promptTemplates.version,
  body: promptTemplates.body,
  description: promptTemplates.description,
  changelog: promptTemplates.changelog,
  isActive: promptTemplates.isActive,
  createdById: promptTemplates.createdById,
  createdByName: users.name,
  deletedAt: promptTemplates.deletedAt,
  createdAt: promptTemplates.createdAt,
  updatedAt: promptTemplates.updatedAt,
}

function serialize(row: {
  id: string
  slug: string
  version: number
  body: string
  description: string | null
  changelog: string | null
  isActive: boolean
  createdById: string | null
  createdByName: string | null
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}): AdminPrompt {
  return {
    id: row.id,
    slug: row.slug,
    version: row.version,
    body: row.body,
    description: row.description,
    changelog: row.changelog,
    isActive: row.isActive,
    createdById: row.createdById,
    createdByName: row.createdByName,
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export const getCachedActivePrompt = unstable_cache(
  async (slug: string): Promise<AdminPrompt | null> => {
    const rows = await db
      .select(PROMPT_SELECT)
      .from(promptTemplates)
      .leftJoin(users, eq(users.id, promptTemplates.createdById))
      .where(
        and(
          eq(promptTemplates.slug, slug),
          eq(promptTemplates.isActive, true),
          isNull(promptTemplates.deletedAt)
        )
      )
      .limit(1)

    return rows[0] ? serialize(rows[0]) : null
  },
  ["active-prompt"],
  { revalidate: 300, tags: [PROMPTS_CACHE_TAG] }
)
