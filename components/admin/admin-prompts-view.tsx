"use client"

import * as React from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Check,
  Copy,
  History,
  Loader2,
  Plus,
  Power,
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
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { queryKeys, type AdminPromptFilters } from "@/hooks"
import type { ApiResponse } from "@/lib/api/response"
import { PROMPT_TEMPLATES } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { AdminPrompt } from "@/lib/queries/admin-prompts"

async function fetchPrompts(
  filters: AdminPromptFilters
): Promise<AdminPrompt[]> {
  const params = new URLSearchParams()
  if (filters.slug) params.set("slug", filters.slug)
  if (filters.includeDeleted) params.set("includeDeleted", "true")
  const qs = params.toString()
  const res = await fetch(`/api/v1/admin/prompts${qs ? `?${qs}` : ""}`)
  if (!res.ok) throw new Error("Failed to load prompts")
  const body: ApiResponse<AdminPrompt[]> = await res.json()
  if (!body.data) throw new Error("Failed to load prompts")
  return body.data
}

type CreatePayload = {
  slug: string
  body: string
  description?: string | null
  changelog?: string | null
  activate: boolean
}

async function createPrompt(payload: CreatePayload): Promise<AdminPrompt> {
  const res = await fetch("/api/v1/admin/prompts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const body: ApiResponse<AdminPrompt> = await res.json()
  if (!res.ok || !body.data) {
    throw new Error(body.error?.message ?? "Create failed")
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function PromptRow({
  prompt,
  activeSlug,
  isPending,
  onActivate,
  onDelete,
  onRestore,
}: {
  prompt: AdminPrompt
  activeSlug: string | null
  isPending: boolean
  onActivate: () => void
  onDelete: () => void
  onRestore: () => void
}) {
  const isDeleted = prompt.deletedAt !== null
  const canActivate = !isDeleted && !prompt.isActive

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-ink/8 py-4 last:border-b-0 sm:flex-row sm:items-start sm:justify-between",
        isDeleted && "opacity-60",
      )}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{prompt.slug}</span>
          <span className="text-muted-foreground rounded-md bg-ink/5 px-1.5 py-0.5 font-mono text-xs">
            v{prompt.version}
          </span>
          {prompt.isActive ? (
            <Badge variant="default">
              <Sparkles className="h-3 w-3" />
              Active
            </Badge>
          ) : null}
          {isDeleted ? (
            <Badge variant="destructive">
              <Trash2 className="h-3 w-3" />
              Deleted
            </Badge>
          ) : null}
          {activeSlug === prompt.slug && !prompt.isActive ? (
            <Badge variant="secondary">
              <History className="h-3 w-3" />
              Superseded
            </Badge>
          ) : null}
        </div>
        {prompt.description ? (
          <p className="text-sm">{prompt.description}</p>
        ) : null}
        {prompt.changelog ? (
          <p className="text-muted-foreground text-xs">
            <span className="font-medium">Changelog:</span> {prompt.changelog}
          </p>
        ) : null}
        <p className="text-muted-foreground text-xs">
          {prompt.body.length.toLocaleString()} chars · created{" "}
          {formatDate(prompt.createdAt)}
          {prompt.createdByName ? ` by ${prompt.createdByName}` : ""}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
        <Button
          size="xs"
          variant="outline"
          render={<Link href={`/admin/prompts/${prompt.id}`} />}
        >
          Open
        </Button>
        {!isDeleted ? (
          <>
            <Button
              size="xs"
              variant={prompt.isActive ? "outline" : "default"}
              disabled={isPending || !canActivate}
              onClick={onActivate}
            >
              <Power className="h-3.5 w-3.5" />
              {prompt.isActive ? "Active" : "Activate"}
            </Button>
            <Button
              size="xs"
              variant="destructive"
              disabled={isPending || prompt.isActive}
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
            disabled={isPending}
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

export function AdminPromptsView() {
  const queryClient = useQueryClient()
  const [showDeleted, setShowDeleted] = React.useState(false)
  const filters: AdminPromptFilters = { includeDeleted: showDeleted }

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.admin.prompts(filters),
    queryFn: () => fetchPrompts(filters),
  })

  const [slug, setSlug] = React.useState<string>(
    PROMPT_TEMPLATES.DECK_GENERATION_SLUG,
  )
  const [body, setBody] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [changelog, setChangelog] = React.useState("")
  const [activate, setActivate] = React.useState(true)
  const [prefillNotice, setPrefillNotice] = React.useState<string | null>(null)
  const [pendingId, setPendingId] = React.useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] =
    React.useState<AdminPrompt | null>(null)

  const activePrompt =
    data?.find((p) => p.isActive && p.deletedAt === null) ?? null
  const activeForSlug = (s: string) =>
    data?.find((p) => p.slug === s && p.isActive && p.deletedAt === null) ??
    null

  const prefillFromActive = () => {
    const source = data?.find(
      (p) => p.slug === slug && p.isActive && p.deletedAt === null,
    )
    if (!source) {
      setPrefillNotice(
        `No active version for "${slug}". Start from scratch.`,
      )
      return
    }
    setBody(source.body)
    setDescription(source.description ?? "")
    setPrefillNotice(
      `Pre-filled from v${source.version} of "${slug}". Edit and save as a new version.`,
    )
  }

  const resetForm = () => {
    setSlug(PROMPT_TEMPLATES.DECK_GENERATION_SLUG)
    setBody("")
    setDescription("")
    setChangelog("")
    setActivate(true)
    setPrefillNotice(null)
  }

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.prompts() })
    queryClient.invalidateQueries({
      queryKey: queryKeys.activePrompt(PROMPT_TEMPLATES.DECK_GENERATION_SLUG),
    })
  }

  const createMutation = useMutation({
    mutationFn: createPrompt,
    onSuccess: () => {
      resetForm()
      invalidate()
    },
  })

  const activateMutation = useMutation({
    mutationFn: activatePrompt,
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: deletePrompt,
    onSuccess: () => {
      setConfirmDelete(null)
      invalidate()
    },
  })

  const restoreMutation = useMutation({
    mutationFn: restorePrompt,
    onSuccess: invalidate,
  })

  const anyPending =
    createMutation.isPending ||
    activateMutation.isPending ||
    deleteMutation.isPending ||
    restoreMutation.isPending

  const sortedData = React.useMemo(() => {
    if (!data) return []
    return [...data].sort((a, b) => {
      if (a.slug !== b.slug) return a.slug.localeCompare(b.slug)
      return b.version - a.version
    })
  }, [data])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            AI Prompts
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage the prompts shown to users when they generate decks with
            external AI tools. Each version is immutable; activate one to
            serve it to the app.
          </p>
        </div>
        <label className="text-muted-foreground flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => setShowDeleted(e.target.checked)}
            className="h-4 w-4 rounded border-ink/20"
          />
          Show deleted versions
        </label>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" strokeWidth={1.75} />
            New prompt version
          </CardTitle>
          <CardDescription>
            Bodies are immutable. Save a new version to change a prompt and
            optionally activate it immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (!body.trim()) return
              createMutation.mutate({
                slug: slug.trim(),
                body: body,
                description: description.trim() || null,
                changelog: changelog.trim() || null,
                activate,
              })
            }}
          >
            <div className="grid gap-3 sm:grid-cols-[12rem_1fr_auto]">
              <div>
                <label className="text-muted-foreground text-xs">Slug</label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="deck-generation"
                  required
                  maxLength={64}
                  className="font-mono"
                />
              </div>
              <div>
                <label className="text-muted-foreground text-xs">
                  Description (optional)
                </label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short admin-facing label"
                  maxLength={PROMPT_TEMPLATES.MAX_DESCRIPTION_LENGTH}
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prefillFromActive}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Pre-fill from active
                </Button>
              </div>
            </div>

            <div>
              <label className="text-muted-foreground text-xs">
                Body ({body.length.toLocaleString()} /{" "}
                {PROMPT_TEMPLATES.MAX_BODY_LENGTH.toLocaleString()} chars)
              </label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Paste or write the full prompt body the AI will receive…"
                required
                rows={10}
                maxLength={PROMPT_TEMPLATES.MAX_BODY_LENGTH}
                className="bg-muted/30 font-mono text-xs leading-relaxed"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <label className="text-muted-foreground text-xs">
                  Changelog (optional)
                </label>
                <Input
                  value={changelog}
                  onChange={(e) => setChangelog(e.target.value)}
                  placeholder="What changed in this version?"
                  maxLength={2000}
                />
              </div>
              <label className="text-muted-foreground flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={activate}
                  onChange={(e) => setActivate(e.target.checked)}
                  className="h-4 w-4 rounded border-ink/20"
                />
                <Check className="h-3.5 w-3.5" />
                Activate immediately
              </label>
            </div>

            {prefillNotice ? (
              <p className="text-muted-foreground text-xs">{prefillNotice}</p>
            ) : null}
            {createMutation.isError ? (
              <p className="text-destructive text-xs">
                {createMutation.error?.message}
              </p>
            ) : null}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={
                  createMutation.isPending ||
                  !body.trim() ||
                  !slug.trim()
                }
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Create version
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="px-4 py-2">
          {isLoading ? (
            <div className="space-y-2 py-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-destructive py-6 text-sm">
              Failed to load prompts
            </div>
          ) : !sortedData || sortedData.length === 0 ? (
            <div className="text-muted-foreground py-10 text-center text-sm">
              No prompt versions yet
            </div>
          ) : (
            sortedData.map((prompt) => (
              <PromptRow
                key={prompt.id}
                prompt={prompt}
                activeSlug={activeForSlug(prompt.slug)?.slug ?? null}
                isPending={anyPending && pendingId === prompt.id}
                onActivate={() => {
                  setPendingId(prompt.id)
                  activateMutation.mutate(prompt.id, {
                    onSettled: () => setPendingId(null),
                  })
                }}
                onDelete={() => setConfirmDelete(prompt)}
                onRestore={() => {
                  setPendingId(prompt.id)
                  restoreMutation.mutate(prompt.id, {
                    onSettled: () => setPendingId(null),
                  })
                }}
              />
            ))
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Soft-delete this version?"
        description="The version will be hidden from the app. You can restore it later from this page."
        confirmLabel="Soft-delete"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={() => {
          if (confirmDelete) {
            setPendingId(confirmDelete.id)
            deleteMutation.mutate(confirmDelete.id, {
              onSettled: () => setPendingId(null),
            })
          }
        }}
      />
    </div>
  )
}
