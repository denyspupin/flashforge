"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import {
  ArrowLeft,
  Globe,
  BookOpen,
  Copy,
  Play,
  Loader2,
  Sparkles,
  User,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { queryKeys } from "@/hooks"

interface PublicCard {
  id: string
  front: string
  back: string
}

interface PublicDeck {
  id: string
  title: string
  description: string | null
  visibility: "public"
  creatorId: string
  creatorName: string
  cards: PublicCard[]
  cardCount: number
  isCurated: boolean
  createdAt: string
  sourceLanguage: { id: string; name: string; code: string } | null
  targetLanguage: { id: string; name: string; code: string } | null
  topics: { id: string; name: string; slug: string }[]
}

async function fetchPublicDeck(id: string): Promise<{ data: PublicDeck }> {
  const res = await fetch(`/api/v1/community/decks/${id}`)
  if (!res.ok) throw new Error("Failed to fetch deck")
  return res.json()
}

async function fetchMe(): Promise<{ data: { id: string } | null }> {
  const res = await fetch("/api/v1/users/me")
  if (res.status === 401) return { data: null }
  if (!res.ok) throw new Error("Failed to fetch user")
  return res.json()
}

async function forkDeck(id: string): Promise<{ data: { id: string } }> {
  const res = await fetch(`/api/v1/decks/${id}/fork`, { method: "POST" })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const message = body?.error?.message ?? "Couldn’t fork this deck"
    throw new Error(message)
  }
  return res.json()
}

async function startStudy(
  deckId: string
): Promise<{ data: { session: { id: string } } }> {
  const res = await fetch("/api/v1/study", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deck_id: deckId }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const message = body?.error?.message ?? "Couldn’t start a study session"
    throw new Error(message)
  }
  return res.json()
}

export default function PublicDeckPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const params = useParams()
  const { isSignedIn, isLoaded } = useUser()
  const deckId = params.id as string
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<"fork" | "study" | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.publicDeck(deckId),
    queryFn: () => fetchPublicDeck(deckId),
  })

  const meQuery = useQuery({
    queryKey: queryKeys.me(),
    queryFn: fetchMe,
    enabled: isLoaded && isSignedIn,
  })

  const myId = meQuery.data?.data?.id ?? null
  const deck = data?.data
  const isOwner = !!(myId && deck && deck.creatorId === myId)

  const forkMutation = useMutation({
    mutationFn: () => forkDeck(deckId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.decks() })
      queryClient.invalidateQueries({ queryKey: ["community-decks"] })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() })
      router.push(`/decks/${result.data.id}`)
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : "Couldn’t fork this deck")
    },
    onSettled: () => setPendingAction(null),
  })

  const studyMutation = useMutation({
    mutationFn: () => startStudy(deckId),
    onSuccess: (result) => {
      router.push(`/study/${result.data.session.id}`)
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : "Couldn’t start a study session")
    },
    onSettled: () => setPendingAction(null),
  })

  const onFork = () => {
    if (!isSignedIn) return
    setActionError(null)
    setPendingAction("fork")
    forkMutation.mutate()
  }

  const onStudy = () => {
    if (!isSignedIn) return
    setActionError(null)
    setPendingAction("study")
    studyMutation.mutate()
  }

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mb-4" />
        <div className="h-32 bg-muted animate-pulse rounded" />
      </main>
    )
  }

  if (!deck) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 pt-4 sm:px-6 sm:pt-6">
          <Card className="flex flex-col items-center justify-center p-8 text-center sm:p-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Deck not found</h3>
          <p className="text-muted-foreground mt-1">
            This deck might be private or does not exist
          </p>
          <Button className="mt-4" onClick={() => router.push("/explore")}>
            Back to Explore
          </Button>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pt-4 sm:px-6 sm:pt-6">
      <div className="mb-6 flex items-start gap-2 sm:items-center sm:gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/explore")}
          className="shrink-0"
          aria-label="Back to explore"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
            {deck.title}
          </h1>
          {deck.description && (
            <p className="text-muted-foreground mt-1">{deck.description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge variant="default">
            <Globe className="h-3 w-3" />
            Public
          </Badge>
          {deck.isCurated && (
            <Badge variant="highlight">
              <Sparkles className="h-3 w-3" />
              Curated
            </Badge>
          )}
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            <span className="font-medium text-ink/80">{deck.creatorName}</span>
          </span>
          <span className="hidden sm:inline">·</span>
          <span>{deck.cards?.length || 0} cards</span>
          {deck.sourceLanguage && deck.targetLanguage && (
            <>
              <span className="hidden sm:inline">·</span>
              <span>
                {deck.sourceLanguage.name} → {deck.targetLanguage.name}
              </span>
            </>
          )}
        </div>

        {isSignedIn ? (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            {isOwner ? (
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => router.push(`/decks/${deck.id}`)}
              >
                Edit in dashboard
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={onFork}
                  disabled={pendingAction !== null}
                  className="w-full gap-1.5 sm:w-auto"
                >
                  {pendingAction === "fork" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {pendingAction === "fork" ? "Forking…" : "Fork to my decks"}
                </Button>
                <Button
                  onClick={onStudy}
                  disabled={pendingAction !== null}
                  className="w-full gap-1.5 bg-ember text-primary-foreground hover:bg-ember-deep sm:w-auto"
                >
                  {pendingAction === "study" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {pendingAction === "study" ? "Starting…" : "Study now"}
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href={`/explore/decks/${deck.id}/study`}
              className="w-full sm:w-auto"
            >
              <Button className="w-full gap-1.5 bg-ember text-primary-foreground hover:bg-ember-deep sm:w-auto">
                <Play className="h-4 w-4" />
                Study as guest
              </Button>
            </Link>
            <Link
              href={`/login?redirect_url=${encodeURIComponent(
                `/explore/decks/${deck.id}/study`,
              )}`}
              className="w-full sm:w-auto"
            >
              <Button
                variant="outline"
                className="w-full gap-1.5 sm:w-auto"
              >
                Sign in to save progress
              </Button>
            </Link>
          </div>
        )}
      </div>

      {deck.topics.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-1.5">
          {deck.topics.map((topic) => (
            <Badge key={topic.id} variant="outline" className="font-normal">
              {topic.name}
            </Badge>
          ))}
        </div>
      )}

      {actionError && isSignedIn && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive"
        >
          {actionError}
        </div>
      )}

      <div className="space-y-3">
        {deck.cards?.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-8 text-center sm:p-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No cards in this deck</h3>
            <p className="text-muted-foreground mt-1">
              The author hasn’t added any cards yet
            </p>
          </Card>
        ) : (
          deck.cards?.map((card, index) => (
            <Card key={card.id}>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground/80">
                      {index + 1}. Front
                    </p>
                    <p className="mt-1 font-medium">{card.front}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground/80">
                      Back
                    </p>
                    <p className="mt-1 font-medium">{card.back}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </main>
  )
}
