"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { Award, Eye, EyeOff, Library, Search, Trash2 } from "lucide-react"

import { Badge } from "@/components/garn/badge"
import { Button } from "@/components/garn/button"
import { Card, CardContent } from "@/components/garn/card"
import { Input } from "@/components/garn/input"
import { Skeleton } from "@/components/garn/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/garn/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
} from "@/components/garn/table"
import { queryKeys, type AdminDeckFilters } from "@/hooks"
import type { ApiResponse } from "@/lib/api/response"
import type { AdminDeckListResult } from "@/lib/queries/admin-decks"
import { cn } from "@/lib/utils"

const ALL = "__all__"

function toQueryString(filters: AdminDeckFilters): string {
  const params = new URLSearchParams()
  if (filters.q) params.set("q", filters.q)
  if (filters.visibility) params.set("visibility", filters.visibility)
  if (filters.curated !== undefined) params.set("curated", String(filters.curated))
  if (filters.creatorId) params.set("creatorId", filters.creatorId)
  if (filters.deleted !== undefined)
    params.set("deleted", String(filters.deleted))
  if (filters.page) params.set("page", String(filters.page))
  if (filters.limit) params.set("limit", String(filters.limit))
  return params.toString()
}

async function fetchDecks(
  filters: AdminDeckFilters
): Promise<AdminDeckListResult> {
  const qs = toQueryString(filters)
  const res = await fetch(`/api/v1/admin/decks${qs ? `?${qs}` : ""}`)
  if (!res.ok) throw new Error("Failed to load decks")
  const body: ApiResponse<AdminDeckListResult> = await res.json()
  if (!body.data) throw new Error("Failed to load decks")
  return body.data
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function AdminDecksView() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const filters: AdminDeckFilters = React.useMemo(() => {
    const q = searchParams.get("q") ?? undefined
    const visibilityParam = searchParams.get("visibility")
    const visibility =
      visibilityParam === "public" || visibilityParam === "private"
        ? visibilityParam
        : undefined
    const curatedParam = searchParams.get("curated")
    const curated =
      curatedParam === "true"
        ? true
        : curatedParam === "false"
          ? false
          : undefined
    const deletedParam = searchParams.get("deleted")
    const deleted =
      deletedParam === "true"
        ? true
        : deletedParam === "false"
          ? false
          : undefined
    const page = Number(searchParams.get("page")) || 1
    const limit = Number(searchParams.get("limit")) || 20
    return { q, visibility, curated, deleted, page, limit }
  }, [searchParams])

  const updateFilters = React.useCallback(
    (patch: Partial<AdminDeckFilters>) => {
      const next = { ...filters, ...patch }
      Object.keys(next).forEach((key) => {
        const value = (next as Record<string, unknown>)[key]
        if (value === undefined || value === "" || value === null) {
          delete (next as Record<string, unknown>)[key]
        }
      })
      if (next.page === undefined) next.page = 1
      const qs = toQueryString(next)
      router.push(`/admin/decks${qs ? `?${qs}` : ""}`)
    },
    [filters, router],
  )

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.admin.decks(filters),
    queryFn: () => fetchDecks(filters),
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Decks</h1>
        <p className="text-muted-foreground text-sm">
          Curate featured decks, moderate content, restore soft-deleted decks
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
          <Input
            value={filters.q ?? ""}
            onChange={(e) => updateFilters({ q: e.target.value || undefined, page: 1 })}
            placeholder="Search by title or slug…"
            className="pl-8"
          />
        </div>
        <Select
          value={filters.visibility ?? ALL}
          onValueChange={(v) =>
            updateFilters({
              visibility: v === ALL ? undefined : (v as "public" | "private"),
              page: 1,
            })
          }
        >
          <SelectTrigger size="sm" className="w-32">
            <SelectValue placeholder="All visibility" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All</SelectItem>
            <SelectItem value="public">Public</SelectItem>
            <SelectItem value="private">Private</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={
            filters.curated === true
              ? "curated"
              : filters.deleted === true
                ? "deleted"
                : "active"
          }
          onValueChange={(v) => {
            if (v === "curated") {
              updateFilters({ curated: true, deleted: undefined, page: 1 })
            } else if (v === "deleted") {
              updateFilters({ deleted: true, curated: undefined, page: 1 })
            } else {
              updateFilters({ deleted: false, curated: undefined, page: 1 })
            }
          }}
        >
          <SelectTrigger size="sm" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active only</SelectItem>
            <SelectItem value="curated">Curated</SelectItem>
            <SelectItem value="deleted">Soft-deleted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-danger p-6 text-sm">
              Failed to load decks
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="text-muted-foreground p-10 text-center text-sm">
              No decks match these filters
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-muted-foreground font-mono text-[10px] uppercase tracking-widest">
                  <TableHead>Deck</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead className="text-right">Cards</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((deck) => (
                  <TableRow
                    key={deck.id}
                    className={cn(deck.deletedAt && "opacity-60")}
                  >
                    <TableCell>
                      <Link
                        href={`/admin/decks/${deck.id}`}
                        className="flex items-center gap-2"
                      >
                        <span className="bg-foreground/5 text-foreground/70 flex h-7 w-7 items-center justify-center rounded-lg">
                          <Library className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </span>
                        <span className="min-w-0">
                          <span className="text-foreground/90 flex items-center gap-1.5 truncate font-medium">
                            {deck.title}
                            {deck.isCurated ? (
                              <Award
                                className="text-brand-solid h-3.5 w-3.5 shrink-0"
                                strokeWidth={1.75}
                              />
                            ) : null}
                            {deck.deletedAt ? (
                              <Trash2
                                className="text-danger h-3.5 w-3.5 shrink-0"
                                strokeWidth={1.75}
                              />
                            ) : null}
                          </span>
                          <span className="text-muted-foreground block truncate font-mono text-[10px]">
                            {deck.slug}
                          </span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      {deck.visibility === "public" ? (
                        <Badge tone="neutral" appearance="soft">
                          <Eye className="h-3 w-3" />
                          Public
                        </Badge>
                      ) : (
                        <Badge tone="neutral" appearance="outline">
                          <EyeOff className="h-3 w-3" />
                          Private
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {deck.cardCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {deck.sessionCount}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[180px] truncate">
                      {deck.creatorName ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(deck.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="xs"
                        asChild
                      >
                        <Link href={`/admin/decks/${deck.id}`}>
                          Open
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {data && data.total > data.limit ? (
        <TablePagination
          page={filters.page ?? 1}
          pageCount={Math.ceil(data.total / data.limit)}
          pageSize={data.limit}
          total={data.total}
          onPageChange={(page) => updateFilters({ page })}
        />
      ) : null}
    </div>
  )
}
