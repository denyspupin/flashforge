import { notFound, redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { asc, eq, inArray } from "drizzle-orm"

import { db } from "@/lib/db/client"
import {
  cards,
  collections,
  collectionDecks,
  decks,
  languages,
} from "@/lib/db/schema"
import { getLanguageFlag } from "@/lib/languages/flags"
import { isValidShareToken } from "@/lib/share-token"
import { GuestStudyPlayer } from "@/components/study"

export const dynamic = "force-dynamic"

export default async function GuestStudyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ share?: string }>
}) {
  const { id } = await params
  const { share } = await searchParams

  const { userId } = await auth()
  if (userId) {
    redirect(
      share && isValidShareToken(share)
        ? `/explore/decks/${id}?share=${encodeURIComponent(share)}`
        : `/explore/decks/${id}`
    )
  }

  if (!isValidShareToken(share)) {
    notFound()
  }

  const [deckRows, sharedCollectionDeckIds] = await Promise.all([
    db.select().from(decks).where(eq(decks.id, id)).limit(1),
    db
      .select({ deckId: collectionDecks.deckId })
      .from(collections)
      .innerJoin(
        collectionDecks,
        eq(collectionDecks.collectionId, collections.id)
      )
      .where(eq(collections.shareToken, share)),
  ])

  const deck = deckRows[0]
  if (!deck) {
    notFound()
  }

  const isSharedByLink =
    deck.shareToken === share ||
    sharedCollectionDeckIds.some((row) => row.deckId === deck.id)

  if (!isSharedByLink) {
    notFound()
  }

  const [deckCards, languageRows] = await Promise.all([
    db
      .select({ id: cards.id, deckId: cards.deckId, front: cards.front, back: cards.back })
      .from(cards)
      .where(eq(cards.deckId, id))
      .orderBy(asc(cards.createdAt)),
    db
      .select()
      .from(languages)
      .where(
        inArray(languages.id, [deck.sourceLanguageId, deck.targetLanguageId]),
      ),
  ])

  const sourceLanguage = languageRows.find((l) => l.id === deck.sourceLanguageId)
  const targetLanguage = languageRows.find((l) => l.id === deck.targetLanguageId)

  return (
    <div className="mx-auto w-full max-w-2xl py-4 sm:py-6">
      <GuestStudyPlayer
        deck={{
          id: deck.id,
          title: deck.title,
          sourceLanguage: sourceLanguage?.name ?? "Source",
          targetLanguage: targetLanguage?.name ?? "Target",
          sourceLanguageFlag: getLanguageFlag(sourceLanguage?.code),
          targetLanguageFlag: getLanguageFlag(targetLanguage?.code),
        }}
        cards={deckCards}
      />
    </div>
  )
}
