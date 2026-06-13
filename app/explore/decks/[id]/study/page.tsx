import { notFound, redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { asc, and, eq, inArray } from "drizzle-orm"

import { db } from "@/lib/db/client"
import { cards, decks, languages } from "@/lib/db/schema"
import { getLanguageFlag } from "@/lib/languages/flags"
import { GuestStudyPlayer } from "@/components/study"

export const dynamic = "force-dynamic"

export default async function GuestStudyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { userId } = await auth()
  if (userId) {
    redirect(`/explore/decks/${id}`)
  }

  const deckRows = await db
    .select()
    .from(decks)
    .where(and(eq(decks.id, id), eq(decks.visibility, "public")))

  if (!deckRows.length) {
    notFound()
  }

  const deck = deckRows[0]

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
    <div className="mx-auto w-full max-w-2xl px-4 pb-safe pt-4 sm:px-6 sm:pt-6">
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
