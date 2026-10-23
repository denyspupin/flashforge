"use client"

import { useState } from "react"

import { Star } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useFavoritesQuery } from "@/hooks/use-favorites"
import { useToggleFavorite } from "@/hooks/use-toggle-favorite"
import { cn } from "@/lib/utils"

type FavoriteTarget = {
  deckId?: string
  collectionId?: string
}

type FavoriteToggleButtonProps = {
  target: FavoriteTarget
  className?: string
}

function isFavorited(
  favorites: NonNullable<ReturnType<typeof useFavoritesQuery>["data"]>,
  target: FavoriteTarget
) {
  if (target.deckId) {
    return favorites.favoriteDecks.some((deck) => deck.id === target.deckId)
  }
  if (target.collectionId) {
    return favorites.favoriteCollections.some(
      (collection) => collection.id === target.collectionId
    )
  }
  return false
}

export function FavoriteToggleButton({
  target,
  className,
}: FavoriteToggleButtonProps) {
  const { data: favorites } = useFavoritesQuery()
  const toggleMutation = useToggleFavorite()
  const [pending, setPending] = useState<{
    value: boolean
    base: boolean
  } | null>(null)

  const serverFavorited = favorites ? isFavorited(favorites, target) : false
  const favorited =
    pending && pending.base === serverFavorited ? pending.value : serverFavorited

  const onToggle = () => {
    setPending({ value: !favorited, base: serverFavorited })
    toggleMutation.mutate(target, {
      onError: () => setPending(null),
    })
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      disabled={!favorites || toggleMutation.isPending}
      className={cn("shrink-0 text-ink/60 hover:text-ink", className)}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={favorited}
      title={favorited ? "Remove from favorites" : "Add to favorites"}
    >
      <Star
        className={cn(
          "h-4 w-4 transition-colors",
          favorited && "fill-yellow-400 text-yellow-500"
        )}
      />
    </Button>
  )
}
