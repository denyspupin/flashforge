import { db } from "@/lib/db/client"
import { decks } from "@/lib/db/schema"
import { like } from "drizzle-orm"

export async function uniqueSlug(base: string): Promise<string> {
  const root = `${base}-copy`
  const existing = await db
    .select({ slug: decks.slug })
    .from(decks)
    .where(like(decks.slug, `${root}%`))

  if (!existing.some((row) => row.slug === root)) return root

  let suffix = 2
  while (existing.some((row) => row.slug === `${root}-${suffix}`)) {
    suffix += 1
  }
  return `${root}-${suffix}`
}
