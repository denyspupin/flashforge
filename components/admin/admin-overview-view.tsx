"use client"

import { useQuery } from "@tanstack/react-query"
import {
  Award,
  BookOpen,
  Flame,
  Layers,
  Library,
  Tag,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { queryKeys } from "@/hooks"
import type { ApiResponse } from "@/lib/api/response"
import type { AdminStats } from "@/lib/queries/admin-stats"

async function fetchStats(): Promise<AdminStats> {
  const res = await fetch("/api/v1/admin/stats")
  if (!res.ok) throw new Error("Failed to load stats")
  const body: ApiResponse<AdminStats> = await res.json()
  if (!body.data) throw new Error("Failed to load stats")
  return body.data
}

type StatTileProps = {
  label: string
  value: number | string
  hint?: string
  icon: LucideIcon
}

function StatTile({ label, value, hint, icon: Icon }: StatTileProps) {
  return (
    <Card size="sm">
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
          {label}
        </CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      {hint ? (
        <CardContent className="pt-0">
          <p className="text-muted-foreground text-xs">{hint}</p>
        </CardContent>
      ) : null}
    </Card>
  )
}

function StatGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  )
}

export function AdminOverviewView() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.admin.stats(),
    queryFn: fetchStats,
    refetchInterval: 60_000,
  })

  if (isLoading) return <StatGridSkeleton />
  if (error) throw error
  if (!data) return <StatGridSkeleton />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-muted-foreground text-sm">
          Platform health at a glance
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-mono-tag text-muted-foreground text-[10px] uppercase tracking-widest">
          Users
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <StatTile
            label="Total"
            value={data.users.total.toLocaleString()}
            icon={Users}
            hint={`${data.users.active.toLocaleString()} active`}
          />
          <StatTile
            label="New (7d)"
            value={data.users.newLast7d.toLocaleString()}
            icon={UserPlus}
            hint={`${data.users.newLast30d.toLocaleString()} in last 30d`}
          />
          <StatTile
            label="Banned"
            value={data.users.banned.toLocaleString()}
            icon={Flame}
          />
          <StatTile
            label="Soft-deleted"
            value={data.users.deleted.toLocaleString()}
            icon={Users}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-mono-tag text-muted-foreground text-[10px] uppercase tracking-widest">
          Content
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <StatTile
            label="Decks"
            value={data.content.decks.toLocaleString()}
            icon={Library}
            hint={`${data.content.publicDecks} public · ${data.content.privateDecks} private`}
          />
          <StatTile
            label="Collections"
            value={data.content.collections.toLocaleString()}
            icon={Layers}
          />
          <StatTile
            label="Curated"
            value={data.content.curatedDecks.toLocaleString()}
            icon={Award}
          />
          <StatTile
            label="Cards"
            value={data.content.cards.toLocaleString()}
            icon={BookOpen}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-mono-tag text-muted-foreground text-[10px] uppercase tracking-widest">
          Activity
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <StatTile
            label="Sessions (7d)"
            value={data.activity.sessionsLast7d.toLocaleString()}
            icon={Flame}
            hint={`${data.activity.sessionsLast30d.toLocaleString()} in last 30d`}
          />
          <StatTile
            label="Active users (7d)"
            value={data.activity.activeUsersLast7d.toLocaleString()}
            icon={Users}
            hint={`${data.activity.activeUsersLast30d.toLocaleString()} in last 30d`}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-4 w-4" strokeWidth={1.75} />
              Top topics
            </CardTitle>
            <CardDescription>By deck count</CardDescription>
          </CardHeader>
          <CardContent>
            {data.taxonomy.topTopics.length === 0 ? (
              <p className="text-muted-foreground text-sm">No data yet</p>
            ) : (
              <ul className="divide-y divide-ink/8">
                {data.taxonomy.topTopics.map((topic) => (
                  <li
                    key={topic.topicId}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span className="text-ink/90">{topic.name}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {topic.deckCount.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Library className="h-4 w-4" strokeWidth={1.75} />
              Top language pairs
            </CardTitle>
            <CardDescription>By deck count</CardDescription>
          </CardHeader>
          <CardContent>
            {data.taxonomy.topLanguagePairs.length === 0 ? (
              <p className="text-muted-foreground text-sm">No data yet</p>
            ) : (
              <ul className="divide-y divide-ink/8">
                {data.taxonomy.topLanguagePairs.map((pair) => (
                  <li
                    key={`${pair.sourceLanguageId}-${pair.targetLanguageId}`}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span className="text-ink/90">
                      {pair.sourceName} → {pair.targetName}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {pair.deckCount.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
