import { and, desc, eq, isNull, sql } from "drizzle-orm"

import { db } from "@/lib/db/client"
import { promptTemplates, users } from "@/lib/db/schema"

export type AdminPrompt = {
  id: string
  slug: string
  version: number
  body: string
  description: string | null
  changelog: string | null
  isActive: boolean
  createdById: string | null
  createdByName: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

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

export async function listAdminPrompts(options: {
  slug?: string
  includeDeleted?: boolean
} = {}): Promise<AdminPrompt[]> {
  const conditions = []
  if (options.slug) conditions.push(eq(promptTemplates.slug, options.slug))
  if (!options.includeDeleted) conditions.push(isNull(promptTemplates.deletedAt))

  const rows = await db
    .select(PROMPT_SELECT)
    .from(promptTemplates)
    .leftJoin(users, eq(users.id, promptTemplates.createdById))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(promptTemplates.slug), desc(promptTemplates.version))

  return rows.map(serialize)
}

export async function getAdminPrompt(id: string): Promise<AdminPrompt | null> {
  const rows = await db
    .select(PROMPT_SELECT)
    .from(promptTemplates)
    .leftJoin(users, eq(users.id, promptTemplates.createdById))
    .where(eq(promptTemplates.id, id))
    .limit(1)

  return rows[0] ? serialize(rows[0]) : null
}

export async function getNextPromptVersion(slug: string): Promise<number> {
  const [row] = await db
    .select({ next: sql<number>`COALESCE(MAX(${promptTemplates.version}), 0) + 1` })
    .from(promptTemplates)
    .where(
      and(
        eq(promptTemplates.slug, slug),
        isNull(promptTemplates.deletedAt),
      ),
    )
  return row?.next ?? 1
}

export async function getActivePrompt(slug: string): Promise<AdminPrompt | null> {
  const rows = await db
    .select(PROMPT_SELECT)
    .from(promptTemplates)
    .leftJoin(users, eq(users.id, promptTemplates.createdById))
    .where(
      and(
        eq(promptTemplates.slug, slug),
        eq(promptTemplates.isActive, true),
        isNull(promptTemplates.deletedAt),
      ),
    )
    .limit(1)

  return rows[0] ? serialize(rows[0]) : null
}
