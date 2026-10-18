"use client"

import { useRouter } from "next/navigation"
import { BookOpen, Library } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { DeckCard } from "@/components/deck/deck-card"
import { CollectionCard } from "@/components/collection/collection-card"
import {
  FollowToggleButton,
} from "@/components/follows/follow-toggle-button"
import { useFollowsQuery } from "@/hooks"

function FollowsTypeBadge({ type }: { type: "deck" | "collection" }) {
  return (
    <Badge variant="outline">
      {type === "deck" ? <BookOpen className="h-3 w-3" /> : <Library className="h-3 w-3" />}
      {type === "deck" ? "Deck" : "Collection"}
    </Badge>
  )
}

export function FollowsSection() {
  const router = useRouter()
  const { data } = useFollowsQuery()

  if (!data) return null
  const { followedDecks, followedCollections, languagesById } = data
  if (followedDecks.length === 0 && followedCollections.length === 0) {
    return null
  }

  const gridClassName =
    "grid grid-cols-1 gap-4 [contain:layout] sm:grid-cols-[repeat(auto-fill,minmax(340px,1fr))]"

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Following</h2>
        <p className="text-muted-foreground text-sm">
          Followed content stays up to date with its author’s changes.
        </p>
      </div>
      <div className={gridClassName}>
        {followedDecks.map((deck) => (
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
                <FollowsTypeBadge type="deck" />
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
            actions={<FollowToggleButton target={{ deckId: deck.id }} />}
          />
        ))}
        {followedCollections.map((collection) => (
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
                <FollowsTypeBadge type="collection" />
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
              <FollowToggleButton
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
