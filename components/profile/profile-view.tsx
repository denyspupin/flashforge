"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import {
  Award,
  BookOpen,
  CalendarDays,
  Flame,
  Layers,
  Shield,
  Star,
  Trophy,
} from "lucide-react"
import { useUser } from "@clerk/nextjs"

import { Badge } from "@/components/garn/badge"
import { Button } from "@/components/garn/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/garn/card"
import { Stat } from "@/components/garn/stat"
import { AvatarEditor } from "@/components/profile/avatar-editor"
import { ProfileSettingsForm } from "@/components/profile/profile-settings-form"
import { ProfileSkeleton } from "@/components/profile/profile-skeleton"
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
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.profile(),
    queryFn: fetchProfile,
  })

  const { user } = useUser()
  const clerkImageUrl = user?.imageUrl ?? null

  if (isLoading) return <ProfileSkeleton />
  if (error) throw error
  if (!data) return <ProfileSkeleton />

  const { user: dbUser, nativeLanguage, languages, stats } = data

  const displayName =
    dbUser.name ?? user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ?? "Learner"
  const streakFresh = isStreakFreshToday(dbUser.streakUpdatedAt)

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card/60 p-6 sm:p-8">
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <AvatarEditor
            avatarUrl={dbUser.avatarUrl}
            defaultAvatarUrl={clerkImageUrl}
            displayName={dbUser.name}
            email={dbUser.email}
          />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Your account
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {displayName}
            </h1>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {dbUser.role === "admin" ? (
                <Badge tone="brand" appearance="soft">
                  <Shield className="h-3 w-3" />
                  Admin
                </Badge>
              ) : dbUser.role === "curator" ? (
                <Badge tone="brand" appearance="soft">
                  <Award className="h-3 w-3" />
                  Curator
                </Badge>
              ) : null}
              {nativeLanguage ? (
                <Badge tone="neutral" appearance="outline" className="font-normal">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {nativeLanguage.code}
                  </span>
                  Native · {nativeLanguage.name}
                </Badge>
              ) : (
                <Badge tone="neutral" appearance="outline" className="text-muted-foreground">
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
        <Card>
          <CardContent className="pt-[var(--garn-pad-surface)]">
            <Stat
              icon={<Flame className={streakFresh ? "h-5 w-5 text-warning" : "h-5 w-5 text-muted-foreground"} />}
              label="Current streak"
              value={dbUser.streak}
              suffix={dbUser.streak === 1 ? "day" : "days"}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-[var(--garn-pad-surface)]">
            <Stat
              icon={<Star className="h-5 w-5 text-warning" />}
              label="Total XP"
              value={dbUser.xp.toLocaleString()}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-[var(--garn-pad-surface)]">
            <Stat
              icon={<BookOpen className="h-5 w-5 text-brand-solid" />}
              label="Decks"
              value={stats.deckCount.toLocaleString()}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-[var(--garn-pad-surface)]">
            <Stat
              icon={<Layers className="h-5 w-5 text-brand-solid" />}
              label="Cards"
              value={stats.cardCount.toLocaleString()}
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-brand-solid" />
              Account details
            </CardTitle>
            <CardDescription>
              Information tied to your account. Name, language, and appearance
              can be updated below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border text-sm">
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
                label="Appearance"
                value={
                  dbUser.theme === "system"
                    ? "Match system"
                    : dbUser.theme === "dark"
                      ? "Dark"
                      : "Light"
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
              <Award className="h-4 w-4 text-brand-solid" />
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
              Choose your display name, native language, and appearance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileSettingsForm
              initialName={dbUser.name}
              initialNativeLanguageId={dbUser.nativeLanguageId}
              initialTheme={dbUser.theme}
              languages={languages}
            />
          </CardContent>
        </Card>
      </section>
    </div>
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
