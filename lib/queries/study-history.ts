import type { ApiResponse } from "@/lib/api/response"
import type {
  HistoryQueryInput,
  HistoryResult,
  HistorySession,
} from "@/app/api/v1/study/history/route"

export type StudyHistoryFilters = HistoryQueryInput

export type { HistoryResult, HistorySession, HistorySessionDeck } from "@/app/api/v1/study/history/route"

function toQueryString(filters: HistoryQueryInput): string {
  const params = new URLSearchParams()
  if (filters.deckId) params.set("deckId", filters.deckId)
  if (filters.sort && filters.sort !== "desc") params.set("sort", filters.sort)
  if (filters.page) params.set("page", String(filters.page))
  if (filters.limit) params.set("limit", String(filters.limit))
  return params.toString()
}

export async function fetchStudyHistory(
  filters: HistoryQueryInput = {},
): Promise<HistoryResult> {
  const qs = toQueryString(filters)
  const res = await fetch(`/api/v1/study/history${qs ? `?${qs}` : ""}`)
  if (!res.ok) throw new Error("Failed to load study history")
  const body: ApiResponse<HistoryResult> = await res.json()
  if (!body.data) throw new Error("Failed to load study history")
  return body.data
}
