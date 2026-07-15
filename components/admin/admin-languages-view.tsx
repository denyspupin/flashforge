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

type AdminLanguage = {
  id: string
  name: string
  code: string
  deletedAt: string | null
  createdAt: string
  deckCount: number
}

async function fetchLanguages(): Promise<AdminLanguage[]> {
  const res = await fetch("/api/v1/admin/languages")
  if (!res.ok) throw new Error("Failed to load languages")
  const body: ApiResponse<AdminLanguage[]> = await res.json()
  if (!body.data) throw new Error("Failed to load languages")
  return body.data
}

async function createLanguage(payload: { name: string; code: string }) {
  const res = await fetch("/api/v1/admin/languages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const body: ApiResponse<AdminLanguage> = await res.json()
  if (!res.ok || !body.data) {
    throw new Error(body.error?.message ?? "Create failed")
  }
  return body.data
}

async function updateLanguage(
  id: string,
  payload: { name?: string; code?: string }
) {
  const res = await fetch(`/api/v1/admin/languages/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const body: ApiResponse<AdminLanguage> = await res.json()
  if (!res.ok || !body.data) {
    throw new Error(body.error?.message ?? "Update failed")
  }
  return body.data
}

async function deleteLanguage(id: string) {
  const res = await fetch(`/api/v1/admin/languages/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Delete failed")
}

async function restoreLanguage(id: string) {
  const res = await fetch(`/api/v1/admin/languages/${id}/restore`, {
    method: "POST",
  })
  if (!res.ok) throw new Error("Restore failed")
}

function LanguageRow({
  language,
  onDelete,
  onRestore,
  onSave,
  pending,
}: {
  language: AdminLanguage
  onDelete: () => void
  onRestore: () => void
  onSave: (payload: { name: string; code: string }) => void
  pending: boolean
}) {
  const [editing, setEditing] = React.useState(false)
  const [name, setName] = React.useState(language.name)
  const [code, setCode] = React.useState(language.code)

  const isDeleted = language.deletedAt !== null

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
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Code (e.g. en)"
              className="sm:max-w-[8rem] font-mono"
              maxLength={16}
            />
            <div className="flex gap-2">
              <Button
                size="xs"
                disabled={pending}
                onClick={() => {
                  onSave({ name, code })
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
                  setName(language.name)
                  setCode(language.code)
                  setEditing(false)
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{language.name}</span>
            <span className="text-muted-foreground rounded-md bg-ink/5 px-1.5 py-0.5 font-mono text-xs uppercase">
              {language.code}
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
          {language.deckCount} decks
        </span>
        {!isDeleted ? (
          <>
            <Button
              size="xs"
              variant="ghost"
              disabled={pending || editing}
              onClick={() => {
                if (!editing) {
                  setName(language.name)
                  setCode(language.code)
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

export function AdminLanguagesView() {
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.admin.languages(),
    queryFn: fetchLanguages,
  })

  const [name, setName] = React.useState("")
  const [code, setCode] = React.useState("")
  const [pendingId, setPendingId] = React.useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = React.useState<AdminLanguage | null>(
    null,
  )

  const createMutation = useMutation({
    mutationFn: createLanguage,
    onSuccess: () => {
      setName("")
      setCode("")
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.languages() })
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats() })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: { name: string; code: string }
    }) => updateLanguage(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.languages() })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteLanguage,
    onSuccess: () => {
      setConfirmDelete(null)
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.languages() })
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.decks() })
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats() })
    },
  })

  const restoreMutation = useMutation({
    mutationFn: restoreLanguage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.languages() })
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats() })
    },
  })

  const anyPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    restoreMutation.isPending

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Languages</h1>
        <p className="text-muted-foreground text-sm">
          Add or soft-delete supported language codes
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" strokeWidth={1.75} />
            New language
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault()
              createMutation.mutate({ name: name.trim(), code: code.trim() })
            }}
          >
            <div className="flex-1">
              <label className="text-muted-foreground text-xs">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Korean"
                required
                maxLength={256}
              />
            </div>
            <div className="sm:w-32">
              <label className="text-muted-foreground text-xs">Code</label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="ko"
                required
                maxLength={16}
                className="font-mono"
              />
            </div>
            <Button
              type="submit"
              disabled={
                createMutation.isPending || !name.trim() || !code.trim()
              }
            >
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
              Failed to load languages
            </div>
          ) : !data || data.length === 0 ? (
            <div className="text-muted-foreground py-10 text-center text-sm">
              No languages yet
            </div>
          ) : (
            data.map((lang) => (
              <LanguageRow
                key={lang.id}
                language={lang}
                pending={anyPending && pendingId === lang.id}
                onDelete={() => setConfirmDelete(lang)}
                onRestore={() => {
                  setPendingId(lang.id)
                  restoreMutation.mutate(lang.id, {
                    onSettled: () => setPendingId(null),
                  })
                }}
                onSave={(payload) => {
                  setPendingId(lang.id)
                  updateMutation.mutate(
                    { id: lang.id, payload },
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
        title="Soft-delete this language?"
        description={
          confirmDelete && confirmDelete.deckCount > 0
            ? `The language will be hidden from the app, and ${confirmDelete.deckCount} deck${confirmDelete.deckCount === 1 ? "" : "s"} that reference it (and their cards) will be soft-deleted and made private. Restore the language and the affected decks separately to bring them back.`
            : "The language will be hidden from the app. No decks currently reference it."
        }
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
