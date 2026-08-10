"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { useQuery } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, ShieldOff, UserX } from "lucide-react"

import { Badge } from "@/components/garn/badge"
import { Button } from "@/components/garn/button"
import {
  Card,
  CardContent,
} from "@/components/garn/card"
import { Input } from "@/components/garn/input"
import { Skeleton } from "@/components/garn/skeleton"
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
} from "@/components/garn/table"
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
): { tone: "neutral" | "info" | "brand"; appearance: "soft" } {
  if (role === "admin") return { tone: "brand", appearance: "soft" }
  if (role === "curator") return { tone: "info", appearance: "soft" }
  return { tone: "neutral", appearance: "soft" }
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
            <div className="text-danger p-6 text-sm">
              Failed to load users
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="text-muted-foreground p-10 text-center text-sm">
              No users match these filters
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-muted-foreground font-mono text-[10px] uppercase tracking-widest">
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Decks</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((user) => (
                  <TableRow
                    key={user.id}
                    className={cn(user.deletedAt && "opacity-60")}
                  >
                    <TableCell>
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="flex items-center gap-2.5"
                      >
                        {user.avatarUrl ? (
                          <Image
                            src={user.avatarUrl}
                            alt=""
                            aria-hidden
                            width={28}
                            height={28}
                            unoptimized
                            className="h-7 w-7 rounded-full object-cover"
                          />
                        ) : (
                          <span className="bg-brand-subtle text-brand-solid flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-medium">
                            {initialsFor(user.name, user.clerkId)}
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="text-foreground/90 block truncate font-medium">
                            {user.name ?? "—"}
                          </span>
                          <span className="text-muted-foreground block truncate font-mono text-[10px]">
                            {user.clerkId}
                          </span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge {...roleVariant(user.role)}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.deletedAt ? (
                        <Badge tone="danger" appearance="soft">
                          <UserX className="h-3 w-3" />
                          Deleted
                        </Badge>
                      ) : user.isBanned ? (
                        <Badge tone="danger" appearance="soft">
                          <ShieldOff className="h-3 w-3" />
                          Banned
                        </Badge>
                      ) : (
                        <Badge tone="neutral" appearance="soft">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {user.deckCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {user.sessionCount}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="xs"
                        asChild
                      >
                        <Link href={`/admin/users/${user.id}`}>
                          Open
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
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
    </div>
  )
}
