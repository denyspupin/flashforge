"use client"

import { useCallback, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowDownNarrowWide, ArrowUpNarrowWide, History } from "lucide-react"

import { Button } from "@/components/ui/button"
import { HistoryEmpty, HistoryNoMatches } from "@/components/history/history-empty"
import { HistorySkeleton } from "@/components/history/history-skeleton"
import { SessionRow } from "@/components/history/session-row"
import { queryKeys, fetchStudyHistory } from "@/hooks"
import { PAGINATION } from "@/lib/constants"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 25
type SortOrder = "asc" | "desc"

function HistoryHeader({
  sort,
  onSortChange,
}: {
  sort: SortOrder
  onSortChange: (next: SortOrder) => void
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className="bg-ember/10 flex h-9 w-9 items-center justify-center rounded-full">
          <History className="text-ember h-5 w-5" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Study history
          </h1>
          <p className="text-muted-foreground text-sm">
            Your completed sessions, sorted by date.
          </p>
        </div>
      </div>
      <SortToggle value={sort} onChange={onSortChange} />
    </div>
  )
}

function SortToggle({
  value,
  onChange,
}: {
  value: SortOrder
  onChange: (next: SortOrder) => void
}) {
  return (
    <div
      className="bg-ink/4 inline-flex h-7 items-center gap-0.5 rounded-lg p-0.5 ring-1 ring-foreground/10"
      role="tablist"
      aria-label="Sort by date"
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === "desc"}
        onClick={() => onChange("desc")}
        className={cn(
          "inline-flex h-6 items-center gap-1 rounded-md px-2.5 font-mono-tag text-[10px] uppercase tracking-widest transition-colors",
          value === "desc"
            ? "bg-paper text-ink shadow-sm"
            : "text-ink/55 hover:text-ink/80",
        )}
      >
        <ArrowDownNarrowWide className="h-3 w-3" strokeWidth={2} />
        Newest
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "asc"}
        onClick={() => onChange("asc")}
        className={cn(
          "inline-flex h-6 items-center gap-1 rounded-md px-2.5 font-mono-tag text-[10px] uppercase tracking-widest transition-colors",
          value === "asc"
            ? "bg-paper text-ink shadow-sm"
            : "text-ink/55 hover:text-ink/80",
        )}
      >
        <ArrowUpNarrowWide className="h-3 w-3" strokeWidth={2} />
        Oldest
      </button>
    </div>
  )
}

function buildQueryString(params: URLSearchParams): string {
  const qs = params.toString()
  return qs ? `?${qs}` : ""
}

export function HistoryView() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const sort: SortOrder = searchParams.get("sort") === "asc" ? "asc" : "desc"
  const page = useMemo(() => {
    const raw = Number(searchParams.get("page"))
    return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1
  }, [searchParams])

  const filters = useMemo(
    () => ({ sort, page, limit: PAGE_SIZE }),
    [sort, page],
  )

  const setPage = useCallback(
    (next: number) => {
      const params = new URLSearchParams(searchParams.toString())
      if (next <= 1) {
        params.delete("page")
      } else {
        params.set("page", String(next))
      }
      router.push(`/history${buildQueryString(params)}`)
    },
    [router, searchParams],
  )

  const setSort = useCallback(
    (next: SortOrder) => {
      const params = new URLSearchParams(searchParams.toString())
      if (next === "desc") {
        params.delete("sort")
      } else {
        params.set("sort", next)
      }
      params.delete("page")
      router.push(`/history${buildQueryString(params)}`)
    },
    [router, searchParams],
  )

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: queryKeys.studyHistory(filters),
    queryFn: () => fetchStudyHistory(filters),
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasPrev = page > 1
  const hasNext = page < totalPages

  if (isLoading) {
    return (
      <div className="space-y-6">
        <HistoryHeader sort={sort} onSortChange={setSort} />
        <HistorySkeleton />
      </div>
    )
  }

  if (error) throw error

  if (total === 0) {
    return (
      <div className="space-y-6">
        <HistoryHeader sort={sort} onSortChange={setSort} />
        <HistoryEmpty />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <HistoryHeader sort={sort} onSortChange={setSort} />

      {items.length === 0 ? (
        <HistoryNoMatches />
      ) : (
        <div className="space-y-2">
          {items.map((session) => (
            <SessionRow key={session.id} session={session} showDeck />
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {total.toLocaleString()} {total === 1 ? "session" : "sessions"}{" "}
            total
            {total > PAGINATION.MAX_LIMIT ? (
              <span className="ml-1.5">
                · page {page} of {totalPages.toLocaleString()}
              </span>
            ) : null}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasPrev || isFetching}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNext || isFetching}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
