"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  Check,
  Loader2,
  Pencil,
  Power,
  RotateCcw,
  Trash2,
  Wand2,
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
import { PROMPT_TEMPLATES } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { AdminPrompt } from "@/lib/queries/admin-prompts"

async function fetchPrompt(id: string): Promise<AdminPrompt> {
  const res = await fetch(`/api/v1/admin/prompts/${id}`)
  if (!res.ok) throw new Error("Failed to load prompt")
  const body: ApiResponse<AdminPrompt> = await res.json()
  if (!body.data) throw new Error("Failed to load prompt")
  return body.data
}

type UpdatePayload = {
  description?: string | null
  changelog?: string | null
}

async function updatePrompt(
  id: string,
  payload: UpdatePayload
): Promise<AdminPrompt> {
  const res = await fetch(`/api/v1/admin/prompts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const body: ApiResponse<AdminPrompt> = await res.json()
  if (!res.ok || !body.data) {
    throw new Error(body.error?.message ?? "Update failed")
  }
  return body.data
}

async function activatePrompt(id: string): Promise<AdminPrompt> {
  const res = await fetch(`/api/v1/admin/prompts/${id}/activate`, {
    method: "POST",
  })
  const body: ApiResponse<AdminPrompt> = await res.json()
  if (!res.ok || !body.data) {
    throw new Error(body.error?.message ?? "Activate failed")
  }
  return body.data
}

async function deletePrompt(id: string): Promise<void> {
  const res = await fetch(`/api/v1/admin/prompts/${id}`, { method: "DELETE" })
  if (!res.ok) {
    const body: ApiResponse<null> = await res.json()
    throw new Error(body.error?.message ?? "Delete failed")
  }
}

async function restorePrompt(id: string): Promise<void> {
  const res = await fetch(`/api/v1/admin/prompts/${id}/restore`, {
    method: "POST",
  })
  if (!res.ok) throw new Error("Restore failed")
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

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

export function AdminPromptDetailView({ promptId }: { promptId: string }) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.admin.prompt(promptId),
    queryFn: () => fetchPrompt(promptId),
  })

  const [editing, setEditing] = React.useState(false)
  const [description, setDescription] = React.useState("")
  const [changelog, setChangelog] = React.useState("")
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [confirmRestore, setConfirmRestore] = React.useState(false)

  const startEditing = React.useCallback(() => {
    if (!data) return
    setDescription(data.description ?? "")
    setChangelog(data.changelog ?? "")
    setEditing(true)
  }, [data])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.prompts() })
    queryClient.invalidateQueries({
      queryKey: queryKeys.admin.prompt(promptId),
    })
    if (data?.slug) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.activePrompt(data.slug),
      })
    }
  }

  const updateMutation = useMutation({
    mutationFn: (payload: UpdatePayload) => updatePrompt(promptId, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.admin.prompt(promptId), updated)
      setEditing(false)
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.prompts() })
    },
  })

  const activateMutation = useMutation({
    mutationFn: () => activatePrompt(promptId),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: () => deletePrompt(promptId),
    onSuccess: () => {
      setConfirmDelete(false)
      invalidate()
      router.push("/admin/prompts")
    },
  })

  const restoreMutation = useMutation({
    mutationFn: () => restorePrompt(promptId),
    onSuccess: () => {
      setConfirmRestore(false)
      invalidate()
    },
  })

  if (isLoading) return <DetailSkeleton />
  if (error) throw error
  if (!data) return <DetailSkeleton />

  const isDeleted = data.deletedAt !== null
  const updatePending = updateMutation.isPending

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        render={<Link href="/admin/prompts" />}
      >
        <ArrowLeft className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
        Back to prompts
      </Button>

      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-start gap-3">
            <span className="bg-ink/5 text-ink/70 flex h-10 w-10 items-center justify-center rounded-lg">
              <Wand2 className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-xl">
                {data.slug}{" "}
                <span className="text-muted-foreground font-mono text-base font-normal">
                  v{data.version}
                </span>
              </CardTitle>
              <CardDescription className="font-mono text-xs">
                {data.id}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {data.isActive ? (
              <Badge variant="default">
                <Check className="h-3 w-3" />
                Active
              </Badge>
            ) : (
              <Badge variant="secondary">
                <Power className="h-3 w-3" />
                Inactive
              </Badge>
            )}
            {isDeleted ? (
              <Badge variant="destructive">
                <Trash2 className="h-3 w-3" />
                Soft-deleted
              </Badge>
            ) : null}
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Metadata</CardTitle>
            {!editing ? (
              <Button
                size="xs"
                variant="ghost"
                disabled={isDeleted}
                onClick={startEditing}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            ) : null}
          </div>
          <CardDescription>
            Description and changelog can be edited. The body is immutable to
            preserve version history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="text-muted-foreground text-xs">
                  Description
                </label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short admin-facing label"
                  maxLength={PROMPT_TEMPLATES.MAX_DESCRIPTION_LENGTH}
                />
              </div>
              <div>
                <label className="text-muted-foreground text-xs">
                  Changelog
                </label>
                <Textarea
                  value={changelog}
                  onChange={(e) => setChangelog(e.target.value)}
                  rows={3}
                  maxLength={2000}
                />
              </div>
              {updateMutation.isError ? (
                <p className="text-destructive text-xs">
                  {updateMutation.error?.message}
                </p>
              ) : null}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={updatePending}
                  onClick={() =>
                    updateMutation.mutate({
                      description: description.trim() || null,
                      changelog: changelog.trim() || null,
                    })
                  }
                >
                  {updatePending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={updatePending}
                  onClick={() => {
                    setDescription(data.description ?? "")
                    setChangelog(data.changelog ?? "")
                    setEditing(false)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Description</dt>
                <dd>{data.description ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Changelog</dt>
                <dd className="whitespace-pre-wrap">
                  {data.changelog ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Created</dt>
                <dd>{formatDate(data.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Updated</dt>
                <dd>{formatDate(data.updatedAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Created by</dt>
                <dd>{data.createdByName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Body length</dt>
                <dd className="tabular-nums">
                  {data.body.length.toLocaleString()} chars
                </dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Body</CardTitle>
          <CardDescription>
            Read-only. The body is the literal text users copy and paste into
            an AI chat.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre
            className={cn(
              "max-h-[28rem] overflow-auto rounded-md border bg-muted/30 p-3",
              "font-mono text-[11px] leading-relaxed",
            )}
          >
            {data.body}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {!isDeleted && !data.isActive ? (
            <Button
              disabled={activateMutation.isPending}
              onClick={() => activateMutation.mutate()}
            >
              {activateMutation.isPending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Power className="mr-1.5 h-3.5 w-3.5" />
              )}
              Activate this version
            </Button>
          ) : null}
          {!isDeleted ? (
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending || data.isActive}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Soft-delete version
            </Button>
          ) : (
            <Button
              variant="outline"
              disabled={restoreMutation.isPending}
              onClick={() => setConfirmRestore(true)}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Restore version
            </Button>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Soft-delete this version?"
        description="The version will be hidden from the app. You can restore it later."
        confirmLabel="Soft-delete"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />

      <ConfirmDialog
        open={confirmRestore}
        onOpenChange={setConfirmRestore}
        title="Restore this version?"
        description="The version will become visible in the prompts list again."
        confirmLabel="Restore"
        pending={restoreMutation.isPending}
        onConfirm={() => restoreMutation.mutate()}
      />
    </div>
  )
}
