"use client"

import * as React from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { Layers, Pencil, Search, Trash2, X } from "lucide-react"

import { Button } from "@/components/garn/button"
import { Card, CardContent } from "@/components/garn/card"
import { Input } from "@/components/garn/input"
import { Skeleton } from "@/components/garn/skeleton"
import { Spinner } from "@/components/garn/spinner"
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
  TableSelectAllCell,
  TableSelectionCell,
} from "@/components/garn/table"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { useBulkSelection, queryKeys, type AdminCollectionFilters } from "@/hooks"
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

  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(
    null,
  )
  const [confirmBulkDelete, setConfirmBulkDelete] = React.useState(false)

  const invalidate = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.collections() })
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats() })
  }, [queryClient])

  const visibleItems = React.useMemo(
    () => (data?.items ?? []).filter((c) => !c.deletedAt),
    [data],
  )

  const [selection] = useBulkSelection(visibleItems.map((c) => c.id))

  const deleteMutation = useMutation({
    mutationFn: deleteCollection,
    onSuccess: (_data, id) => {
      setPendingDeleteId(null)
      selection.remove([id])
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
      if (failed === 0) selection.remove(ids)
      invalidate()
    },
  })

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

      {selection.count > 0 ? (
        <div className="bg-foreground/5 flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
          <span className="text-foreground/90">
            <span className="tabular-nums font-medium">{selection.count}</span>{" "}
            {selection.count === 1 ? "collection" : "collections"} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="ghost"
              onClick={selection.clear}
              disabled={bulkPending}
            >
              <X className="mr-1 h-3 w-3" />
              Clear
            </Button>
            <Button
              size="xs"
              tone="danger"
              onClick={() => setConfirmBulkDelete(true)}
              disabled={bulkPending}
            >
              {bulkPending ? (
                <Spinner size="sm" className="mr-1" />
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
            <div className="text-danger p-6 text-sm">
              Failed to load collections
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="text-muted-foreground p-10 text-center text-sm">
              No collections match these filters
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-muted-foreground font-mono text-[10px] uppercase tracking-widest">
                  <TableSelectAllCell
                    checked={
                      selection.allSelected
                        ? true
                        : selection.count > 0
                          ? "indeterminate"
                          : false
                    }
                    onCheckedChange={() => selection.toggleAll()}
                    aria-label="Select all visible collections"
                  />
                  <TableHead>Collection</TableHead>
                  <TableHead>Language pair</TableHead>
                  <TableHead className="text-right">Decks</TableHead>
                  <TableHead className="text-right">Cards</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((collection) => {
                  const isSelected = selection.has(collection.id)
                  const isDeleted = collection.deletedAt !== null
                  return (
                    <TableRow
                      key={collection.id}
                      className={cn(
                        isSelected && "bg-brand-subtle",
                        isDeleted && "opacity-60",
                      )}
                    >
                      {isDeleted ? (
                        <TableCell />
                      ) : (
                        <TableSelectionCell
                          checked={isSelected}
                          onCheckedChange={() =>
                            selection.toggle(collection.id)
                          }
                          label={collection.title}
                        />
                      )}
                      <TableCell>
                        <Link
                          href={`/admin/collections/${collection.id}`}
                          className="flex items-center gap-2"
                        >
                          <span className="bg-foreground/5 text-foreground/70 flex h-7 w-7 items-center justify-center rounded-lg">
                            <Layers
                              className="h-3.5 w-3.5"
                              strokeWidth={1.75}
                            />
                          </span>
                          <span className="min-w-0">
                            <span className="text-foreground/90 flex items-center gap-1.5 truncate font-medium">
                              {collection.title}
                              {isDeleted ? (
                                <Trash2
                                  className="text-danger h-3.5 w-3.5 shrink-0"
                                  strokeWidth={1.75}
                                />
                              ) : null}
                            </span>
                            <span className="text-muted-foreground block truncate font-mono text-[10px]">
                              {collection.slug}
                            </span>
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[180px] truncate">
                        {collection.sourceLanguageName ?? "—"} →{" "}
                        {collection.targetLanguageName ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {collection.deckCount}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {collection.totalCards}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[180px] truncate">
                        {collection.creatorName ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(collection.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            asChild
                            aria-label={`Open ${collection.title}`}
                            title={`Open ${collection.title}`}
                          >
                            <Link
                              href={`/admin/collections/${collection.id}`}
                            >
                              <Pencil />
                            </Link>
                          </Button>
                          <Button
                            tone="danger"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setPendingDeleteId(collection.id)}
                            disabled={isDeleted || singlePending}
                            aria-label={`Soft-delete ${collection.title}`}
                            title={`Soft-delete ${collection.title}`}
                          >
                            {singlePending ? (
                              <Spinner size="sm" />
                            ) : (
                              <Trash2 />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
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
        title={`Soft-delete ${selection.count} ${
          selection.count === 1 ? "collection" : "collections"
        }?`}
        description="These collections will be hidden from the app. You can restore them later from their detail pages."
        confirmLabel="Soft-delete"
        destructive
        pending={bulkPending}
        onConfirm={() =>
          bulkDeleteMutation.mutate(Array.from(selection.selectedIds))
        }
      />
    </div>
  )
}
