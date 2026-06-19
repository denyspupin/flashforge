"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  Layers,
  Library,
  Loader2,
  Pencil,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { queryKeys } from "@/hooks"
import type { ApiResponse } from "@/lib/api/response"
import type { AdminCollectionDetail } from "@/lib/queries/admin-collections"
import { cn } from "@/lib/utils"

async function fetchCollection(id: string): Promise<AdminCollectionDetail> {
  const res = await fetch(`/api/v1/admin/collections/${id}`)
  if (!res.ok) throw new Error("Failed to load collection")
  const body: ApiResponse<AdminCollectionDetail> = await res.json()
  if (!body.data) throw new Error("Failed to load collection")
  return body.data
}

type UpdatePayload = {
  title?: string
  description?: string | null
}

async function updateCollection(
  id: string,
  payload: UpdatePayload
): Promise<AdminCollectionDetail> {
  const res = await fetch(`/api/v1/admin/collections/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const body: ApiResponse<AdminCollectionDetail> = await res.json()
  if (!res.ok || !body.data) {
    throw new Error(body.error?.message ?? "Update failed")
  }
  return body.data
}

async function deleteCollection(id: string): Promise<void> {
  const res = await fetch(`/api/v1/admin/collections/${id}`, {
    method: "DELETE",
  })
  if (!res.ok) throw new Error("Failed to delete collection")
}

async function restoreCollection(id: string): Promise<void> {
  const res = await fetch(`/api/v1/admin/collections/${id}/restore`, {
    method: "POST",
  })
  if (!res.ok) throw new Error("Failed to restore collection")
}

async function removeDeckFromCollection(
  collectionId: string,
  deckId: string
): Promise<void> {
  const res = await fetch(
    `/api/v1/admin/collections/${collectionId}/decks/${deckId}`,
    { method: "DELETE" },
  )
  if (!res.ok) throw new Error("Failed to remove deck")
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function CollectionDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

const DECK_LIST_LIMIT = 50

export function AdminCollectionDetailView({
  collectionId,
}: {
  collectionId: string
}) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.admin.collection(collectionId),
    queryFn: () => fetchCollection(collectionId),
  })

  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [confirmRestore, setConfirmRestore] = React.useState(false)
  const [formKey, setFormKey] = React.useState(0)
  const [selectedDeckIds, setSelectedDeckIds] = React.useState<Set<string>>(
    new Set(),
  )
  const [pendingRemoveDeckId, setPendingRemoveDeckId] = React.useState<
    string | null
  >(null)
  const [confirmBulkRemove, setConfirmBulkRemove] = React.useState(false)
  const titleRef = React.useRef<HTMLInputElement>(null)
  const descriptionRef = React.useRef<HTMLTextAreaElement>(null)

  const updateMutation = useMutation({
    mutationFn: (payload: UpdatePayload) =>
      updateCollection(collectionId, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.admin.collection(collectionId), updated)
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.collections() })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteCollection(collectionId),
    onSuccess: () => {
      setConfirmDelete(false)
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.collections() })
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats() })
      router.push("/admin/collections")
    },
  })

  const restoreMutation = useMutation({
    mutationFn: () => restoreCollection(collectionId),
    onSuccess: () => {
      setConfirmRestore(false)
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.collection(collectionId),
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.collections() })
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats() })
    },
  })

  const removeDeckMutation = useMutation({
    mutationFn: (deckId: string) =>
      removeDeckFromCollection(collectionId, deckId),
    onSuccess: (_data, deckId) => {
      setPendingRemoveDeckId(null)
      setSelectedDeckIds((prev) => {
        if (!prev.has(deckId)) return prev
        const next = new Set(prev)
        next.delete(deckId)
        return next
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.collection(collectionId),
      })
    },
  })

  const bulkRemoveMutation = useMutation({
    mutationFn: async (deckIds: string[]) => {
      const results = await Promise.allSettled(
        deckIds.map((deckId) => removeDeckFromCollection(collectionId, deckId)),
      )
      const succeeded = results.filter((r) => r.status === "fulfilled").length
      const failed = results.length - succeeded
      return { deckIds, succeeded, failed }
    },
    onSuccess: ({ deckIds, failed }) => {
      setConfirmBulkRemove(false)
      if (failed === 0) {
        setSelectedDeckIds((prev) => {
          const next = new Set(prev)
          for (const id of deckIds) next.delete(id)
          return next
        })
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.collection(collectionId),
      })
    },
  })

  const headerCheckboxRef = React.useRef<HTMLInputElement | null>(null)
  React.useEffect(() => {
    const el = headerCheckboxRef.current
    if (!el || !data) return
    const visibleDecks = data.decks.slice(0, DECK_LIST_LIMIT)
    const allSelected =
      visibleDecks.length > 0 &&
      visibleDecks.every((d) => selectedDeckIds.has(d.id))
    const someSelected = visibleDecks.some((d) => selectedDeckIds.has(d.id))
    el.indeterminate = !allSelected && someSelected
  }, [data, selectedDeckIds])

  if (isLoading) return <CollectionDetailSkeleton />
  if (error) throw error
  if (!data) return <CollectionDetailSkeleton />

  const isDeleted = data.deletedAt !== null
  const updatePending = updateMutation.isPending
  const activeDecks = data.decks.filter((d) => !d.deletedAt)

  const visibleDecks = data.decks.slice(0, DECK_LIST_LIMIT)
  const visibleDeckIds = new Set(visibleDecks.map((d) => d.id))
  const allVisibleSelected =
    visibleDecks.length > 0 &&
    visibleDecks.every((d) => selectedDeckIds.has(d.id))
  const someVisibleSelected = visibleDecks.some((d) =>
    selectedDeckIds.has(d.id),
  )

  const toggleDeck = (id: string) => {
    setSelectedDeckIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllVisibleDecks = () => {
    setSelectedDeckIds((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        for (const id of visibleDeckIds) next.delete(id)
      } else {
        for (const id of visibleDeckIds) next.add(id)
      }
      return next
    })
  }

  const clearDeckSelection = () => setSelectedDeckIds(new Set())

  const handleSave = () => {
    const nextTitle = titleRef.current?.value.trim() ?? ""
    if (!nextTitle) return
    const nextDescription = descriptionRef.current?.value.trim() || null
    updateMutation.mutate({
      title: nextTitle,
      description: nextDescription,
    })
  }

  const handleReset = () => {
    setFormKey((k) => k + 1)
  }

  const selectedDeckCount = selectedDeckIds.size
  const bulkRemovePending = bulkRemoveMutation.isPending
  const singleRemovePending =
    removeDeckMutation.isPending &&
    removeDeckMutation.variables === pendingRemoveDeckId

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        render={<Link href="/admin/collections" />}
      >
        <ArrowLeft className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
        Back to collections
      </Button>

      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-start gap-3">
            <span className="bg-ink/5 text-ink/70 flex h-10 w-10 items-center justify-center rounded-lg">
              <Layers className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-xl">{data.title}</CardTitle>
              <CardDescription className="font-mono text-xs">
                {data.slug}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {data.sourceLanguageName && data.targetLanguageName ? (
              <Badge variant="secondary">
                {data.sourceLanguageName} → {data.targetLanguageName}
              </Badge>
            ) : null}
            {isDeleted ? (
              <Badge variant="destructive">
                <Trash2 className="h-3 w-3" />
                Soft-deleted
              </Badge>
            ) : null}
          </div>
          {data.description ? (
            <p className="text-muted-foreground text-sm">{data.description}</p>
          ) : null}
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card size="sm">
          <CardHeader className="pb-2">
            <CardDescription>Active decks</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {activeDecks.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader className="pb-2">
            <CardDescription>Total cards</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {data.totalCards}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader className="pb-2">
            <CardDescription>Creator</CardDescription>
            <CardTitle className="text-base">
              {data.creatorName ?? "Unknown"}
            </CardTitle>
            {data.creatorId ? (
              <Link
                href={`/admin/users/${data.creatorId}`}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                Open profile →
              </Link>
            ) : null}
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit</CardTitle>
          <CardDescription>
            Update the title or description. The language pair is fixed at
            creation time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Title</label>
            <Input
              key={`title-${formKey}`}
              ref={titleRef}
              defaultValue={data.title}
              disabled={isDeleted || updatePending}
              maxLength={256}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              key={`description-${formKey}`}
              ref={descriptionRef}
              defaultValue={data.description ?? ""}
              disabled={isDeleted || updatePending}
              maxLength={2048}
              rows={3}
            />
          </div>
          {updateMutation.isError ? (
            <p className="text-destructive text-xs">
              {updateMutation.error?.message ?? "Update failed"}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={isDeleted || updatePending}
              onClick={handleSave}
            >
              {updatePending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : null}
              Save changes
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={updatePending}
              onClick={handleReset}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd>{formatDate(data.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Updated</dt>
              <dd>{formatDate(data.updatedAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Deleted at</dt>
              <dd>{formatDate(data.deletedAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Collection ID</dt>
              <dd className="font-mono text-xs">{data.id}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Decks ({activeDecks.length} active ·{" "}
            {data.decks.length - activeDecks.length} deleted)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {selectedDeckCount > 0 ? (
            <div className="bg-ink/5 flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
              <span className="text-ink/90">
                <span className="tabular-nums font-medium">
                  {selectedDeckCount}
                </span>{" "}
                {selectedDeckCount === 1 ? "deck" : "decks"} selected
                {data.decks.length > DECK_LIST_LIMIT ? (
                  <span className="text-muted-foreground ml-1 text-xs">
                    (from first {DECK_LIST_LIMIT})
                  </span>
                ) : null}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={clearDeckSelection}
                  disabled={bulkRemovePending}
                >
                  <X className="mr-1 h-3 w-3" />
                  Clear
                </Button>
                <Button
                  size="xs"
                  variant="destructive"
                  onClick={() => setConfirmBulkRemove(true)}
                  disabled={bulkRemovePending}
                >
                  {bulkRemovePending ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="mr-1 h-3 w-3" />
                  )}
                  Remove from collection
                </Button>
              </div>
            </div>
          ) : null}

          {data.decks.length === 0 ? (
            <p className="text-muted-foreground text-sm">No decks yet</p>
          ) : (
            <ul className="divide-y divide-ink/8">
              {visibleDecks.map((deck) => {
                const isSelected = selectedDeckIds.has(deck.id)
                const isDeckDeleted = deck.deletedAt !== null
                return (
                  <li
                    key={deck.id}
                    className={cn(
                      "flex items-center gap-3 py-2 text-sm transition-colors",
                      isSelected && "bg-ember/5",
                      isDeckDeleted && "opacity-60",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleDeck(deck.id)}
                      aria-label={`Select ${deck.title}`}
                      className="ml-1 h-4 w-4 cursor-pointer rounded border-ink/20 text-ember focus:ring-ember/30"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Library
                          className="text-muted-foreground h-3.5 w-3.5 shrink-0"
                          strokeWidth={1.75}
                        />
                        <span className="text-ink/90 truncate font-medium">
                          {deck.title}
                        </span>
                        {isDeckDeleted ? (
                          <Badge variant="destructive">Deleted</Badge>
                        ) : null}
                      </div>
                      <div className="text-muted-foreground mt-0.5 text-xs">
                        {deck.cardCount} cards · Reviewed {deck.timesReviewed}{" "}
                        · Correct {deck.timesCorrect}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        render={
                          <Link href={`/admin/decks/${deck.id}`} />
                        }
                        aria-label={`Open ${deck.title}`}
                        title={`Open ${deck.title}`}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon-xs"
                        onClick={() => setPendingRemoveDeckId(deck.id)}
                        disabled={singleRemovePending}
                        aria-label={`Remove ${deck.title} from collection`}
                        title={`Remove ${deck.title} from collection`}
                      >
                        {singleRemovePending &&
                        removeDeckMutation.variables === deck.id ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <Trash2 />
                        )}
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          {data.decks.length > DECK_LIST_LIMIT ? (
            <p className="text-muted-foreground text-xs">
              Showing first {DECK_LIST_LIMIT} of {data.decks.length} decks
            </p>
          ) : null}

          {data.decks.length > 0 ? (
            <div className="border-ink/8 text-muted-foreground flex items-center gap-2 border-t pt-2 text-xs">
              <input
                ref={headerCheckboxRef}
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleAllVisibleDecks}
                disabled={visibleDecks.length === 0}
                aria-label="Select all visible decks"
                className="h-4 w-4 cursor-pointer rounded border-ink/20 text-ember focus:ring-ember/30 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <span>
                Select all {data.decks.length > DECK_LIST_LIMIT ? "visible " : ""}
                decks
              </span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>
            Soft-deleting hides the collection. Membership in the collection is
            preserved for restoration.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {isDeleted ? (
            <Button
              variant="outline"
              disabled={restoreMutation.isPending}
              onClick={() => setConfirmRestore(true)}
            >
              {restoreMutation.isPending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              )}
              Restore collection
            </Button>
          ) : (
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Soft-delete collection
            </Button>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Soft-delete this collection?"
        description={
          <>
            The collection will be hidden from the app. You can restore it
            later from this page.
          </>
        }
        confirmLabel="Soft-delete"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />

      <ConfirmDialog
        open={confirmRestore}
        onOpenChange={setConfirmRestore}
        title="Restore this collection?"
        description="The collection will become visible in the app again."
        confirmLabel="Restore"
        pending={restoreMutation.isPending}
        onConfirm={() => restoreMutation.mutate()}
      />

      <ConfirmDialog
        open={!!pendingRemoveDeckId}
        onOpenChange={(open) => !open && setPendingRemoveDeckId(null)}
        title="Remove this deck from the collection?"
        description="The deck itself is unaffected. It will no longer appear in this collection, but the deck still exists in the creator's library."
        confirmLabel="Remove"
        destructive
        pending={removeDeckMutation.isPending}
        onConfirm={() => {
          if (pendingRemoveDeckId) {
            removeDeckMutation.mutate(pendingRemoveDeckId)
          }
        }}
      />

      <ConfirmDialog
        open={confirmBulkRemove}
        onOpenChange={(open) => !open && setConfirmBulkRemove(false)}
        title={`Remove ${selectedDeckCount} ${
          selectedDeckCount === 1 ? "deck" : "decks"
        } from the collection?`}
        description="The decks themselves are unaffected. They will no longer appear in this collection."
        confirmLabel="Remove"
        destructive
        pending={bulkRemovePending}
        onConfirm={() =>
          bulkRemoveMutation.mutate(Array.from(selectedDeckIds))
        }
      />
    </div>
  )
}
