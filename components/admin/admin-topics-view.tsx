"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { queryKeys } from "@/hooks"
import type { ApiResponse } from "@/lib/api/response"
import { cn } from "@/lib/utils"

type AdminTopic = {
  id: string
  name: string
  slug: string
  deletedAt: string | null
  createdAt: string
  deckCount: number
}

async function fetchTopics(): Promise<AdminTopic[]> {
  const res = await fetch("/api/v1/admin/topics")
  if (!res.ok) throw new Error("Failed to load topics")
  const body: ApiResponse<AdminTopic[]> = await res.json()
  if (!body.data) throw new Error("Failed to load topics")
  return body.data
}

async function createTopic(payload: { name: string; slug?: string }) {
  const res = await fetch("/api/v1/admin/topics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const body: ApiResponse<AdminTopic> = await res.json()
  if (!res.ok || !body.data) {
    throw new Error(body.error?.message ?? "Create failed")
  }
  return body.data
}

async function updateTopic(
  id: string,
  payload: { name?: string; slug?: string }
) {
  const res = await fetch(`/api/v1/admin/topics/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const body: ApiResponse<AdminTopic> = await res.json()
  if (!res.ok || !body.data) {
    throw new Error(body.error?.message ?? "Update failed")
  }
  return body.data
}

async function deleteTopic(id: string) {
  const res = await fetch(`/api/v1/admin/topics/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Delete failed")
}

async function restoreTopic(id: string) {
  const res = await fetch(`/api/v1/admin/topics/${id}/restore`, {
    method: "POST",
  })
  if (!res.ok) throw new Error("Restore failed")
}

function TopicRow({
  topic,
  onDelete,
  onRestore,
  onSave,
  pending,
}: {
  topic: AdminTopic
  onDelete: () => void
  onRestore: () => void
  onSave: (payload: { name: string; slug: string }) => void
  pending: boolean
}) {
  const [editing, setEditing] = React.useState(false)
  const [name, setName] = React.useState(topic.name)
  const [slug, setSlug] = React.useState(topic.slug)

  const isDeleted = topic.deletedAt !== null

  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-ink/8 border-b py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between",
        isDeleted && "opacity-60",
      )}
    >
      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="sm:max-w-xs"
            />
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="Slug"
              className="sm:max-w-xs"
            />
            <div className="flex gap-2">
              <Button
                size="xs"
                disabled={pending}
                onClick={() => {
                  onSave({ name, slug })
                  setEditing(false)
                }}
              >
                Save
              </Button>
              <Button
                size="xs"
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  setName(topic.name)
                  setSlug(topic.slug)
                  setEditing(false)
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{topic.name}</span>
            <span className="text-muted-foreground font-mono text-xs">
              {topic.slug}
            </span>
            {isDeleted ? (
              <Badge variant="destructive">
                <Trash2 className="h-3 w-3" />
                Deleted
              </Badge>
            ) : null}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs tabular-nums">
          {topic.deckCount} decks
        </span>
        {!isDeleted ? (
          <>
            <Button
              size="xs"
              variant="ghost"
              disabled={pending || editing}
              onClick={() => {
                if (!editing) {
                  setName(topic.name)
                  setSlug(topic.slug)
                }
                setEditing((v) => !v)
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              size="xs"
              variant="destructive"
              disabled={pending}
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </>
        ) : (
          <Button
            size="xs"
            variant="outline"
            disabled={pending}
            onClick={onRestore}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restore
          </Button>
        )}
      </div>
    </div>
  )
}

export function AdminTopicsView() {
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.admin.topics(),
    queryFn: fetchTopics,
  })

  const [name, setName] = React.useState("")
  const [slug, setSlug] = React.useState("")
  const [pendingId, setPendingId] = React.useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = React.useState<AdminTopic | null>(
    null,
  )

  const createMutation = useMutation({
    mutationFn: createTopic,
    onSuccess: () => {
      setName("")
      setSlug("")
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.topics() })
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats() })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { name: string; slug: string } }) =>
      updateTopic(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.topics() })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTopic,
    onSuccess: () => {
      setConfirmDelete(null)
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.topics() })
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats() })
    },
  })

  const restoreMutation = useMutation({
    mutationFn: restoreTopic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.topics() })
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats() })
    },
  })

  const anyPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    restoreMutation.isPending

  const handleMutation = (id: string) => {
    setPendingId(id)
    return () => setPendingId(null)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Topics</h1>
        <p className="text-muted-foreground text-sm">
          Add, edit, and soft-delete topic labels used to categorise decks
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" strokeWidth={1.75} />
            New topic
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault()
              createMutation.mutate({
                name: name.trim(),
                slug: slug.trim() || undefined,
              })
            }}
          >
            <div className="flex-1">
              <label className="text-muted-foreground text-xs">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Travel"
                required
                maxLength={256}
              />
            </div>
            <div className="flex-1">
              <label className="text-muted-foreground text-xs">
                Slug (optional, derived from name)
              </label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="travel"
                maxLength={256}
              />
            </div>
            <Button type="submit" disabled={createMutation.isPending || !name.trim()}>
              {createMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Create
            </Button>
          </form>
          {createMutation.isError ? (
            <p className="text-destructive mt-2 text-xs">
              {createMutation.error?.message}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="px-4 py-2">
          {isLoading ? (
            <div className="space-y-2 py-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-destructive py-6 text-sm">
              Failed to load topics
            </div>
          ) : !data || data.length === 0 ? (
            <div className="text-muted-foreground py-10 text-center text-sm">
              No topics yet
            </div>
          ) : (
            data.map((topic) => (
              <TopicRow
                key={topic.id}
                topic={topic}
                pending={anyPending && pendingId === topic.id}
                onDelete={() => setConfirmDelete(topic)}
                onRestore={() => {
                  handleMutation(topic.id)
                  restoreMutation.mutate(topic.id, { onSettled: () => setPendingId(null) })
                }}
                onSave={(payload) => {
                  handleMutation(topic.id)
                  updateMutation.mutate(
                    { id: topic.id, payload },
                    { onSettled: () => setPendingId(null) },
                  )
                }}
              />
            ))
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Soft-delete this topic?"
        description="The topic will be hidden from the app and removed from new deck creation. Existing decks keep their relationship for restoration."
        confirmLabel="Soft-delete"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={() => {
          if (confirmDelete) {
            handleMutation(confirmDelete.id)
            deleteMutation.mutate(confirmDelete.id, {
              onSettled: () => setPendingId(null),
            })
          }
        }}
      />
    </div>
  )
}
