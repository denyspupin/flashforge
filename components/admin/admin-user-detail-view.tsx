"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  Ban,
  Loader2,
  RotateCcw,
  Trash2,
  Undo2,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { queryKeys } from "@/hooks"
import type { ApiResponse } from "@/lib/api/response"
import type { AdminUserDetail } from "@/lib/queries/admin-users"

async function fetchUser(id: string): Promise<AdminUserDetail> {
  const res = await fetch(`/api/v1/admin/users/${id}`)
  if (!res.ok) throw new Error("Failed to load user")
  const body: ApiResponse<AdminUserDetail> = await res.json()
  if (!body.data) throw new Error("Failed to load user")
  return body.data
}

type UpdatePayload = { role?: "user" | "curator" | "admin"; isBanned?: boolean }

async function updateUser(
  id: string,
  payload: UpdatePayload
): Promise<AdminUserDetail> {
  const res = await fetch(`/api/v1/admin/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const body: ApiResponse<AdminUserDetail> = await res.json()
  if (!res.ok || !body.data) {
    throw new Error(body.error?.message ?? "Update failed")
  }
  return body.data
}

async function deleteUser(id: string): Promise<void> {
  const res = await fetch(`/api/v1/admin/users/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Failed to delete user")
}

async function restoreUser(id: string): Promise<void> {
  const res = await fetch(`/api/v1/admin/users/${id}/restore`, {
    method: "POST",
  })
  if (!res.ok) throw new Error("Failed to restore user")
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

function UserDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

export function AdminUserDetailView({
  userId,
  currentAdminId,
}: {
  userId: string
  currentAdminId: string
}) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.admin.user(userId),
    queryFn: () => fetchUser(userId),
  })

  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [confirmRestore, setConfirmRestore] = React.useState(false)

  const updateMutation = useMutation({
    mutationFn: (payload: UpdatePayload) => updateUser(userId, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.admin.user(userId), updated)
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() })
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats() })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteUser(userId),
    onSuccess: () => {
      setConfirmDelete(false)
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() })
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats() })
      router.push("/admin/users")
    },
  })

  const restoreMutation = useMutation({
    mutationFn: () => restoreUser(userId),
    onSuccess: () => {
      setConfirmRestore(false)
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.user(userId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() })
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats() })
    },
  })

  if (isLoading) return <UserDetailSkeleton />
  if (error) throw error
  if (!data) return <UserDetailSkeleton />

  const isSelf = data.id === currentAdminId
  const isDeleted = data.deletedAt !== null
  const updatePending = updateMutation.isPending

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        render={<Link href="/admin/users" />}
      >
        <ArrowLeft className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
        Back to users
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-start gap-4 space-y-0">
          {data.avatarUrl ? (
            <img
              src={data.avatarUrl}
              alt=""
              aria-hidden
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="bg-ember/12 text-ember flex h-16 w-16 items-center justify-center rounded-full text-lg font-medium">
              {data.name?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <CardTitle className="text-xl">
              {data.name ?? "Unnamed user"}
            </CardTitle>
            <CardDescription className="font-mono text-xs">
              {data.clerkId}
            </CardDescription>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant={data.role === "admin" ? "highlight" : "default"}>
                {data.role}
              </Badge>
              {isDeleted ? (
                <Badge variant="destructive">
                  <Trash2 className="h-3 w-3" />
                  Soft-deleted
                </Badge>
              ) : data.isBanned ? (
                <Badge variant="destructive">
                  <Ban className="h-3 w-3" />
                  Banned
                </Badge>
              ) : (
                <Badge variant="default">Active</Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card size="sm">
          <CardHeader className="pb-2">
            <CardDescription>Decks</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {data.deckCount}
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
            <CardDescription>XP</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {data.xp.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader className="pb-2">
            <CardDescription>Streak</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {data.streak} {data.streak === 1 ? "day" : "days"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Role</label>
            <Select
              value={data.role}
              disabled={isDeleted || isSelf || updatePending}
              onValueChange={(v) => {
                if (v === "user" || v === "curator" || v === "admin") {
                  updateMutation.mutate({ role: v })
                }
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="curator">Curator</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            {isSelf ? (
              <p className="text-muted-foreground text-xs">
                You can’t change your own role.
              </p>
            ) : null}
            {updateMutation.isError ? (
              <p className="text-destructive text-xs">
                {updateMutation.error?.message ?? "Failed to update role"}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Banned</label>
            <div>
              <Button
                variant={data.isBanned ? "outline" : "destructive"}
                size="sm"
                disabled={isDeleted || updatePending}
                onClick={() =>
                  updateMutation.mutate({ isBanned: !data.isBanned })
                }
              >
                {updatePending ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : data.isBanned ? (
                  <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                ) : (
                  <Ban className="mr-1.5 h-3.5 w-3.5" />
                )}
                {data.isBanned ? "Unban user" : "Ban user"}
              </Button>
            </div>
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
              <dt className="text-muted-foreground">Joined</dt>
              <dd>{formatDate(data.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Updated</dt>
              <dd>{formatDate(data.updatedAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last streak update</dt>
              <dd>{formatDate(data.streakUpdatedAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Deleted at</dt>
              <dd>{formatDate(data.deletedAt)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>
            Soft-deleting hides the user from the app but preserves data for
            restoration.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {isDeleted ? (
            <Button
              variant="outline"
              disabled={restoreMutation.isPending || isSelf}
              onClick={() => setConfirmRestore(true)}
            >
              {restoreMutation.isPending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              )}
              Restore user
            </Button>
          ) : (
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending || isSelf}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Soft-delete user
            </Button>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Soft-delete this user?"
        description={
          <>
            The user will be hidden from the app. You can restore them later
            from this page.
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
        title="Restore this user?"
        description="The user will be able to use the app again with their original data."
        confirmLabel="Restore"
        pending={restoreMutation.isPending}
        onConfirm={() => restoreMutation.mutate()}
      />
    </div>
  )
}
