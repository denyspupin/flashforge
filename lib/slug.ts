import { db } from "@/lib/db/client"
import { collections, decks } from "@/lib/db/schema"
import { like } from "drizzle-orm"

type Executor = Pick<typeof db, "select">

export async function uniqueSlug(
  base: string,
  executor: Executor = db,
): Promise<string> {
  const root = `${base}-copy`
  const existing = await executor
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

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export async function uniqueCollectionSlug(
  base: string,
  executor: Executor = db,
): Promise<string> {
  const root = slugify(base)
  const existing = await executor
    .select({ slug: collections.slug })
    .from(collections)
    .where(like(collections.slug, `${root}%`))

  if (!existing.some((row) => row.slug === root)) return root

  let suffix = 2
  while (existing.some((row) => row.slug === `${root}-${suffix}`)) {
    suffix += 1
  }
  return `${root}-${suffix}`
}

