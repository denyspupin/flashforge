import type { Deck, DeckVisibility } from "@/types/deck"

export type Collection = {
  id: string
  title: string
  description: string | null
  slug: string
  visibility: DeckVisibility
  creatorId: string
  creatorName?: string | null
  sourceLanguageId: string
  targetLanguageId: string
  isCurated: boolean
  forkedFromCollectionId: string | null
  deckCount: number
  totalCards: number
  decks?: CollectionDeck[]
  createdAt: string
  updatedAt?: string
}

export type CollectionDeck = Pick<
  Deck,
  | "id"
  | "title"
  | "description"
  | "slug"
  | "sourceLanguageId"
  | "targetLanguageId"
  | "cardCount"
  | "topics"
> & {
  position: number
}
