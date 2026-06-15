"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, Library, Search, Sparkles, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
            <div className="text-destructive p-6 text-sm">
              Failed to load decks
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="text-muted-foreground p-10 text-center text-sm">
              No decks match these filters
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-ink/8 text-muted-foreground border-b text-left font-mono-tag text-[10px] uppercase tracking-widest">
                    <th className="px-4 py-2.5 font-medium">Deck</th>
                    <th className="px-4 py-2.5 font-medium">Visibility</th>
                    <th className="px-4 py-2.5 text-right font-medium">Cards</th>
                    <th className="px-4 py-2.5 text-right font-medium">Sessions</th>
                    <th className="px-4 py-2.5 font-medium">Creator</th>
                    <th className="px-4 py-2.5 font-medium">Created</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((deck) => (
                    <tr
                      key={deck.id}
                      className={cn(
                        "border-ink/8 hover:bg-ink/3 border-b transition-colors",
                        deck.deletedAt && "opacity-60"
                      )}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/decks/${deck.id}`}
                          className="flex items-center gap-2"
                        >
                          <span className="bg-ink/5 text-ink/70 flex h-7 w-7 items-center justify-center rounded-lg">
                            <Library className="h-3.5 w-3.5" strokeWidth={1.75} />
                          </span>
                          <span className="min-w-0">
                            <span className="text-ink/90 flex items-center gap-1.5 truncate font-medium">
                              {deck.title}
                              {deck.isCurated ? (
                                <Sparkles
                                  className="text-ember h-3.5 w-3.5 shrink-0"
                                  strokeWidth={1.75}
                                />
                              ) : null}
                              {deck.deletedAt ? (
                                <Trash2
                                  className="text-destructive h-3.5 w-3.5 shrink-0"
                                  strokeWidth={1.75}
                                />
                              ) : null}
                            </span>
                            <span className="text-muted-foreground block truncate font-mono text-[10px]">
                              {deck.slug}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {deck.visibility === "public" ? (
                          <Badge variant="default">
                            <Eye className="h-3 w-3" />
                            Public
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <EyeOff className="h-3 w-3" />
                            Private
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {deck.cardCount}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {deck.sessionCount}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate">
                        {deck.creatorName ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(deck.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="xs"
                          render={<Link href={`/admin/decks/${deck.id}`} />}
                        >
                          Open
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {data && data.total > data.limit ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {data.total.toLocaleString()} total
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={(filters.page ?? 1) === 1}
              onClick={() => updateFilters({ page: (filters.page ?? 1) - 1 })}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={(filters.page ?? 1) * data.limit >= data.total}
              onClick={() => updateFilters({ page: (filters.page ?? 1) + 1 })}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
