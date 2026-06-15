import { and, eq, sql } from "drizzle-orm"

import { DECK_GENERATION_PROMPT } from "../lib/ai-prompt.ts"
import { db } from "../lib/db/client.ts"
import { promptTemplates, users } from "../lib/db/schema.ts"

const PROMPT_SLUG = "deck-generation"
const PROMPT_DESCRIPTION = "Default deck generation prompt"

async function findFirstAdminId(): Promise<string | null> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"))
    .limit(1)
  return rows[0]?.id ?? null
}

async function seed() {
  console.log("Seeding prompt templates...")

  const existing = await db
    .select({ id: promptTemplates.id })
    .from(promptTemplates)
    .where(
      and(
        eq(promptTemplates.slug, PROMPT_SLUG),
        eq(promptTemplates.version, 1),
        sql`${promptTemplates.deletedAt} IS NULL`,
      ),
    )
    .limit(1)

  if (existing.length > 0) {
    console.log(`Prompt "${PROMPT_SLUG}" v1 already exists, skipping.`)
    process.exit(0)
  }

  const createdById = await findFirstAdminId()

  await db.insert(promptTemplates).values({
    slug: PROMPT_SLUG,
    version: 1,
    body: DECK_GENERATION_PROMPT,
    description: PROMPT_DESCRIPTION,
    changelog: "Initial seeded version.",
    isActive: true,
    createdById,
  })

  console.log(`Inserted prompt "${PROMPT_SLUG}" v1 (active).`)
  process.exit(0)
}

seed().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
