"use client"

import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { DeckActionsMenu } from "@/components/deck/deck-actions-menu"
import { DeckCard } from "@/components/deck/deck-card"
import { queryKeys } from "@/hooks"
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

async function publishDeck(id: string): Promise<void> {
  const res = await fetch(`/api/v1/decks/${id}/publish`, { method: "POST" })
  if (!res.ok) throw new Error("Failed to publish deck")
}

async function unpublishDeck(id: string): Promise<void> {
  const res = await fetch(`/api/v1/decks/${id}/unpublish`, { method: "POST" })
  if (!res.ok) throw new Error("Failed to unpublish deck")
}

async function deleteDeck(id: string): Promise<void> {
  const res = await fetch(`/api/v1/decks/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Failed to delete deck")
}

export function RecentDeckCard({ deck, languageNames }: RecentDeckCardProps) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const publishMutation = useMutation({
    mutationFn: publishDeck,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() })
      queryClient.invalidateQueries({ queryKey: queryKeys.decks() })
    },
  })

  const unpublishMutation = useMutation({
    mutationFn: unpublishDeck,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() })
      queryClient.invalidateQueries({ queryKey: queryKeys.decks() })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteDeck,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() })
      queryClient.invalidateQueries({ queryKey: queryKeys.decks() })
    },
  })

  return (
    <DeckCard
      deck={deck}
      href={`/decks/${deck.id}`}
      languageNames={languageNames}
      footerLeft={
        <span>
          {deck.cardCount} {deck.cardCount === 1 ? "card" : "cards"}
        </span>
      }
      onStudy={() => router.push(`/study?deckId=${deck.id}`)}
      actions={
        <DeckActionsMenu
          deck={deck}
          onEdit={() => router.push(`/decks/${deck.id}`)}
          onTogglePublish={() =>
            deck.visibility === "private"
              ? publishMutation.mutate(deck.id)
              : unpublishMutation.mutate(deck.id)
          }
          onDelete={() => deleteMutation.mutate(deck.id)}
          triggerClassName="text-ink/60 hover:text-ink"
        />
      }
    />
  )
}
