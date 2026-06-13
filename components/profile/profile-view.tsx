"use client"

import { useSuspenseQuery } from "@tanstack/react-query"
import Link from "next/link"
import {
  Award,
  BookOpen,
  CalendarDays,
  Flame,
  Layers,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react"
import { useUser } from "@clerk/nextjs"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AvatarEditor } from "@/components/profile/avatar-editor"
import { ProfileSettingsForm } from "@/components/profile/profile-settings-form"
import { queryKeys } from "@/hooks"
import type { ProfileData } from "@/lib/queries/profile"
import type { ApiResponse } from "@/lib/api/response"

async function fetchProfile(): Promise<ProfileData> {
  const res = await fetch("/api/v1/profile")
  if (res.status === 401) {
    throw new Error("Authentication required")
  }
  if (!res.ok) {
    throw new Error("Failed to load profile")
  }
  const body: ApiResponse<ProfileData> = await res.json()
  if (!body.data) {
    throw new Error("Failed to load profile")
  }
  return body.data
}

function memberSinceLabel(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function isStreakFreshToday(streakUpdatedAt: string | null): boolean {
  if (!streakUpdatedAt) return false
  const last = new Date(streakUpdatedAt)
  const now = new Date()
  return (
    last.getUTCFullYear() === now.getUTCFullYear() &&
    last.getUTCMonth() === now.getUTCMonth() &&
    last.getUTCDate() === now.getUTCDate()
  )
}

export function ProfileView() {
  const { data } = useSuspenseQuery({
    queryKey: queryKeys.profile(),
    queryFn: fetchProfile,
  })

  const { user } = useUser()
  const clerkImageUrl = user?.imageUrl ?? null
  const { user: dbUser, nativeLanguage, languages, stats } = data

  const displayName =
    dbUser.name ?? user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ?? "Learner"
  const streakFresh = isStreakFreshToday(dbUser.streakUpdatedAt)

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-ink/8 bg-card/60 p-6 sm:p-8">
        <div className="ember-glow pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <AvatarEditor
            avatarUrl={dbUser.avatarUrl}
            defaultAvatarUrl={clerkImageUrl}
            displayName={dbUser.name}
            email={dbUser.email}
          />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-mono-tag text-[10px] uppercase tracking-widest text-ink/50">
              Your account
            </p>
            <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
              {displayName}
            </h1>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {dbUser.isCurator ? (
                <Badge variant="highlight">
                  <Sparkles className="h-3 w-3" />
                  Curator
                </Badge>
              ) : null}
              {nativeLanguage ? (
                <Badge variant="outline" className="font-normal">
                  <span className="font-mono-tag text-[10px] uppercase tracking-widest text-ink/50">
                    {nativeLanguage.code}
                  </span>
                  Native · {nativeLanguage.name}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-ink/60">
                  No native language set
                </Badge>
              )}
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <CalendarDays className="h-3.5 w-3.5" />
                Forging since {memberSinceLabel(dbUser.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile
          icon={<Flame className={streakFresh ? "h-5 w-5 text-orange-500" : "h-5 w-5 text-muted-foreground"} />}
          label="Current streak"
          value={`${dbUser.streak}`}
          suffix={dbUser.streak === 1 ? "day" : "days"}
        />
        <StatTile
          icon={<Star className="h-5 w-5 text-yellow-500" />}
          label="Total XP"
          value={dbUser.xp.toLocaleString()}
        />
        <StatTile
          icon={<BookOpen className="h-5 w-5 text-primary" />}
          label="Decks"
          value={stats.deckCount.toLocaleString()}
        />
        <StatTile
          icon={<Layers className="h-5 w-5 text-primary" />}
          label="Cards"
          value={stats.cardCount.toLocaleString()}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-ember" />
              Account details
            </CardTitle>
            <CardDescription>
              Information tied to your account. Name and language can be updated
              below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-ink/8 text-sm">
              <DetailRow label="Email" value={dbUser.email ?? "—"} />
              <DetailRow
                label="Display name"
                value={dbUser.name ?? "Not set"}
              />
              <DetailRow
                label="Native language"
                value={
                  nativeLanguage
                    ? `${nativeLanguage.name} (${nativeLanguage.code})`
                    : "Not set"
                }
              />
              <DetailRow
                label="Member since"
                value={memberSinceLabel(dbUser.createdAt)}
              />
              <DetailRow
                label="Completed sessions"
                value={stats.completedSessionCount.toLocaleString()}
              />
              <DetailRow
                label="Achievements unlocked"
                value={stats.achievementCount.toLocaleString()}
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-4 w-4 text-ember" />
              Recognition
            </CardTitle>
            <CardDescription>
              Earn XP and achievements by completing decks and topics.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Keep your streak alive by reviewing at least one card every day.
              Streak multipliers boost XP for up to 30 days in a row.
            </p>
            <Link href="/dashboard" className="block">
              <Button variant="outline" size="sm" className="w-full">
                Back to dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>
              Choose your display name and native language.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileSettingsForm
              initialName={dbUser.name}
              initialNativeLanguageId={dbUser.nativeLanguageId}
              languages={languages}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function StatTile({
  icon,
  label,
  value,
  suffix,
}: {
  icon: React.ReactNode
  label: string
  value: string
  suffix?: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink/5">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">
            {label}
          </p>
          <p className="mt-0.5 truncate text-xl font-semibold">
            {value}
            {suffix ? (
              <span className="text-muted-foreground ml-1 text-sm font-normal">
                {suffix}
              </span>
            ) : null}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate text-right font-medium">{value}</dd>
    </div>
  )
}
