"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { BookOpen, Globe, Copy, Sparkles, Loader2 } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface Topic {
  id: string
  name: string
  slug: string
}

interface Deck {
  id: string
  title: string
  description: string | null
  slug: string
  visibility: "private" | "public"
  sourceLanguageId: string
  targetLanguageId: string
  creatorId: string
  creatorName: string | null
  isCurated: boolean
  forkedFromDeckId: string | null
  cardCount: number
  createdAt: string
  topics: Topic[]
}

async function fetchCommunityDecks(query?: string): Promise<{ data: Deck[] }> {
  const params = new URLSearchParams()
  if (query) params.set("q", query)
  const qs = params.toString()
  const res = await fetch(`/api/v1/community/decks${qs ? `?${qs}` : ""}`)
  if (!res.ok) throw new Error("Failed to fetch decks")
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

export default function ExplorePage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { isSignedIn, isLoaded } = useUser()
  const [query, setQuery] = useState("")
  const [pendingForkId, setPendingForkId] = useState<string | null>(null)
  const [forkError, setForkError] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["community-decks", query],
    queryFn: () => fetchCommunityDecks(query || undefined),
  })

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    enabled: isLoaded && isSignedIn,
  })

  const myId = meQuery.data?.data?.id ?? null

  const forkMutation = useMutation({
    mutationFn: forkDeck,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["decks"] })
      queryClient.invalidateQueries({ queryKey: ["community-decks"] })
      router.push(`/decks/${result.data.id}`)
    },
    onError: (error) => {
      setForkError(error instanceof Error ? error.message : "Couldn’t fork this deck")
    },
    onSettled: () => {
      setPendingForkId(null)
    },
  })

  const decks = data?.data || []

  const onFork = (deck: Deck) => {
    if (!isSignedIn) return
    setForkError(null)
    setPendingForkId(deck.id)
    forkMutation.mutate(deck.id)
  }

  return (
    <main className="mx-auto w-full max-w-7xl p-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Explore Community Decks</h1>
          <p className="text-muted-foreground mt-1">
            Discover flashcard decks created by the community — fork any of them to study and make them your own.
          </p>
        </div>
        <div className="w-full sm:max-w-xs">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search decks…"
            className="h-10"
          />
        </div>
      </div>

      {forkError && isSignedIn && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive"
        >
          {forkError}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-24 bg-muted" />
            </Card>
          ))}
        </div>
      ) : decks.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No public decks yet</h3>
          <p className="text-muted-foreground mt-1">
            Be the first to share a deck with the community
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((deck) => {
            const isMine = myId && deck.creatorId === myId
            const isForking = pendingForkId === deck.id
            return (
              <Card
                key={deck.id}
                className="group cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => router.push(`/explore/decks/${deck.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg line-clamp-1">{deck.title}</CardTitle>
                      <CardDescription className="line-clamp-2 mt-1">
                        {deck.description || "No description"}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="default">
                      <Globe className="mr-1 h-3 w-3" />
                      Public
                    </Badge>
                    {deck.isCurated && (
                      <Badge variant="secondary">
                        <Sparkles className="mr-1 h-3 w-3" />
                        Curated
                      </Badge>
                    )}
                    {deck.topics.slice(0, 2).map((topic) => (
                      <Badge key={topic.id} variant="outline" className="font-normal">
                        {topic.name}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium text-ink/80">
                        {deck.creatorName ?? "Unknown"}
                      </span>
                      <span className="mx-1.5">·</span>
                      <span>{deck.cardCount} cards</span>
                    </div>
                    {isSignedIn && (
                      <Button
                        size="sm"
                        variant={isMine ? "outline" : "default"}
                        className={cn(
                          "h-8 gap-1.5 px-3 text-xs",
                          !isMine && "bg-ember text-primary-foreground hover:bg-ember-deep"
                        )}
                        disabled={isForking}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (isMine) {
                            router.push(`/decks/${deck.id}`)
                            return
                          }
                          onFork(deck)
                        }}
                      >
                        {isForking ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : isMine ? (
                          <Globe className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        {isMine ? "Edit yours" : isForking ? "Forking…" : "Fork"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </main>
  )
}
