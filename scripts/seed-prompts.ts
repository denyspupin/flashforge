import { and, eq, sql } from "drizzle-orm"

import {
  COLLECTION_GENERATION_PROMPT,
  DECK_GENERATION_PROMPT,
} from "../lib/ai-prompt.ts"
import { db } from "../lib/db/client.ts"
import { promptTemplates, users } from "../lib/db/schema.ts"

const PROMPTS = [
  {
    slug: "deck-generation",
    body: DECK_GENERATION_PROMPT,
    description: "Default deck generation prompt",
  },
  {
    slug: "collection-generation",
    body: COLLECTION_GENERATION_PROMPT,
    description: "Default collection generation prompt",
  },
]

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

  const createdById = await findFirstAdminId()
  let inserted = 0
  let skipped = 0

  for (const prompt of PROMPTS) {
    const existing = await db
      .select({ id: promptTemplates.id })
      .from(promptTemplates)
      .where(
        and(
          eq(promptTemplates.slug, prompt.slug),
          eq(promptTemplates.version, 1),
          sql`${promptTemplates.deletedAt} IS NULL`,
        ),
      )
      .limit(1)

    if (existing.length > 0) {
      console.log(`Prompt "${prompt.slug}" v1 already exists, skipping.`)
      skipped += 1
      continue
    }

    await db.insert(promptTemplates).values({
      slug: prompt.slug,
      version: 1,
      body: prompt.body,
      description: prompt.description,
      changelog: "Initial seeded version.",
      isActive: true,
      createdById,
    })

    console.log(`Inserted prompt "${prompt.slug}" v1 (active).`)
    inserted += 1
  }

  console.log(`Done. ${inserted} inserted, ${skipped} skipped.`)
  process.exit(0)
}

seed().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
