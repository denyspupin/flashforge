export type DeckVisibility = "private" | "public"

export type DeckTopic = {
  id: string
  name: string
  slug: string
}

export type Deck = {
  id: string
  title: string
  description: string | null
  slug: string
  visibility: DeckVisibility
  sourceLanguageId: string
  targetLanguageId: string
  creatorId: string
  creatorName?: string | null
  isCurated: boolean
  forkedFromDeckId: string | null
  cardCount: number
  topics?: DeckTopic[]
  createdAt: string
  updatedAt?: string
}

export type Language = {
  id: string
  name: string
  code: string
}
