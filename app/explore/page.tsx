"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { useUser } from "@clerk/nextjs"
import { Copy, Globe, Layers, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DeckCard,
  DeckCardEmptyState,
  DeckCardSkeleton,
} from "@/components/deck/deck-card"
import {
  CollectionCard,
  CollectionCardEmptyState,
  CollectionCardSkeleton,
} from "@/components/collection/collection-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { queryKeys } from "@/hooks"
import type { Collection } from "@/types/collection"
import type { Deck, Language } from "@/types/deck"

async function fetchCommunityDecks(query?: string): Promise<{ data: Deck[] }> {
  const params = new URLSearchParams()
  if (query) params.set("q", query)
  const qs = params.toString()
  const res = await fetch(`/api/v1/community/decks${qs ? `?${qs}` : ""}`)
  if (!res.ok) throw new Error("Failed to fetch decks")
  return res.json()
}

async function fetchCommunityCollections(
  query?: string
): Promise<{ data: Collection[] }> {
  const params = new URLSearchParams()
  if (query) params.set("q", query)
  const qs = params.toString()
  const res = await fetch(`/api/v1/community/collections${qs ? `?${qs}` : ""}`)
  if (!res.ok) throw new Error("Failed to fetch collections")
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

async function forkCollection(
  id: string
): Promise<{ data: { id: string } }> {
  const res = await fetch(`/api/v1/collections/${id}/fork`, { method: "POST" })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const message = body?.error?.message ?? "Couldn’t fork this collection"
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

type ExploreTab = "decks" | "collections"

export default function ExplorePage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { isSignedIn, isLoaded } = useUser()
  const [query, setQuery] = useState("")
  const [tab, setTab] = useState<ExploreTab>("decks")
  const [pendingForkId, setPendingForkId] = useState<string | null>(null)
  const [pendingStudyId, setPendingStudyId] = useState<string | null>(null)
  const [forkError, setForkError] = useState<string | null>(null)
  const [, startNavigate] = useTransition()

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.communityDecks(query),
    queryFn: () => fetchCommunityDecks(query || undefined),
  })

  const collectionsQuery = useQuery({
    queryKey: queryKeys.communityCollections(query),
    queryFn: () => fetchCommunityCollections(query || undefined),
  })

  const meQuery = useQuery({
    queryKey: queryKeys.me(),
    queryFn: fetchMe,
    enabled: isLoaded && isSignedIn,
  })

  const { data: languagesData } = useQuery({
    queryKey: queryKeys.languages(),
    queryFn: fetchLanguages,
    staleTime: Infinity,
  })

  const myId = meQuery.data?.data?.id ?? null
  const languagesById = useMemo(
    () => Object.fromEntries((languagesData?.data ?? []).map((l) => [l.id, l])),
    [languagesData]
  )

  const forkMutation = useMutation({
    mutationFn: forkDeck,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.decks() })
      queryClient.invalidateQueries({ queryKey: ["community-decks"] })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() })
      startNavigate(() => router.push(`/decks/${result.data.id}`))
    },
    onError: (error) => {
      setForkError(error instanceof Error ? error.message : "Couldn’t fork this deck")
    },
    onSettled: () => {
      setPendingForkId(null)
    },
  })

  const forkCollectionMutation = useMutation({
    mutationFn: forkCollection,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections() })
      queryClient.invalidateQueries({ queryKey: queryKeys.decks() })
      queryClient.invalidateQueries({ queryKey: ["community-collections"] })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() })
      startNavigate(() => router.push(`/collections/${result.data.id}`))
    },
    onError: (error) => {
      setForkError(
        error instanceof Error
          ? error.message
          : "Couldn’t fork this collection"
      )
    },
    onSettled: () => {
      setPendingForkId(null)
    },
  })

  const studyMutation = useMutation({
    mutationFn: startStudy,
    onSuccess: (result) => {
      startNavigate(() => router.push(`/study/${result.data.session.id}`))
    },
    onError: (error) => {
      setForkError(
        error instanceof Error ? error.message : "Couldn’t start a study session"
      )
    },
    onSettled: () => {
      setPendingStudyId(null)
    },
  })

  const decks = data?.data || []
  const collections = collectionsQuery.data?.data || []

  const onForkDeck = (deck: Deck) => {
    if (!isSignedIn) return
    setForkError(null)
    setPendingForkId(deck.id)
    forkMutation.mutate(deck.id)
  }

  const onStudy = (deck: Deck) => {
    if (!isSignedIn) return
    setForkError(null)
    setPendingStudyId(deck.id)
    studyMutation.mutate(deck.id)
  }

  const onForkCollection = (collection: Collection) => {
    if (!isSignedIn) return
    setForkError(null)
    setPendingForkId(collection.id)
    forkCollectionMutation.mutate(collection.id)
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Explore
          </h1>
          <p className="text-muted-foreground mt-1">
            Discover decks and collections shared by the community — fork any of them to make them your own.
          </p>
        </div>
        <div className="w-full sm:max-w-xs">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === "decks" ? "Search decks…" : "Search collections…"}
            className="h-10"
          />
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as ExploreTab)}
        className="mb-6"
      >
        <TabsList>
          <TabsTrigger value="decks">
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Decks
          </TabsTrigger>
          <TabsTrigger value="collections">
            <Layers className="mr-1.5 h-3.5 w-3.5" />
            Collections
          </TabsTrigger>
        </TabsList>

        <TabsContent value="decks">
          {forkError && isSignedIn ? (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive"
            >
              {forkError}
            </div>
          ) : null}

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
            <div className="grid grid-cols-1 gap-4 [contain:layout] sm:grid-cols-2 lg:grid-cols-3">
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
                          {deck.cardCount}{" "}
                          {deck.cardCount === 1 ? "card" : "cards"}
                        </span>
                      </span>
                    }
                    onStudy={
                      isSignedIn
                        ? () => onStudy(deck)
                        : (id) =>
                            startNavigate(() =>
                              router.push(`/explore/decks/${id}/study`)
                            )
                    }
                    actions={
                      isSignedIn ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 sm:h-8 px-3 sm:px-3 text-xs"
                          disabled={isForking}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (isMine) {
                              startNavigate(() => router.push(`/decks/${deck.id}`))
                              return
                            }
                            onForkDeck(deck)
                          }}
                        >
                          {isForking ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : isMine ? (
                            <Globe className="mr-1.5 h-3.5 w-3.5" />
                          ) : (
                            <Copy className="mr-1.5 h-3.5 w-3.5" />
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
        </TabsContent>

        <TabsContent value="collections">
          {forkError && isSignedIn ? (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive"
            >
              {forkError}
            </div>
          ) : null}

          {collectionsQuery.isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <CollectionCardSkeleton key={i} />
              ))}
            </div>
          ) : collections.length === 0 ? (
            <CollectionCardEmptyState
              title="No public collections yet"
              description="Be the first to share a collection with the community"
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 [contain:layout] sm:grid-cols-2 lg:grid-cols-3">
              {collections.map((collection) => {
                const isMine = myId && collection.creatorId === myId
                const isForking = pendingForkId === collection.id
                return (
                  <CollectionCard
                    key={collection.id}
                    collection={collection}
                    href={`/explore/collections/${collection.id}`}
                    languageNames={{
                      source: languagesById[collection.sourceLanguageId]?.name,
                      target: languagesById[collection.targetLanguageId]?.name,
                      sourceFlag: languagesById[collection.sourceLanguageId]?.flag,
                      targetFlag: languagesById[collection.targetLanguageId]?.flag,
                    }}
                    badges={
                      <>
                        {collection.isCurated ? <CollectionCard.CuratedBadge /> : null}
                        {collection.forkedFromCollectionId ? <CollectionCard.ForkedBadge /> : null}
                      </>
                    }
                    footerLeft={
                      <span>
                        <span className="font-medium text-ink/80">
                          {collection.creatorName ?? "Unknown"}
                        </span>
                      </span>
                    }
                    actions={
                      isSignedIn ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 sm:h-8 px-3 sm:px-3 text-xs"
                          disabled={isForking}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (isMine) {
                              startNavigate(() =>
                                router.push(`/collections/${collection.id}`)
                              )
                              return
                            }
                            onForkCollection(collection)
                          }}
                        >
                          {isForking ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : isMine ? (
                            <Globe className="mr-1.5 h-3.5 w-3.5" />
                          ) : (
                            <Copy className="mr-1.5 h-3.5 w-3.5" />
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
        </TabsContent>
      </Tabs>
    </main>
  )
}
