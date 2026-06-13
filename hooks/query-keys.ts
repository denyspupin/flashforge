export const queryKeys = {
  dashboard: () => ["dashboard"] as const,
  profile: () => ["profile"] as const,
  me: () => ["users", "me"] as const,
  decks: () => ["decks"] as const,
  deck: (id: string) => ["deck", id] as const,
  languages: () => ["languages"] as const,
  topics: () => ["topics"] as const,
  communityDecks: (q?: string) => ["community-decks", q ?? ""] as const,
  publicDeck: (id: string) => ["public-deck", id] as const,
  studySession: (id: string) => ["study", id] as const,
  studyHistory: () => ["study", "history"] as const,
  notifications: () => ["notifications"] as const,
} as const
