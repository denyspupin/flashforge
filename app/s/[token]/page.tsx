import { notFound, redirect } from "next/navigation"
import { db } from "@/lib/db/client"
import { collections, decks } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { isValidShareToken } from "@/lib/share-token"

export const dynamic = "force-dynamic"

export default async function SharedLinkPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  if (!isValidShareToken(token)) {
    notFound()
  }

  const [deckRows, collectionRows] = await Promise.all([
    db
      .select({ id: decks.id })
      .from(decks)
      .where(eq(decks.shareToken, token))
      .limit(1),
    db
      .select({ id: collections.id })
      .from(collections)
      .where(eq(collections.shareToken, token))
      .limit(1),
  ])

  if (deckRows.length) {
    redirect(`/explore/decks/${deckRows[0].id}?share=${token}`)
  }

  if (collectionRows.length) {
    redirect(`/explore/collections/${collectionRows[0].id}?share=${token}`)
  }

  notFound()
}
