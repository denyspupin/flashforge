"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { Copy, Globe, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DeckCard,
  DeckCardEmptyState,
  DeckCardSkeleton,
} from "@/components/deck/deck-card"
import { queryKeys } from "@/hooks"
import { cn } from "@/lib/utils"
import type { Deck, Language } from "@/types/deck"

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

async function fetchLanguages(): Promise<{ data: Language[] }> {
  const res = await fetch("/api/v1/languages")
  if (!res.ok) throw new Error("Failed to fetch languages")
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
    queryKey: queryKeys.communityDecks(query),
    queryFn: () => fetchCommunityDecks(query || undefined),
  })

  const meQuery = useQuery({
    queryKey: queryKeys.me(),
    queryFn: fetchMe,
    enabled: isLoaded && isSignedIn,
  })

  const { data: languagesData } = useQuery({
    queryKey: queryKeys.languages(),
    queryFn: fetchLanguages,
  })

  const myId = meQuery.data?.data?.id ?? null
  const languagesById = Object.fromEntries(
    (languagesData?.data ?? []).map((l) => [l.id, l]),
  )

  const forkMutation = useMutation({
    mutationFn: forkDeck,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.decks() })
      queryClient.invalidateQueries({ queryKey: ["community-decks"] })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() })
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
    <main className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 sm:pt-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Explore Community Decks
          </h1>
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <DeckCardSkeleton key={i} />
          ))}
        </div>
      ) : decks.length === 0 ? (
        <DeckCardEmptyState
          title="No public decks yet"
          description="Be the first to share a deck with the community"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => {
            const isMine = myId && deck.creatorId === myId
            const isForking = pendingForkId === deck.id
            return (
              <DeckCard
                key={deck.id}
                deck={deck}
                href={`/explore/decks/${deck.id}`}
                badges={
                  <>
                    {deck.isCurated ? <DeckCard.CuratedBadge /> : null}
                    {deck.forkedFromDeckId ? <DeckCard.ForkedBadge /> : null}
                    <DeckCard.TopicBadges topics={deck.topics} />
                  </>
                }
                languageNames={{
                  source: languagesById[deck.sourceLanguageId]?.name,
                  target: languagesById[deck.targetLanguageId]?.name,
                  sourceFlag: languagesById[deck.sourceLanguageId]?.flag,
                  targetFlag: languagesById[deck.targetLanguageId]?.flag,
                }}
                footerLeft={
                  <span>
                    <span className="font-medium text-ink/80">
                      {deck.creatorName ?? "Unknown"}
                    </span>
                    <span className="mx-1.5">·</span>
                    <span>
                      {deck.cardCount} {deck.cardCount === 1 ? "card" : "cards"}
                    </span>
                  </span>
                }
                onStudy={
                  isSignedIn
                    ? undefined
                    : (id) => router.push(`/explore/decks/${id}/study`)
                }
                actions={
                  isSignedIn ? (
                    <Button
                      size="sm"
                      variant={isMine ? "outline" : "default"}
                      className={cn(
                        "h-8 gap-1.5 px-3 text-xs",
                        !isMine && "bg-ember text-primary-foreground hover:bg-ember-deep",
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
                  ) : undefined
                }
              />
            )
          })}
        </div>
      )}
    </main>
  )
}
