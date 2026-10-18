"use client"

import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"

import { FavoriteToggleButton } from "@/components/favorites/favorite-toggle-button"
import { DeckCard } from "@/components/deck/deck-card"
import type { Deck } from "@/types"

type RecentDeckCardProps = {
  deck: Deck
  languageNames: {
    source?: string
    target?: string
    sourceFlag?: string
    targetFlag?: string
  }
}

export function RecentDeckCard({ deck, languageNames }: RecentDeckCardProps) {
  const router = useRouter()
  const { user } = useUser()

  return (
    <DeckCard
      deck={deck}
      href={
        deck.creatorId === user?.id
          ? `/decks/${deck.id}`
          : `/explore/decks/${deck.id}`
      }
      languageNames={languageNames}
      footerLeft={
        <span>
          {deck.cardCount} {deck.cardCount === 1 ? "card" : "cards"}
        </span>
      }
      onStudy={() =>
        router.push(
          `/study?deckId=${deck.id}&from=${encodeURIComponent("/dashboard")}`
        )
      }
      actions={<FavoriteToggleButton target={{ deckId: deck.id }} />}
    />
  )
}
