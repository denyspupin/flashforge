"use client"

import * as React from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { Check, Layers, Loader2, Pencil, Search, Trash2, X } from "lucide-react"

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
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { queryKeys, type AdminCollectionFilters } from "@/hooks"
import type { ApiResponse } from "@/lib/api/response"
import type { AdminCollectionListResult } from "@/lib/queries/admin-collections"
import { cn } from "@/lib/utils"

function toQueryString(filters: AdminCollectionFilters): string {
  const params = new URLSearchParams()
  if (filters.q) params.set("q", filters.q)
  if (filters.creatorId) params.set("creatorId", filters.creatorId)
  if (filters.deleted !== undefined)
    params.set("deleted", String(filters.deleted))
  if (filters.page) params.set("page", String(filters.page))
  if (filters.limit) params.set("limit", String(filters.limit))
  return params.toString()
}

async function fetchCollections(
  filters: AdminCollectionFilters
): Promise<AdminCollectionListResult> {
  const qs = toQueryString(filters)
  const res = await fetch(`/api/v1/admin/collections${qs ? `?${qs}` : ""}`)
  if (!res.ok) throw new Error("Failed to load collections")
  const body: ApiResponse<AdminCollectionListResult> = await res.json()
  if (!body.data) throw new Error("Failed to load collections")
  return body.data
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

async function deleteCollection(id: string): Promise<void> {
  const res = await fetch(`/api/v1/admin/collections/${id}`, {
    method: "DELETE",
  })
  if (!res.ok) throw new Error("Failed to delete collection")
}

export function AdminCollectionsView() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()

  const filters: AdminCollectionFilters = React.useMemo(() => {
    const q = searchParams.get("q") ?? undefined
    const creatorId = searchParams.get("creatorId") ?? undefined
    const deletedParam = searchParams.get("deleted")
    const deleted =
      deletedParam === "true"
        ? true
        : deletedParam === "false"
          ? false
          : undefined
    const page = Number(searchParams.get("page")) || 1
    const limit = Number(searchParams.get("limit")) || 20
    return { q, creatorId, deleted, page, limit }
  }, [searchParams])

  const updateFilters = React.useCallback(
    (patch: Partial<AdminCollectionFilters>) => {
      const next = { ...filters, ...patch }
      Object.keys(next).forEach((key) => {
        const value = (next as Record<string, unknown>)[key]
        if (value === undefined || value === "" || value === null) {
          delete (next as Record<string, unknown>)[key]
        }
      })
      if (next.page === undefined) next.page = 1
      const qs = toQueryString(next)
      router.push(`/admin/collections${qs ? `?${qs}` : ""}`)
    },
    [filters, router],
  )

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.admin.collections(filters),
    queryFn: () => fetchCollections(filters),
  })

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(
    null,
  )
  const [confirmBulkDelete, setConfirmBulkDelete] = React.useState(false)

  const invalidate = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.collections() })
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats() })
  }, [queryClient])

  const deleteMutation = useMutation({
    mutationFn: deleteCollection,
    onSuccess: (_data, id) => {
      setPendingDeleteId(null)
      setSelectedIds((prev) => {
        if (!prev.has(id)) return prev
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      invalidate()
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(ids.map(deleteCollection))
      const succeeded = results.filter((r) => r.status === "fulfilled").length
      const failed = results.length - succeeded
      return { ids, succeeded, failed }
    },
    onSuccess: ({ ids, failed }) => {
      setConfirmBulkDelete(false)
      if (failed === 0) {
        setSelectedIds((prev) => {
          const next = new Set(prev)
          for (const id of ids) next.delete(id)
          return next
        })
      }
      invalidate()
    },
  })

  const visibleItems = React.useMemo(
    () => (data?.items ?? []).filter((c) => !c.deletedAt),
    [data],
  )
  const visibleIds = React.useMemo(
    () => new Set(visibleItems.map((c) => c.id)),
    [visibleItems],
  )
  const allVisibleSelected =
    visibleItems.length > 0 && visibleItems.every((c) => selectedIds.has(c.id))
  const someVisibleSelected = visibleItems.some((c) => selectedIds.has(c.id))

  const toggleOne = React.useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAllVisible = React.useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        for (const id of visibleIds) next.delete(id)
      } else {
        for (const id of visibleIds) next.add(id)
      }
      return next
    })
  }, [allVisibleSelected, visibleIds])

  const clearSelection = React.useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const headerCheckboxRef = React.useRef<HTMLInputElement | null>(null)
  React.useEffect(() => {
    const el = headerCheckboxRef.current
    if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected
  }, [allVisibleSelected, someVisibleSelected])

  const selectedCount = selectedIds.size
  const bulkPending = bulkDeleteMutation.isPending
  const singlePending =
    deleteMutation.isPending && deleteMutation.variables === pendingDeleteId

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Collections</h1>
        <p className="text-muted-foreground text-sm">
          Moderate content, restore soft-deleted collections
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
          <Input
            value={filters.q ?? ""}
            onChange={(e) =>
              updateFilters({ q: e.target.value || undefined, page: 1 })
            }
            placeholder="Search by title or slug…"
            className="pl-8"
          />
        </div>
        <Select
          value={filters.deleted === true ? "deleted" : "active"}
          onValueChange={(v) => {
            if (v === "deleted") {
              updateFilters({ deleted: true, page: 1 })
            } else {
              updateFilters({ deleted: false, page: 1 })
            }
          }}
        >
          <SelectTrigger size="sm" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active only</SelectItem>
            <SelectItem value="deleted">Soft-deleted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedCount > 0 ? (
        <div className="bg-ink/5 flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
          <span className="text-ink/90">
            <span className="tabular-nums font-medium">{selectedCount}</span>{" "}
            {selectedCount === 1 ? "collection" : "collections"} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="ghost"
              onClick={clearSelection}
              disabled={bulkPending}
            >
              <X className="mr-1 h-3 w-3" />
              Clear
            </Button>
            <Button
              size="xs"
              variant="destructive"
              onClick={() => setConfirmBulkDelete(true)}
              disabled={bulkPending}
            >
              {bulkPending ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="mr-1 h-3 w-3" />
              )}
              Delete selected
            </Button>
          </div>
        </div>
      ) : null}

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
              Failed to load collections
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="text-muted-foreground p-10 text-center text-sm">
              No collections match these filters
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-ink/8 text-muted-foreground border-b text-left font-mono-tag text-[10px] uppercase tracking-widest">
                    <th className="w-10 px-4 py-2.5">
                      <input
                        ref={headerCheckboxRef}
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleAllVisible}
                        disabled={visibleItems.length === 0}
                        aria-label="Select all visible collections"
                        className="h-4 w-4 cursor-pointer rounded border-ink/20 text-ember focus:ring-ember/30 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </th>
                    <th className="px-4 py-2.5 font-medium">Collection</th>
                    <th className="px-4 py-2.5 font-medium">Language pair</th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      Decks
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      Cards
                    </th>
                    <th className="px-4 py-2.5 font-medium">Creator</th>
                    <th className="px-4 py-2.5 font-medium">Created</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((collection) => {
                    const isSelected = selectedIds.has(collection.id)
                    const isDeleted = collection.deletedAt !== null
                    return (
                      <tr
                        key={collection.id}
                        className={cn(
                          "border-ink/8 hover:bg-ink/3 border-b transition-colors",
                          isSelected && "bg-ember/5",
                          isDeleted && "opacity-60",
                        )}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOne(collection.id)}
                            disabled={isDeleted}
                            aria-label={`Select ${collection.title}`}
                            className="h-4 w-4 cursor-pointer rounded border-ink/20 text-ember focus:ring-ember/30 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/collections/${collection.id}`}
                            className="flex items-center gap-2"
                          >
                            <span className="bg-ink/5 text-ink/70 flex h-7 w-7 items-center justify-center rounded-lg">
                              <Layers
                                className="h-3.5 w-3.5"
                                strokeWidth={1.75}
                              />
                            </span>
                            <span className="min-w-0">
                              <span className="text-ink/90 flex items-center gap-1.5 truncate font-medium">
                                {collection.title}
                                {isDeleted ? (
                                  <Trash2
                                    className="text-destructive h-3.5 w-3.5 shrink-0"
                                    strokeWidth={1.75}
                                  />
                                ) : null}
                              </span>
                              <span className="text-muted-foreground block truncate font-mono text-[10px]">
                                {collection.slug}
                              </span>
                            </span>
                          </Link>
                        </td>
                        <td className="text-muted-foreground max-w-[180px] truncate px-4 py-3">
                          {collection.sourceLanguageName ?? "—"} →{" "}
                          {collection.targetLanguageName ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {collection.deckCount}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {collection.totalCards}
                        </td>
                        <td className="text-muted-foreground max-w-[180px] truncate px-4 py-3">
                          {collection.creatorName ?? "—"}
                        </td>
                        <td className="text-muted-foreground px-4 py-3">
                          {formatDate(collection.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              render={
                                <Link
                                  href={`/admin/collections/${collection.id}`}
                                />
                              }
                              aria-label={`Open ${collection.title}`}
                              title={`Open ${collection.title}`}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon-xs"
                              onClick={() => setPendingDeleteId(collection.id)}
                              disabled={isDeleted || singlePending}
                              aria-label={`Soft-delete ${collection.title}`}
                              title={`Soft-delete ${collection.title}`}
                            >
                              {singlePending ? (
                                <Loader2 className="animate-spin" />
                              ) : (
                                <Trash2 />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
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

      <ConfirmDialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
        title="Soft-delete this collection?"
        description={
          <>
            The collection will be hidden from the app. You can restore it
            later from its detail page.
          </>
        }
        confirmLabel="Soft-delete"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={() => {
          if (pendingDeleteId) deleteMutation.mutate(pendingDeleteId)
        }}
      />

      <ConfirmDialog
        open={confirmBulkDelete}
        onOpenChange={(open) => !open && setConfirmBulkDelete(false)}
        title={`Soft-delete ${selectedCount} ${
          selectedCount === 1 ? "collection" : "collections"
        }?`}
        description="These collections will be hidden from the app. You can restore them later from their detail pages."
        confirmLabel="Soft-delete"
        destructive
        pending={bulkPending}
        onConfirm={() =>
          bulkDeleteMutation.mutate(Array.from(selectedIds))
        }
      />
    </div>
  )
}
