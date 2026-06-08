"use client"

import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MoreHorizontal, Pencil, Trash2, Globe, Lock, Play } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DeckCard } from "@/components/deck/deck-card"
import type { Deck, Language } from "@/types"

type RecentDeckCardProps = {
  deck: Deck
  languageNames: { source?: string; target?: string }
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
      queryClient.invalidateQueries({ queryKey: ["decks"] })
      router.refresh()
    },
  })

  const unpublishMutation = useMutation({
    mutationFn: unpublishDeck,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["decks"] })
      router.refresh()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteDeck,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["decks"] })
      router.refresh()
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
      actions={
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            className="h-8 gap-1.5 rounded-full bg-ink px-3 text-xs font-medium text-paper hover:bg-ink/90"
            onClick={() => router.push(`/study?deckId=${deck.id}`)}
            aria-label={`Study ${deck.title}`}
          >
            <Play className="h-3.5 w-3.5" />
            Study
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-ink/60 hover:text-ink"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  aria-label="Deck actions"
                />
              }
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  router.push(`/decks/${deck.id}`)
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {deck.visibility === "private" ? (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    publishMutation.mutate(deck.id)
                  }}
                >
                  <Globe className="mr-2 h-4 w-4" />
                  Publish
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    unpublishMutation.mutate(deck.id)
                  }}
                >
                  <Lock className="mr-2 h-4 w-4" />
                  Make Private
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  deleteMutation.mutate(deck.id)
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    />
  )
}
