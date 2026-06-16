export const XP_VALUES = {
  CARD_REVIEWED: 5,
  CARD_CORRECT: 10,
  DECK_COMPLETE: 50,
  DECK_PERFECT: 100,
  STREAK_BONUS_MULTIPLIER: 0.1,
} as const

export const STREAK_MULTIPLIERS = [
  { days: 0, multiplier: 1 },
  { days: 3, multiplier: 1.5 },
  { days: 7, multiplier: 2 },
  { days: 14, multiplier: 2.5 },
  { days: 30, multiplier: 3 },
] as const

export const DEFAULT_TOPICS = [
  { name: "Food", slug: "food" },
  { name: "Animals", slug: "animals" },
  { name: "Household", slug: "household" },
  { name: "Work Meeting", slug: "work-meeting" },
  { name: "Doctor Visit", slug: "doctor-visit" },
  { name: "Travel", slug: "travel" },
  { name: "Shopping", slug: "shopping" },
] as const

export const DEFAULT_LANGUAGES = [
  { name: "English", code: "en" },
  { name: "Spanish", code: "es" },
  { name: "German", code: "de" },
  { name: "French", code: "fr" },
  { name: "Italian", code: "it" },
  { name: "Portuguese", code: "pt" },
  { name: "Russian", code: "ru" },
  { name: "Japanese", code: "ja" },
  { name: "Chinese", code: "zh" },
] as const

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const

export const STUDY_SESSION = {
  ABANDON_THRESHOLD_HOURS: 24,
} as const

export const DECK_EXPORT = {
  FORMAT: "flashforge.deck" as const,
  FORMAT_VERSION: "1.0" as const,
  GENERATOR: "flashforge" as const,
  MAX_IMPORT_CARDS: 1000,
} as const

export const PROMPT_TEMPLATES = {
  DECK_GENERATION_SLUG: "deck-generation",
  MAX_BODY_LENGTH: 50_000,
  MAX_DESCRIPTION_LENGTH: 256,
} as const

export const THEME_OPTIONS = ["light", "dark", "system"] as const
export type Theme = (typeof THEME_OPTIONS)[number]
export const DEFAULT_THEME: Theme = "system"
