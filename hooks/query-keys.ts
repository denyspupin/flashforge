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
  admin: {
    stats: () => ["admin", "stats"] as const,
    users: (filters?: AdminUserFilters) =>
      ["admin", "users", filters ?? {}] as const,
    user: (id: string) => ["admin", "users", id] as const,
    decks: (filters?: AdminDeckFilters) =>
      ["admin", "decks", filters ?? {}] as const,
    deck: (id: string) => ["admin", "decks", id] as const,
    topics: () => ["admin", "topics"] as const,
    topic: (id: string) => ["admin", "topics", id] as const,
    languages: () => ["admin", "languages"] as const,
    language: (id: string) => ["admin", "languages", id] as const,
  },
} as const

export type AdminUserFilters = {
  q?: string
  role?: "user" | "curator" | "admin"
  banned?: boolean
  deleted?: boolean
  page?: number
  limit?: number
}

export type AdminDeckFilters = {
  q?: string
  visibility?: "private" | "public"
  curated?: boolean
  creatorId?: string
  deleted?: boolean
  page?: number
  limit?: number
}
