"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Layers,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
  BookOpen,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { CollectionAddDecksDialog } from "@/components/collection/collection-add-decks-dialog"
import { queryKeys } from "@/hooks"
import type { Collection, CollectionDeck } from "@/types/collection"
import type { Deck, Language } from "@/types/deck"

async function fetchCollection(id: string): Promise<{ data: Collection }> {
  const res = await fetch(`/api/v1/collections/${id}`)
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

async function updateCollection(
  id: string,
  data: { title?: string; description?: string }
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
  deckId: string
): Promise<void> {
  const res = await fetch(
    `/api/v1/collections/${collectionId}/decks/${deckId}`,
    { method: "DELETE" }
  )
  if (!res.ok) throw new Error("Failed to remove deck")
}

export default function CollectionDetail() {
  const params = useParams()
  const queryClient = useQueryClient()
  const collectionId = params.id as string

  const [editing, setEditing] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.collection(collectionId),
    queryFn: () => fetchCollection(collectionId),
  })

  const { data: languagesData } = useQuery({
    queryKey: queryKeys.languages(),
    queryFn: fetchLanguages,
    staleTime: Infinity,
  })

  const { data: decksData } = useQuery({
    queryKey: queryKeys.decks(),
    queryFn: fetchDecks,
  })

  const collection = data?.data
  const languages = languagesData?.data || []
  const languagesById = Object.fromEntries(languages.map((l) => [l.id, l]))
  const allDecks = decksData?.data ?? []

  const updateMutation = useMutation({
    mutationFn: (input: { title?: string; description?: string }) =>
      updateCollection(collectionId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collection(collectionId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.collections() })
      setEditing(false)
    },
  })

  const startEditing = () => setEditing(true)

  const removeDeckMutation = useMutation({
    mutationFn: (deckId: string) =>
      removeDeckFromCollection(collectionId, deckId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collection(collectionId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.collections() })
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  if (!collection) {
    return <div>Collection not found</div>
  }

  const sourceLanguage = languagesById[collection.sourceLanguageId]
  const targetLanguage = languagesById[collection.targetLanguageId]
  const decksInCollection = collection.decks ?? []
  const existingDeckIds = new Set(decksInCollection.map((d) => d.id))

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {editing ? (
          <CollectionEditForm
            collection={collection}
            onSave={(values) => updateMutation.mutate(values)}
            onCancel={() => setEditing(false)}
            saving={updateMutation.isPending}
          />
        ) : (
          <CollectionViewHeader
            collection={collection}
            onEdit={startEditing}
          />
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {sourceLanguage && targetLanguage && (
            <span className="inline-flex items-center gap-1.5 font-mono-tag text-[11px] uppercase tracking-widest">
              {sourceLanguage.flag && (
                <span className="text-base leading-none" aria-hidden>
                  {sourceLanguage.flag}
                </span>
              )}
              <span>{sourceLanguage.name}</span>
              <span aria-hidden>→</span>
              {targetLanguage.flag && (
                <span className="text-base leading-none" aria-hidden>
                  {targetLanguage.flag}
                </span>
              )}
              <span>{targetLanguage.name}</span>
            </span>
          )}
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            {collection.deckCount} {collection.deckCount === 1 ? "deck" : "decks"}
          </span>
          <span aria-hidden>·</span>
          <span>
            {collection.totalCards} {collection.totalCards === 1 ? "card" : "cards"}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Decks in this collection</h2>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Decks
        </Button>
      </div>

      <div className="space-y-3">
        {decksInCollection.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center sm:p-12">
            <BookOpen className="text-muted-foreground mx-auto mb-3 h-10 w-10" />
            <h3 className="text-base font-semibold">No decks yet</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Add decks that match this language pair to group them together.
            </p>
          </div>
        ) : (
          decksInCollection.map((deck) => (
            <CollectionDeckRow
              key={deck.id}
              deck={deck}
              languagesById={languagesById}
              collectionId={collectionId}
              onRemove={() => removeDeckMutation.mutate(deck.id)}
            />
          ))
        )}
      </div>

      <CollectionAddDecksDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        collectionId={collectionId}
        sourceLanguageId={collection.sourceLanguageId}
        targetLanguageId={collection.targetLanguageId}
        existingDeckIds={existingDeckIds}
        decks={allDecks}
        languages={languages}
      />
    </div>
  )
}

function CollectionDeckRow({
  deck,
  languagesById,
  collectionId,
  onRemove,
}: {
  deck: CollectionDeck
  languagesById: Record<string, Language>
  collectionId: string
  onRemove: () => void
}) {
  const sourceName = languagesById[deck.sourceLanguageId]?.name
  const targetName = languagesById[deck.targetLanguageId]?.name
  const sourceFlag = languagesById[deck.sourceLanguageId]?.flag
  const targetFlag = languagesById[deck.targetLanguageId]?.flag

  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <Link
            href={`/decks/${deck.id}?from=${encodeURIComponent(`/collections/${collectionId}`)}`}
            className="block truncate text-base font-semibold outline-none transition-colors hover:text-ink/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {deck.title}
          </Link>
          {deck.description && (
            <p className="text-muted-foreground mt-0.5 line-clamp-1 text-sm">
              {deck.description}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {sourceName && targetName && (
              <span className="font-mono-tag uppercase tracking-widest">
                {sourceFlag && (
                  <span className="mr-1 text-sm leading-none" aria-hidden>
                    {sourceFlag}
                  </span>
                )}
                {sourceName}
                <span className="px-1 text-ink/30">→</span>
                {targetFlag && (
                  <span className="mr-1 text-sm leading-none" aria-hidden>
                    {targetFlag}
                  </span>
                )}
                {targetName}
              </span>
            )}
            <span aria-hidden>·</span>
            <span>
              {deck.cardCount} {deck.cardCount === 1 ? "card" : "cards"}
            </span>
            {deck.topics && deck.topics.length > 0 && (
              <>
                <span aria-hidden>·</span>
                <div className="flex flex-wrap items-center gap-1">
                  {deck.topics.slice(0, 3).map((topic) => (
                    <Badge
                      key={topic.id}
                      variant="outline"
                      className="px-1.5 py-0 text-[10px] font-normal"
                    >
                      {topic.name}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Remove ${deck.title} from collection`}
          className="h-8 w-8 shrink-0 text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  )
}

function CollectionViewHeader({
  collection,
  onEdit,
}: {
  collection: Collection
  onEdit: () => void
}) {
  const router = useRouter()

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 sm:gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/collections")}
          className="shrink-0"
          aria-label="Back to collections"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
            {collection.title}
          </h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          className="shrink-0"
          aria-label="Edit collection"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
      {collection.description && (
        <p className="text-muted-foreground">{collection.description}</p>
      )}
    </div>
  )
}

function CollectionEditForm({
  collection,
  onSave,
  onCancel,
  saving,
}: {
  collection: Collection
  onSave: (values: { title: string; description: string }) => void
  onCancel: () => void
  saving: boolean
}) {
  const [title, setTitle] = useState(collection.title)
  const [description, setDescription] = useState(collection.description || "")

  const handleSave = () => {
    onSave({ title, description })
  }

  const handleCancel = () => {
    setTitle(collection.title)
    setDescription(collection.description || "")
    onCancel()
  }

  return (
    <div className="space-y-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Collection title"
        className="h-auto bg-white py-1 text-xl font-bold dark:bg-input/30"
      />
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        className="min-h-[60px] bg-white dark:bg-input/30"
      />
      <div className="flex justify-end gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCancel}
          disabled={saving}
        >
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
      </div>
    </div>
  )
}
