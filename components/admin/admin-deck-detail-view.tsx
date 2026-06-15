"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Library,
  Loader2,
  RotateCcw,
  Sparkles,
  Trash2,
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
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { queryKeys } from "@/hooks"
import type { ApiResponse } from "@/lib/api/response"
import type { AdminDeckDetail } from "@/lib/queries/admin-decks"

async function fetchDeck(id: string): Promise<AdminDeckDetail> {
  const res = await fetch(`/api/v1/admin/decks/${id}`)
  if (!res.ok) throw new Error("Failed to load deck")
  const body: ApiResponse<AdminDeckDetail> = await res.json()
  if (!body.data) throw new Error("Failed to load deck")
  return body.data
}

type UpdatePayload = {
  isCurated?: boolean
  visibility?: "private" | "public"
}

async function updateDeck(
  id: string,
  payload: UpdatePayload
): Promise<AdminDeckDetail> {
  const res = await fetch(`/api/v1/admin/decks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const body: ApiResponse<AdminDeckDetail> = await res.json()
  if (!res.ok || !body.data) {
    throw new Error(body.error?.message ?? "Update failed")
  }
  return body.data
}

async function deleteDeck(id: string): Promise<void> {
  const res = await fetch(`/api/v1/admin/decks/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Failed to delete deck")
}

async function restoreDeck(id: string): Promise<void> {
  const res = await fetch(`/api/v1/admin/decks/${id}/restore`, {
    method: "POST",
  })
  if (!res.ok) throw new Error("Failed to restore deck")
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

function DeckDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

export function AdminDeckDetailView({ deckId }: { deckId: string }) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.admin.deck(deckId),
    queryFn: () => fetchDeck(deckId),
  })

  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [confirmRestore, setConfirmRestore] = React.useState(false)

  const updateMutation = useMutation({
    mutationFn: (payload: UpdatePayload) => updateDeck(deckId, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.admin.deck(deckId), updated)
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.decks() })
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats() })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteDeck(deckId),
    onSuccess: () => {
      setConfirmDelete(false)
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.decks() })
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats() })
      router.push("/admin/decks")
    },
  })

  const restoreMutation = useMutation({
    mutationFn: () => restoreDeck(deckId),
    onSuccess: () => {
      setConfirmRestore(false)
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.deck(deckId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.decks() })
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats() })
    },
  })

  if (isLoading) return <DeckDetailSkeleton />
  if (error) throw error
  if (!data) return <DeckDetailSkeleton />

  const isDeleted = data.deletedAt !== null
  const updatePending = updateMutation.isPending
  const activeCards = data.cards.filter((c) => !c.deletedAt)

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        render={<Link href="/admin/decks" />}
      >
        <ArrowLeft className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
        Back to decks
      </Button>

      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-start gap-3">
            <span className="bg-ink/5 text-ink/70 flex h-10 w-10 items-center justify-center rounded-lg">
              <Library className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-xl">{data.title}</CardTitle>
              <CardDescription className="font-mono text-xs">
                {data.slug}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {data.isCurated ? (
              <Badge variant="highlight">
                <Sparkles className="h-3 w-3" />
                Curated
              </Badge>
            ) : null}
            {data.visibility === "public" ? (
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
            <CardDescription>Active cards</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {activeCards.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader className="pb-2">
            <CardDescription>Study sessions</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {data.sessionCount}
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
          <CardTitle>Moderation</CardTitle>
          <CardDescription>
            Curated decks appear highlighted across the platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Curated status</label>
            <div>
              <Button
                variant={data.isCurated ? "outline" : "default"}
                size="sm"
                disabled={isDeleted || updatePending}
                onClick={() =>
                  updateMutation.mutate({ isCurated: !data.isCurated })
                }
              >
                {updatePending ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : data.isCurated ? (
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                ) : null}
                {data.isCurated ? "Remove from curated" : "Mark as curated"}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Visibility</label>
            <div className="flex gap-2">
              <Button
                variant={data.visibility === "public" ? "default" : "outline"}
                size="sm"
                disabled={isDeleted || updatePending}
                onClick={() =>
                  updateMutation.mutate({ visibility: "public" })
                }
              >
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                Public
              </Button>
              <Button
                variant={data.visibility === "private" ? "default" : "outline"}
                size="sm"
                disabled={isDeleted || updatePending}
                onClick={() =>
                  updateMutation.mutate({ visibility: "private" })
                }
              >
                <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                Private
              </Button>
            </div>
            {updateMutation.isError ? (
              <p className="text-destructive text-xs">
                {updateMutation.error?.message ?? "Update failed"}
              </p>
            ) : null}
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
            {data.forkedFromDeckId ? (
              <div>
                <dt className="text-muted-foreground">Forked from</dt>
                <dd>
                  <Link
                    href={`/admin/decks/${data.forkedFromDeckId}`}
                    className="text-ink/80 hover:text-ink font-mono text-xs"
                  >
                    {data.forkedFromDeckId}
                  </Link>
                </dd>
              </div>
            ) : null}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Cards ({activeCards.length} active ·{" "}
            {data.cards.length - activeCards.length} deleted)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.cards.length === 0 ? (
            <p className="text-muted-foreground text-sm">No cards yet</p>
          ) : (
            <ul className="divide-y divide-ink/8">
              {data.cards.slice(0, 50).map((card) => (
                <li
                  key={card.id}
                  className="flex items-center justify-between gap-4 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-ink/90 truncate font-medium">
                        {card.front}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-ink/80 truncate">
                        {card.back}
                      </span>
                    </div>
                    <div className="text-muted-foreground mt-0.5 text-xs">
                      Reviewed {card.timesReviewed} · Correct{" "}
                      {card.timesCorrect}
                    </div>
                  </div>
                  {card.deletedAt ? (
                    <Badge variant="destructive">Deleted</Badge>
                  ) : null}
                </li>
              ))}
              {data.cards.length > 50 ? (
                <li className="text-muted-foreground py-2 text-xs">
                  Showing first 50 of {data.cards.length} cards
                </li>
              ) : null}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>
            Soft-deleting hides the deck and cascades to its cards. Restore
            brings everything back.
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
              Restore deck
            </Button>
          ) : (
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Soft-delete deck
            </Button>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Soft-delete this deck?"
        description={
          <>
            The deck and all its cards will be hidden from the app. You can
            restore them later from this page.
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
        title="Restore this deck?"
        description="The deck and all its cards will become visible again."
        confirmLabel="Restore"
        pending={restoreMutation.isPending}
        onConfirm={() => restoreMutation.mutate()}
      />
    </div>
  )
}
