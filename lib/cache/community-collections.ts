import { unstable_cache } from "next/cache"
import { db } from "@/lib/db/client"
import {
  cards,
  collections,
  collectionDecks,
  users,
} from "@/lib/db/schema"
import { eq, and, sql, ilike, desc, asc } from "drizzle-orm"

export type CommunityCollectionsResult = Array<{
  id: string
  title: string
  slug: string
  description: string | null
  visibility: "private" | "public"
  creatorId: string
  creatorName: string | null
  isCurated: boolean
  forkedFromCollectionId: string | null
  sourceLanguageId: string
  targetLanguageId: string
  createdAt: Date
  deckCount: number
  totalCards: number
}>

export const COMMUNITY_COLLECTIONS_CACHE_TAG = "community-collections"

export const getCommunityCollections = unstable_cache(
  async (q: string | null, sort: string): Promise<CommunityCollectionsResult> => {
    const conditions = [eq(collections.visibility, "public")]

    if (q) {
      conditions.push(ilike(collections.title, `%${q}%`))
    }

    const rows = await db
      .select({
        id: collections.id,
        title: collections.title,
        slug: collections.slug,
        description: collections.description,
        visibility: collections.visibility,
        creatorId: collections.creatorId,
        creatorName: users.name,
        isCurated: collections.isCurated,
        forkedFromCollectionId: collections.forkedFromCollectionId,
        sourceLanguageId: collections.sourceLanguageId,
        targetLanguageId: collections.targetLanguageId,
        createdAt: collections.createdAt,
        deckCount: sql<number>`(
          SELECT count(*)::int FROM ${collectionDecks}
          WHERE ${collectionDecks.collectionId} = ${collections.id}
        )`,
        totalCards: sql<number>`(
          SELECT COALESCE(count(*)::int, 0)
          FROM ${cards} c
          WHERE EXISTS (
            SELECT 1 FROM ${collectionDecks} cd
            WHERE cd.deck_id = c.deck_id
            AND cd.collection_id = ${sql.raw('"collections"."id"')}
          )
        )`,
      })
      .from(collections)
      .leftJoin(users, eq(users.id, collections.creatorId))
      .where(and(...conditions))
      .orderBy(
        sort === "oldest" ? asc(collections.createdAt) : desc(collections.createdAt)
      )

    return rows
  },
  ["community-collections"],
  { revalidate: 60, tags: [COMMUNITY_COLLECTIONS_CACHE_TAG] }
)
