"use client"

import { useSuspenseQuery } from "@tanstack/react-query"
import Link from "next/link"
import { BookOpen, Flame, Sparkles, Star } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ContinueStudyingCard } from "@/components/dashboard/continue-studying-card"
import { RecentDeckCard } from "@/components/dashboard/recent-deck-card"
import { queryKeys } from "@/hooks"
import type { DashboardData } from "@/lib/queries/dashboard"
import type { ApiResponse } from "@/lib/api/response"

async function fetchDashboard(): Promise<DashboardData> {
  const res = await fetch("/api/v1/dashboard")
  if (res.status === 401) {
    throw new Error("Authentication required")
  }
  if (!res.ok) {
    throw new Error("Failed to load dashboard")
  }
  const body: ApiResponse<DashboardData> = await res.json()
  if (!body.data) {
    throw new Error("Failed to load dashboard")
  }
  return body.data
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

function greetingFor(): string {
  const hour = new Date().getUTCHours()
  if (hour < 11) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

export function DashboardView() {
  const { data } = useSuspenseQuery({
    queryKey: queryKeys.dashboard(),
    queryFn: fetchDashboard,
  })

  const { user, deckCount, activeSession, recentDecks, languagesById } = data

  const streakFresh = isStreakFreshToday(user.streakUpdatedAt)
  const streakSubtitle =
    user.streak === 0
      ? "Study today to start your streak"
      : streakFresh
        ? "You’re on fire — keep it going"
        : "Study today to keep your streak alive"

  const firstName = user.name?.split(/\s+/)[0]?.trim()
  const greeting = firstName ? `${greetingFor()}, ${firstName}` : greetingFor()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{greeting}</h1>
        <p className="text-muted-foreground mt-1">
          {deckCount > 0
            ? "Pick up where you left off."
            : "Welcome to FlashForge. Let’s set up your first deck."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current Streak</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <Flame
                className={
                  streakFresh
                    ? "h-6 w-6 text-orange-500"
                    : "h-6 w-6 text-muted-foreground"
                }
              />
              {user.streak} {user.streak === 1 ? "day" : "days"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{streakSubtitle}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total XP</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <Star className="h-6 w-6 text-yellow-500" />
              {user.xp.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {user.xp === 0
                ? "Complete a session to earn your first XP"
                : "Earned by reviewing cards and completing decks"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Decks</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <BookOpen className="h-6 w-6 text-primary" />
              {deckCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/decks">
              <Button size="sm" variant="outline">
                <Sparkles className="mr-2 h-4 w-4" />
                Manage decks
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {activeSession ? (
        <ContinueStudyingCard
          deckId={activeSession.deckId}
          deckTitle={activeSession.deckTitle}
          cardsReviewed={activeSession.cardsReviewed}
          cardsCorrect={activeSession.cardsCorrect}
        />
      ) : deckCount === 0 ? (
        <Card className="flex flex-col items-center justify-center p-8 text-center sm:p-12">
          <BookOpen className="text-muted-foreground mb-4 h-12 w-12" />
          <h3 className="text-lg font-semibold">Ready to learn?</h3>
          <p className="text-muted-foreground mt-1 mb-4">
            Create your first deck or explore the community
          </p>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:gap-3">
            <Link href="/decks" className="w-full sm:w-auto">
              <Button className="w-full">
                <Sparkles className="mr-2 h-4 w-4" />
                Create Deck
              </Button>
            </Link>
            <Link href="/explore" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full">
                Explore Community
              </Button>
            </Link>
          </div>
        </Card>
      ) : null}

      {recentDecks.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">
              Recent decks
            </h2>
            <Link
              href="/decks"
              className="text-muted-foreground text-sm hover:text-foreground"
            >
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentDecks.map((deck) => (
              <RecentDeckCard
                key={deck.id}
                deck={deck}
                languageNames={{
                  source: languagesById[deck.sourceLanguageId]?.name,
                  target: languagesById[deck.targetLanguageId]?.name,
                }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
