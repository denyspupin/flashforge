"use client"

import { useRouter } from "next/navigation"
import { BookOpen, Library } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { DeckCard } from "@/components/deck/deck-card"
import { CollectionCard } from "@/components/collection/collection-card"
import {
  FavoriteToggleButton,
} from "@/components/favorites/favorite-toggle-button"
import { useFavoritesQuery } from "@/hooks"

function FavoritesTypeBadge({ type }: { type: "deck" | "collection" }) {
  return (
    <Badge variant="outline">
      {type === "deck" ? <BookOpen className="h-3 w-3" /> : <Library className="h-3 w-3" />}
      {type === "deck" ? "Deck" : "Collection"}
    </Badge>
  )
}

export function FavoritesSection() {
  const router = useRouter()
  const { data } = useFavoritesQuery()

  if (!data) return null
  const { favoriteDecks, favoriteCollections, languagesById } = data
  if (favoriteDecks.length === 0 && favoriteCollections.length === 0) {
    return null
  }

  const gridClassName =
    "grid grid-cols-1 gap-4 [contain:layout] sm:grid-cols-[repeat(auto-fill,minmax(340px,1fr))]"

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">Favorites</h2>
      <div className={gridClassName}>
        {favoriteDecks.map((deck) => (
          <DeckCard
            key={deck.id}
            deck={deck}
            href={`/decks/${deck.id}?from=${encodeURIComponent("/dashboard")}`}
            languageNames={{
              source: languagesById[deck.sourceLanguageId]?.name,
              target: languagesById[deck.targetLanguageId]?.name,
              sourceFlag: languagesById[deck.sourceLanguageId]?.flag,
              targetFlag: languagesById[deck.targetLanguageId]?.flag,
            }}
            badges={
              <>
                <FavoritesTypeBadge type="deck" />
                <DeckCard.CuratedBadge />
                <DeckCard.TopicBadges topics={deck.topics} />
              </>
            }
            footerLeft={
              <span>
                {deck.cardCount} {deck.cardCount === 1 ? "card" : "cards"}
              </span>
            }
            onStudy={(deckId) =>
              router.push(
                `/study?deckId=${deckId}&from=${encodeURIComponent("/dashboard")}`
              )
            }
            actions={<FavoriteToggleButton target={{ deckId: deck.id }} />}
          />
        ))}
        {favoriteCollections.map((collection) => (
          <CollectionCard
            key={collection.id}
            collection={collection}
            href={`/collections/${collection.id}?from=${encodeURIComponent("/dashboard")}`}
            languageNames={{
              source: languagesById[collection.sourceLanguageId]?.name,
              target: languagesById[collection.targetLanguageId]?.name,
              sourceFlag: languagesById[collection.sourceLanguageId]?.flag,
              targetFlag: languagesById[collection.targetLanguageId]?.flag,
            }}
            badges={
              <>
                <FavoritesTypeBadge type="collection" />
                <CollectionCard.VisibilityBadge
                  visibility={collection.visibility}
                />
                {collection.isCurated ? <CollectionCard.CuratedBadge /> : null}
                {collection.forkedFromCollectionId ? (
                  <CollectionCard.ForkedBadge />
                ) : null}
              </>
            }
            actions={
              <FavoriteToggleButton
                target={{ collectionId: collection.id }}
                className="text-ink/60 hover:text-ink"
              />
            }
          />
        ))}
      </div>
    </div>
  )
}
