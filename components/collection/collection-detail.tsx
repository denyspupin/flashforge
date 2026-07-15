"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useMemo, useState, useTransition } from "react"
import { useUser } from "@clerk/nextjs"
import {
  ArrowLeft,
  Award,
  Globe,
  Layers,
  Copy,
  Loader2,
  User,
  Library,
  Lock,
  Pencil,
  Plus,
  Save,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  DeckCard,
  DeckCardEmptyState,
} from "@/components/deck/deck-card"
import { CollectionAddDecksDialog } from "@/components/collection/collection-add-decks-dialog"
import { CollectionActionsMenu } from "@/components/collection/collection-actions-menu"
import { DeckInCollectionActionsMenu } from "@/components/collection/deck-in-collection-actions-menu"
import { queryKeys } from "@/hooks"
import type { Collection } from "@/types/collection"
import type { Deck, Language } from "@/types/deck"
import type {
  CommunityCollectionDeck,
  CommunityCollectionDetailResult,
} from "@/lib/cache/community-collections-detail"

type Props = { backHref?: string }

type ViewDeck = CommunityCollectionDeck & { createdAt: string }

type ViewCollection = {
  id: string
  title: string
  description: string | null
  visibility: "private" | "public"
  creatorId: string
  creatorName: string
  isCurated: boolean
  forkedFromCollectionId: string | null
  sourceLanguageId: string
  targetLanguageId: string
  createdAt: string
  deckCount: number
  totalCards: number
  decks: ViewDeck[]
}

async function fetchCommunityCollection(
  id: string,
): Promise<{ data: CommunityCollectionDetailResult }> {
  const res = await fetch(`/api/v1/community/collections/${id}`)
  if (res.status === 404) return { data: null }
  if (!res.ok) throw new Error("Failed to fetch collection")
  return res.json()
}

async function fetchOwnerCollection(
  id: string,
): Promise<{ data: Collection | null }> {
  const res = await fetch(`/api/v1/collections/${id}`)
  if (res.status === 404) return { data: null }
  if (!res.ok) throw new Error("Failed to fetch collection")
  return res.json()
}

async function fetchLanguages(): Promise<{ data: Language[] }> {
  const res = await fetch("/api/v1/languages")
  if (!res.ok) throw new Error("Failed to fetch languages")
  return res.json()
}

async function fetchDecks(): Promise<{ data: Deck[] }> {
  const res = await fetch("/api/v1/decks")
  if (!res.ok) throw new Error("Failed to fetch decks")
  return res.json()
}

async function fetchMe(): Promise<{ data: { id: string } | null }> {
  const res = await fetch("/api/v1/users/me")
  if (res.status === 401) return { data: null }
  if (!res.ok) throw new Error("Failed to fetch user")
  return res.json()
}

async function forkCollection(
  id: string,
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
  deckId: string,
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

async function updateCollection(
  id: string,
  data: { title?: string; description?: string },
): Promise<{ data: Collection }> {
  const res = await fetch(`/api/v1/collections/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Failed to update collection")
  return res.json()
}

async function removeDeckFromCollection(
  collectionId: string,
  deckId: string,
): Promise<void> {
  const res = await fetch(
    `/api/v1/collections/${collectionId}/decks/${deckId}`,
    { method: "DELETE" },
  )
  if (!res.ok) throw new Error("Failed to remove deck")
}

async function togglePublish(
  id: string,
  publish: boolean,
): Promise<{ data: Collection }> {
  const res = await fetch(
    `/api/v1/collections/${id}/${publish ? "publish" : "unpublish"}`,
    { method: "POST" },
  )
  if (!res.ok) throw new Error("Failed to update visibility")
  return res.json()
}

async function deleteCollection(id: string): Promise<void> {
  const res = await fetch(`/api/v1/collections/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Failed to delete collection")
}

function toView(
  publicData: CommunityCollectionDetailResult,
  ownerData: Collection | null,
  myId: string | null,
  languagesById: Record<string, Language>,
): ViewCollection | null {
  if (publicData) {
    return {
      id: publicData.id,
      title: publicData.title,
      description: publicData.description,
      visibility: ownerData?.visibility ?? "public",
      creatorId: publicData.creatorId,
      creatorName: publicData.creatorName,
      isCurated: publicData.isCurated,
      forkedFromCollectionId: publicData.forkedFromCollectionId,
      sourceLanguageId: publicData.sourceLanguageId,
      targetLanguageId: publicData.targetLanguageId,
      createdAt:
        ownerData?.createdAt ?? new Date(publicData.createdAt).toISOString(),
      deckCount: publicData.deckCount,
      totalCards: publicData.totalCards,
      decks: publicData.decks.map((d) => ({
        ...d,
        createdAt: new Date(publicData.createdAt).toISOString(),
      })),
    }
  }
  if (ownerData) {
    return {
      id: ownerData.id,
      title: ownerData.title,
      description: ownerData.description,
      visibility: ownerData.visibility,
      creatorId: ownerData.creatorId,
      creatorName: myId === ownerData.creatorId ? "You" : "Unknown",
      isCurated: ownerData.isCurated,
      forkedFromCollectionId: ownerData.forkedFromCollectionId,
      sourceLanguageId: ownerData.sourceLanguageId,
      targetLanguageId: ownerData.targetLanguageId,
      createdAt: ownerData.createdAt,
      deckCount: ownerData.deckCount,
      totalCards: ownerData.totalCards,
      decks: (ownerData.decks ?? []).map((d) => ({
        id: d.id,
        title: d.title,
        slug: d.slug,
        description: d.description,
        visibility: "public" as const,
        sourceLanguageId: d.sourceLanguageId,
        targetLanguageId: d.targetLanguageId,
        creatorId: ownerData.creatorId,
        isCurated: false,
        forkedFromDeckId: null,
        cardCount: d.cardCount,
        position: d.position,
        topics: d.topics ?? [],
        createdAt: ownerData.createdAt,
      })),
    }
  }
  return null
}

export default function CollectionDetail({
  backHref = "/collections",
}: Props) {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { isSignedIn, isLoaded } = useUser()
  const collectionId = params.id as string
  const [, startNavigate] = useTransition()

  const [editing, setEditing] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] =
    useState<"fork" | "study" | null>(null)
  const [removingDeckId, setRemovingDeckId] = useState<string | null>(null)

  const publicQuery = useQuery({
    queryKey: queryKeys.publicCollection(collectionId),
    queryFn: () => fetchCommunityCollection(collectionId),
  })

  const ownerQuery = useQuery({
    queryKey: queryKeys.collection(collectionId),
    queryFn: () => fetchOwnerCollection(collectionId),
    enabled: isLoaded && isSignedIn,
  })

  const meQuery = useQuery({
    queryKey: queryKeys.me(),
    queryFn: fetchMe,
    enabled: isLoaded && isSignedIn,
  })

  const languagesQuery = useQuery({
    queryKey: queryKeys.languages(),
    queryFn: fetchLanguages,
    staleTime: Infinity,
  })

  const myDecksQuery = useQuery({
    queryKey: queryKeys.decks(),
    queryFn: fetchDecks,
    enabled: isLoaded && isSignedIn,
  })

  const myId = meQuery.data?.data?.id ?? null
  const isOwner = !!ownerQuery.data?.data
  const languagesById = useMemo(
    () =>
      Object.fromEntries(
        (languagesQuery.data?.data ?? []).map((l) => [l.id, l]),
      ),
    [languagesQuery.data],
  )
  const collection = useMemo(
    () =>
      toView(
        publicQuery.data?.data ?? null,
        ownerQuery.data?.data ?? null,
        myId,
        languagesById,
      ),
    [publicQuery.data, ownerQuery.data, myId, languagesById],
  )

  const isLoading =
    publicQuery.isLoading ||
    (isLoaded && isSignedIn && (ownerQuery.isLoading || meQuery.isLoading))

  const invalidateAll = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.publicCollection(collectionId),
    })
    queryClient.invalidateQueries({
      queryKey: queryKeys.collection(collectionId),
    })
    queryClient.invalidateQueries({
      queryKey: queryKeys.communityCollections(),
    })
    queryClient.invalidateQueries({ queryKey: queryKeys.collections() })
    queryClient.invalidateQueries({ queryKey: queryKeys.decks() })
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() })
  }

  const forkMutation = useMutation({
    mutationFn: () => forkCollection(collectionId),
    onSuccess: (result) => {
      invalidateAll()
      startNavigate(() => router.push(`/collections/${result.data.id}`))
    },
    onError: (error) => {
      setActionError(
        error instanceof Error
          ? error.message
          : "Couldn’t fork this collection",
      )
    },
    onSettled: () => {
      setPendingAction(null)
    },
  })

  const studyMutation = useMutation({
    mutationFn: (deckId: string) => startStudy(deckId),
    onSuccess: (result) => {
      startNavigate(() => router.push(`/study/${result.data.session.id}`))
    },
    onError: (error) => {
      setActionError(
        error instanceof Error
          ? error.message
          : "Couldn’t start a study session",
      )
    },
    onSettled: () => {
      setPendingAction(null)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (values: { title?: string; description?: string }) =>
      updateCollection(collectionId, values),
    onSuccess: () => {
      invalidateAll()
      setEditing(false)
    },
  })

  const removeDeckMutation = useMutation({
    mutationFn: (deckId: string) =>
      removeDeckFromCollection(collectionId, deckId),
    onSuccess: () => {
      setRemovingDeckId(null)
      invalidateAll()
    },
    onError: (error) => {
      setActionError(
        error instanceof Error ? error.message : "Couldn’t remove deck",
      )
      setRemovingDeckId(null)
    },
  })

  const togglePublishMutation = useMutation({
    mutationFn: (publish: boolean) => togglePublish(collectionId, publish),
    onSuccess: () => {
      invalidateAll()
    },
    onError: (error) => {
      setActionError(
        error instanceof Error
          ? error.message
          : "Couldn’t update visibility",
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteCollection(collectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections() })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() })
      startNavigate(() => router.push(backHref))
    },
    onError: (error) => {
      setActionError(
        error instanceof Error ? error.message : "Couldn’t delete collection",
      )
    },
  })

  const onFork = () => {
    if (!isSignedIn) return
    setActionError(null)
    setPendingAction("fork")
    forkMutation.mutate()
  }

  const onStudyDeck = (deckId: string) => {
    if (!isSignedIn) return
    setActionError(null)
    setPendingAction("study")
    studyMutation.mutate(deckId)
  }

  const onRemoveDeck = (deckId: string) => {
    setActionError(null)
    setRemovingDeckId(deckId)
    removeDeckMutation.mutate(deckId)
  }

  const onTogglePublish = () => {
    if (!collection) return
    setActionError(null)
    togglePublishMutation.mutate(collection.visibility !== "public")
  }

  const onDelete = () => {
    if (typeof window !== "undefined" && !window.confirm("Delete this collection? This can’t be undone.")) {
      return
    }
    setActionError(null)
    deleteMutation.mutate()
  }

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mb-4" />
        <div className="h-32 bg-muted animate-pulse rounded" />
      </main>
    )
  }

  if (!collection) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-4 sm:px-6 sm:py-6">
        <Card className="flex flex-col items-center justify-center p-8 text-center sm:p-12">
          <Library className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Collection not found</h3>
          <p className="text-muted-foreground mt-1">
            This collection might be private or does not exist
          </p>
          <Button
            className="mt-4"
            onClick={() =>
              startNavigate(() => router.push(backHref))
            }
          >
            Back
          </Button>
        </Card>
      </main>
    )
  }

  const sourceLanguage = languagesById[collection.sourceLanguageId]
  const targetLanguage = languagesById[collection.targetLanguageId]
  const isPublic = collection.visibility === "public"
  const existingDeckIds = new Set(collection.decks.map((d) => d.id))
  const myDecks = myDecksQuery.data?.data ?? []

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-6 flex items-start gap-2 sm:items-center sm:gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => startNavigate(() => router.push(backHref))}
          className="shrink-0"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          {editing && isOwner ? (
            <CollectionEditForm
              collection={collection}
              onSave={(values) => updateMutation.mutate(values)}
              onCancel={() => setEditing(false)}
              saving={updateMutation.isPending}
            />
          ) : (
            <>
              <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
                {collection.title}
              </h1>
              {collection.description && (
                <p className="text-muted-foreground mt-1">
                  {collection.description}
                </p>
              )}
            </>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge variant={isPublic ? "default" : "secondary"}>
            {isPublic ? (
              <Globe className="h-3 w-3" />
            ) : (
              <Lock className="h-3 w-3" />
            )}
            {isPublic ? "Public" : "Private"}
          </Badge>
          {collection.isCurated && (
            <Badge variant="highlight">
              <Award className="h-3 w-3" />
              Curated
            </Badge>
          )}
          {isOwner && !editing && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditing(true)}
              className="shrink-0"
              aria-label="Edit collection"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            <span className="font-medium text-ink/80">
              {collection.creatorName}
            </span>
          </span>
          <span className="hidden sm:inline">·</span>
          <span className="inline-flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            {collection.deckCount}{" "}
            {collection.deckCount === 1 ? "deck" : "decks"}
          </span>
          <span className="hidden sm:inline">·</span>
          <span>
            {collection.totalCards}{" "}
            {collection.totalCards === 1 ? "card" : "cards"}
          </span>
          {sourceLanguage && targetLanguage && (
            <>
              <span className="hidden sm:inline">·</span>
              <span>
                {sourceLanguage.name} → {targetLanguage.name}
              </span>
            </>
          )}
        </div>

        {isOwner ? (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              size="sm"
              onClick={() => setAddOpen(true)}
              className="w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Decks
            </Button>
            <CollectionActionsMenu
              collection={{
                ...collection,
                slug: collection.id,
                updatedAt: collection.createdAt,
                decks: undefined,
              }}
              onEdit={() => setEditing(true)}
              onTogglePublish={onTogglePublish}
              onDelete={onDelete}
              triggerClassName="h-8 w-8"
            />
          </div>
        ) : isSignedIn ? (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              variant="outline"
              onClick={onFork}
              disabled={pendingAction !== null}
              className="w-full sm:w-auto"
            >
              {pendingAction === "fork" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Copy className="mr-1.5 h-4 w-4" />
              )}
              {pendingAction === "fork"
                ? "Forking…"
                : "Fork to my collections"}
            </Button>
          </div>
        ) : (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <Link href={`/login?redirect_url=${encodeURIComponent(`/collections/${collection.id}`)}`}>
              <Button variant="outline" className="w-full gap-1.5 sm:w-auto">
                Sign in to fork
              </Button>
            </Link>
          </div>
        )}
      </div>

      {actionError && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive"
        >
          {actionError}
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold">Decks in this collection</h2>
      {collection.decks.length === 0 ? (
        <DeckCardEmptyState
          title="No decks in this collection"
          description={
            isOwner
              ? "Add decks that match this language pair to group them together."
              : "The author hasn’t added any decks yet"
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 [contain:layout] sm:grid-cols-2 lg:grid-cols-3">
          {collection.decks.map((deckRow) => {
            const deckForCard: Deck = {
              id: deckRow.id,
              title: deckRow.title,
              description: deckRow.description,
              slug: deckRow.slug,
              visibility: deckRow.visibility,
              sourceLanguageId: deckRow.sourceLanguageId,
              targetLanguageId: deckRow.targetLanguageId,
              creatorId: deckRow.creatorId,
              creatorName: collection.creatorName,
              isCurated: deckRow.isCurated,
              forkedFromDeckId: deckRow.forkedFromDeckId,
              cardCount: deckRow.cardCount,
              topics: deckRow.topics,
              createdAt: deckRow.createdAt,
            }
            const isMyDeck = myId && deckRow.creatorId === myId
            const isRemoving = removingDeckId === deckRow.id

            return (
              <DeckCard
                key={deckRow.id}
                deck={deckForCard}
                href={`/decks/${deckRow.id}?from=${encodeURIComponent(`/collections/${collectionId}`)}`}
                languageNames={{
                  source: languagesById[deckRow.sourceLanguageId]?.name,
                  target: languagesById[deckRow.targetLanguageId]?.name,
                  sourceFlag: languagesById[deckRow.sourceLanguageId]?.flag,
                  targetFlag: languagesById[deckRow.targetLanguageId]?.flag,
                }}
                badges={
                  <>
                    {deckRow.isCurated ? <DeckCard.CuratedBadge /> : null}
                    {deckRow.forkedFromDeckId ? (
                      <DeckCard.ForkedBadge />
                    ) : null}
                    <DeckCard.TopicBadges topics={deckRow.topics} />
                  </>
                }
                footerLeft={
                  <span>
                    <span>
                      {deckRow.cardCount}{" "}
                      {deckRow.cardCount === 1 ? "card" : "cards"}
                    </span>
                  </span>
                }
                onStudy={
                  isSignedIn
                    ? () => onStudyDeck(deckRow.id)
                    : (id) =>
                        startNavigate(() =>
                          router.push(`/explore/decks/${id}/study`),
                        )
                }
                actions={
                  isMyDeck || isOwner ? (
                    <DeckInCollectionActionsMenu
                      deckTitle={deckRow.title}
                      onEdit={
                        isMyDeck
                          ? () =>
                              startNavigate(() =>
                                router.push(
                                  `/decks/${deckRow.id}?from=${encodeURIComponent(
                                    `/collections/${collectionId}`,
                                  )}`,
                                ),
                              )
                          : undefined
                      }
                      onRemove={
                        isOwner ? () => onRemoveDeck(deckRow.id) : undefined
                      }
                      removing={isRemoving}
                    />
                  ) : undefined
                }
              />
            )
          })}
        </div>
      )}

      {isOwner && (
        <CollectionAddDecksDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          collectionId={collectionId}
          sourceLanguageId={collection.sourceLanguageId}
          targetLanguageId={collection.targetLanguageId}
          existingDeckIds={existingDeckIds}
          decks={myDecks}
          languages={languagesQuery.data?.data ?? []}
        />
      )}

      {(studyMutation.isPending || forkMutation.isPending) && (
        <span className="sr-only" aria-live="polite">
          {pendingAction === "study" ? "Starting study session…" : "Forking…"}
        </span>
      )}
    </main>
  )
}

function CollectionEditForm({
  collection,
  onSave,
  onCancel,
  saving,
}: {
  collection: ViewCollection
  onSave: (values: { title: string; description: string }) => void
  onCancel: () => void
  saving: boolean
}) {
  const [title, setTitle] = useState(collection.title)
  const [description, setDescription] = useState(collection.description || "")

  return (
    <div className="space-y-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Collection title"
        className="h-auto bg-white py-1 text-xl font-bold dark:bg-input/30"
        autoFocus
      />
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        className="min-h-[60px] bg-white dark:bg-input/30"
      />
      <div className="flex justify-end gap-2">
        <Button size="sm" onClick={() => onSave({ title, description })} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={saving}
        >
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
      </div>
    </div>
  )
}
