"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, ShieldOff, UserX } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { queryKeys, type AdminUserFilters } from "@/hooks"
import type { ApiResponse } from "@/lib/api/response"
import type { AdminUserListResult } from "@/lib/queries/admin-users"
import { cn } from "@/lib/utils"

const ALL = "__all__"

function toQueryString(filters: AdminUserFilters): string {
  const params = new URLSearchParams()
  if (filters.q) params.set("q", filters.q)
  if (filters.role) params.set("role", filters.role)
  if (filters.banned !== undefined) params.set("banned", String(filters.banned))
  if (filters.deleted !== undefined)
    params.set("deleted", String(filters.deleted))
  if (filters.page) params.set("page", String(filters.page))
  if (filters.limit) params.set("limit", String(filters.limit))
  return params.toString()
}

async function fetchUsers(
  filters: AdminUserFilters
): Promise<AdminUserListResult> {
  const qs = toQueryString(filters)
  const res = await fetch(`/api/v1/admin/users${qs ? `?${qs}` : ""}`)
  if (!res.ok) throw new Error("Failed to load users")
  const body: ApiResponse<AdminUserListResult> = await res.json()
  if (!body.data) throw new Error("Failed to load users")
  return body.data
}

function roleVariant(
  role: "user" | "curator" | "admin"
): "default" | "highlight" | "secondary" {
  if (role === "admin") return "highlight"
  if (role === "curator") return "secondary"
  return "default"
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function initialsFor(name: string | null, clerkId: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/).slice(0, 2)
    return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?"
  }
  return clerkId.slice(0, 2).toUpperCase()
}

export function AdminUsersView() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const filters: AdminUserFilters = React.useMemo(() => {
    const q = searchParams.get("q") ?? undefined
    const roleParam = searchParams.get("role")
    const role =
      roleParam === "user" || roleParam === "curator" || roleParam === "admin"
        ? roleParam
        : undefined
    const bannedParam = searchParams.get("banned")
    const banned =
      bannedParam === "true" ? true : bannedParam === "false" ? false : undefined
    const deletedParam = searchParams.get("deleted")
    const deleted =
      deletedParam === "true"
        ? true
        : deletedParam === "false"
          ? false
          : undefined
    const page = Number(searchParams.get("page")) || 1
    const limit = Number(searchParams.get("limit")) || 20
    return { q, role, banned, deleted, page, limit }
  }, [searchParams])

  const updateFilters = React.useCallback(
    (patch: Partial<AdminUserFilters>) => {
      const next = { ...filters, ...patch }
      Object.keys(next).forEach((key) => {
        const value = (next as Record<string, unknown>)[key]
        if (value === undefined || value === "" || value === null) {
          delete (next as Record<string, unknown>)[key]
        }
      })
      if (next.page === undefined) next.page = 1
      const qs = toQueryString(next)
      router.push(`/admin/users${qs ? `?${qs}` : ""}`)
    },
    [filters, router],
  )

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.admin.users(filters),
    queryFn: () => fetchUsers(filters),
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-muted-foreground text-sm">
          Manage roles, ban accounts, and restore deleted users
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
          <Input
            value={filters.q ?? ""}
            onChange={(e) => updateFilters({ q: e.target.value || undefined, page: 1 })}
            placeholder="Search by name or clerk id…"
            className="pl-8"
          />
        </div>
        <Select
          value={filters.role ?? ALL}
          onValueChange={(v) =>
            updateFilters({
              role: v === ALL ? undefined : (v as "user" | "curator" | "admin"),
              page: 1,
            })
          }
        >
          <SelectTrigger size="sm" className="w-32">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All roles</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="curator">Curator</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={
            filters.deleted === true
              ? "deleted"
              : filters.banned === true
                ? "banned"
                : "active"
          }
          onValueChange={(v) => {
            if (v === "deleted") {
              updateFilters({ deleted: true, banned: undefined, page: 1 })
            } else if (v === "banned") {
              updateFilters({ banned: true, deleted: undefined, page: 1 })
            } else {
              updateFilters({ deleted: false, banned: undefined, page: 1 })
            }
          }}
        >
          <SelectTrigger size="sm" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active only</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
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
              Failed to load users
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="text-muted-foreground p-10 text-center text-sm">
              No users match these filters
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-ink/8 text-muted-foreground border-b text-left font-mono-tag text-[10px] uppercase tracking-widest">
                    <th className="px-4 py-2.5 font-medium">User</th>
                    <th className="px-4 py-2.5 font-medium">Role</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 text-right font-medium">Decks</th>
                    <th className="px-4 py-2.5 text-right font-medium">Sessions</th>
                    <th className="px-4 py-2.5 font-medium">Joined</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((user) => (
                    <tr
                      key={user.id}
                      className={cn(
                        "border-ink/8 hover:bg-ink/3 border-b transition-colors",
                        user.deletedAt && "opacity-60"
                      )}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="flex items-center gap-2.5"
                        >
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt=""
                              aria-hidden
                              className="h-7 w-7 rounded-full object-cover"
                            />
                          ) : (
                            <span className="bg-ember/12 text-ember flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-medium">
                              {initialsFor(user.name, user.clerkId)}
                            </span>
                          )}
                          <span className="min-w-0">
                            <span className="text-ink/90 block truncate font-medium">
                              {user.name ?? "—"}
                            </span>
                            <span className="text-muted-foreground block truncate font-mono text-[10px]">
                              {user.clerkId}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={roleVariant(user.role)}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {user.deletedAt ? (
                          <Badge variant="destructive">
                            <UserX className="h-3 w-3" />
                            Deleted
                          </Badge>
                        ) : user.isBanned ? (
                          <Badge variant="destructive">
                            <ShieldOff className="h-3 w-3" />
                            Banned
                          </Badge>
                        ) : (
                          <Badge variant="default">Active</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {user.deckCount}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {user.sessionCount}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="xs"
                          render={<Link href={`/admin/users/${user.id}`} />}
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
