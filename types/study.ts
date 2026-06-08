export type StudySessionStatus = "active" | "completed" | "abandoned"

export type StudySession = {
  id: string
  userId: string
  deckId: string
  status: StudySessionStatus
  startedAt: string
  completedAt: string | null
  cardsReviewed: number
  cardsCorrect: number
  failedCardIds: string[]
  createdAt: string
  updatedAt: string
}
