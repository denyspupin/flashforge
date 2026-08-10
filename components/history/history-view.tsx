"use client"

import { useCallback, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowDownNarrowWide, ArrowUpNarrowWide, History } from "lucide-react"

import { HistoryEmpty, HistoryNoMatches } from "@/components/history/history-empty"
import { HistorySkeleton } from "@/components/history/history-skeleton"
import { SessionRow } from "@/components/history/session-row"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/garn/pagination"
import { Tabs, TabsList, TabsTrigger } from "@/components/garn/tabs"
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
        <div className="bg-brand-subtle flex h-9 w-9 items-center justify-center rounded-full">
          <History className="text-brand-solid h-5 w-5" strokeWidth={1.75} />
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
    <Tabs
      value={value}
      onValueChange={(next) => onChange(next as SortOrder)}
      variant="pill"
      size="sm"
    >
      <TabsList>
        <TabsTrigger value="desc" icon={<ArrowDownNarrowWide className="h-3 w-3" strokeWidth={2} />}>
          Newest
        </TabsTrigger>
        <TabsTrigger value="asc" icon={<ArrowUpNarrowWide className="h-3 w-3" strokeWidth={2} />}>
          Oldest
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

function buildQueryString(params: URLSearchParams): string {
  const qs = params.toString()
  return qs ? `?${qs}` : ""
}

function pageHref(params: URLSearchParams, next: number): string {
  const p = new URLSearchParams(params.toString())
  if (next <= 1) {
    p.delete("page")
  } else {
    p.set("page", String(next))
  }
  return `/history${buildQueryString(p)}`
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
        <div className="space-y-2 [contain:layout]">
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
          <Pagination className="w-auto justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={pageHref(searchParams, page - 1)}
                  aria-disabled={!hasPrev || isFetching}
                  className={cn(
                    (!hasPrev || isFetching) && "pointer-events-none opacity-50",
                  )}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href={pageHref(searchParams, page + 1)}
                  aria-disabled={!hasNext || isFetching}
                  className={cn(
                    (!hasNext || isFetching) && "pointer-events-none opacity-50",
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      ) : null}
    </div>
  )
}
