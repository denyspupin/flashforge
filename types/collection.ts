import type { Deck } from "@/types/deck"

export type Collection = {
  id: string
  title: string
  description: string | null
  slug: string
  creatorId: string
  sourceLanguageId: string
  targetLanguageId: string
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
