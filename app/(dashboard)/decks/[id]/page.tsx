"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
  Globe,
  Lock,
  Save,
  X,
  Play,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { queryKeys } from "@/hooks"

interface Card {
  id: string
  deckId: string
  front: string
  back: string
  timesReviewed: number
  timesCorrect: number
  lastReviewedAt: string | null
  createdAt: string
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
  isCurated: boolean
  forkedFromDeckId: string | null
  createdAt: string
  updatedAt: string
  cards: Card[]
  topics: { id: string; name: string; slug: string }[]
}

const cardSchema = z.object({
  front: z.string().min(1, "Front side is required"),
  back: z.string().min(1, "Back side is required"),
})

type CardInput = z.infer<typeof cardSchema>

async function fetchDeck(id: string): Promise<{ data: Deck }> {
  const res = await fetch(`/api/v1/decks/${id}`)
  if (!res.ok) throw new Error("Failed to fetch deck")
  return res.json()
}

async function fetchLanguages(): Promise<{ data: { id: string; name: string; code: string }[] }> {
  const res = await fetch("/api/v1/languages")
  if (!res.ok) throw new Error("Failed to fetch languages")
  return res.json()
}

async function addCard(deckId: string, data: CardInput): Promise<{ data: Card }> {
  const res = await fetch(`/api/v1/decks/${deckId}/cards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Failed to add card")
  return res.json()
}

async function updateCard(
  deckId: string,
  cardId: string,
  data: Partial<CardInput>
): Promise<{ data: Card }> {
  const res = await fetch(`/api/v1/decks/${deckId}/cards/${cardId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Failed to update card")
  return res.json()
}

async function deleteCard(deckId: string, cardId: string): Promise<void> {
  const res = await fetch(`/api/v1/decks/${deckId}/cards/${cardId}`, {
    method: "DELETE",
  })
  if (!res.ok) throw new Error("Failed to delete card")
}

async function updateDeck(
  id: string,
  data: { title?: string; description?: string }
): Promise<{ data: Deck }> {
  const res = await fetch(`/api/v1/decks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Failed to update deck")
  return res.json()
}

export default function DeckDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const deckId = params.id as string

  const [open, setOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<string | null>(null)
  const [editingDeck, setEditingDeck] = useState(false)
  const [deckTitle, setDeckTitle] = useState("")
  const [deckDescription, setDeckDescription] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.deck(deckId),
    queryFn: () => fetchDeck(deckId),
  })

  const { data: languagesData } = useQuery({
    queryKey: queryKeys.languages(),
    queryFn: fetchLanguages,
  })

  const deck = data?.data
  const languages = languagesData?.data || []
  const languagesById = Object.fromEntries(
    languages.map((l) => [l.id, l] as const)
  )
  const sourceLanguage = deck ? languagesById[deck.sourceLanguageId] : null
  const targetLanguage = deck ? languagesById[deck.targetLanguageId] : null

  const addCardMutation = useMutation({
    mutationFn: (cardData: CardInput) => addCard(deckId, cardData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deck(deckId) })
      setOpen(false)
      cardForm.reset()
    },
  })

  const updateCardMutation = useMutation({
    mutationFn: ({
      cardId,
      cardData,
    }: {
      cardId: string
      cardData: Partial<CardInput>
    }) => updateCard(deckId, cardId, cardData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deck(deckId) })
      setEditingCard(null)
    },
  })

  const deleteCardMutation = useMutation({
    mutationFn: (cardId: string) => deleteCard(deckId, cardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deck(deckId) })
    },
  })

  const updateDeckMutation = useMutation({
    mutationFn: (data: { title?: string; description?: string }) =>
      updateDeck(deckId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deck(deckId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.decks() })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() })
      setEditingDeck(false)
    },
  })

  const cardForm = useForm<CardInput>({
    resolver: zodResolver(cardSchema),
    defaultValues: { front: "", back: "" },
  })

  const onAddCard = (data: CardInput) => {
    addCardMutation.mutate(data)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  if (!deck) {
    return <div>Deck not found</div>
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/decks")}
            className="shrink-0"
            aria-label="Back to decks"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            {editingDeck ? (
              <Input
                value={deckTitle}
                onChange={(e) => setDeckTitle(e.target.value)}
                placeholder="Deck title"
                className="text-xl font-bold h-auto py-1"
              />
            ) : (
              <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
                {deck.title}
              </h1>
            )}
          </div>
          {!editingDeck && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setEditingDeck(true)
                setDeckTitle(deck.title)
                setDeckDescription(deck.description || "")
              }}
              className="shrink-0"
              aria-label="Edit deck"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>

        {editingDeck ? (
          <div className="space-y-2">
            <Textarea
              value={deckDescription}
              onChange={(e) => setDeckDescription(e.target.value)}
              placeholder="Description"
              className="min-h-[60px]"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() =>
                  updateDeckMutation.mutate({
                    title: deckTitle,
                    description: deckDescription,
                  })
                }
              >
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditingDeck(false)
                  setDeckTitle(deck.title)
                  setDeckDescription(deck.description || "")
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          deck.description && (
            <p className="text-muted-foreground">{deck.description}</p>
          )
        )}

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {sourceLanguage && targetLanguage && (
            <span className="text-muted-foreground inline-flex items-center gap-1.5 font-mono-tag text-[11px] uppercase tracking-widest">
              <span>{sourceLanguage.name}</span>
              <span aria-hidden>→</span>
              <span>{targetLanguage.name}</span>
            </span>
          )}
          <Badge variant={deck.visibility === "public" ? "default" : "secondary"}>
            {deck.visibility === "public" ? (
              <Globe className="h-3 w-3" />
            ) : (
              <Lock className="h-3 w-3" />
            )}
            {deck.visibility}
          </Badge>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={() => router.push(`/study?deckId=${deck.id}`)}
            className="w-full sm:w-auto"
          >
            <Play className="mr-2 h-4 w-4" />
            Study
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">
          Cards ({deck.cards?.length || 0})
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="mr-2 h-4 w-4" />
            Add Card
          </DialogTrigger>
          <DialogContent>
            <DialogCloseButton />
            <DialogHeader>
              <DialogTitle>Add Card</DialogTitle>
              <DialogDescription>
                Add a new flashcard to this deck.
              </DialogDescription>
            </DialogHeader>
            <Form {...cardForm}>
              <form
                onSubmit={cardForm.handleSubmit(onAddCard)}
                className="space-y-4"
              >
                <FormField
                  control={cardForm.control}
                  name="front"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Front</FormLabel>
                      <FormControl>
                        <Input placeholder="Word or phrase" {...field} />
                      </FormControl>
                      {sourceLanguage && (
                        <p className="text-muted-foreground font-mono-tag text-[10px] uppercase tracking-widest">
                          {sourceLanguage.name}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={cardForm.control}
                  name="back"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Back</FormLabel>
                      <FormControl>
                        <Input placeholder="Translation" {...field} />
                      </FormControl>
                      {targetLanguage && (
                        <p className="text-muted-foreground font-mono-tag text-[10px] uppercase tracking-widest">
                          {targetLanguage.name}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={addCardMutation.isPending}
                >
                  {addCardMutation.isPending ? "Adding..." : "Add Card"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {deck.cards?.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-8 text-center sm:p-12">
            <Plus className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No cards yet</h3>
            <p className="text-muted-foreground mt-1 mb-4">
              Add your first flashcard to start learning
            </p>
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Card
            </Button>
          </Card>
        ) : (
          deck.cards?.map((card) => (
            <Card key={card.id}>
              <CardContent className="p-4">
                {editingCard === card.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <Input
                          defaultValue={card.front}
                          id={`front-${card.id}`}
                          placeholder="Front"
                          className="h-11 px-2.5 text-xl"
                        />
                        {sourceLanguage && (
                          <p className="text-muted-foreground mt-1 pl-2.5 font-mono-tag text-[10px] uppercase tracking-widest">
                            {sourceLanguage.name}
                          </p>
                        )}
                      </div>
                      <div>
                        <Input
                          defaultValue={card.back}
                          id={`back-${card.id}`}
                          placeholder="Back"
                          className="h-11 px-2.5 text-xl"
                        />
                        {targetLanguage && (
                          <p className="text-muted-foreground mt-1 pl-2.5 font-mono-tag text-[10px] uppercase tracking-widest">
                            {targetLanguage.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const front = (
                            document.getElementById(
                              `front-${card.id}`
                            ) as HTMLInputElement
                          ).value
                          const back = (
                            document.getElementById(
                              `back-${card.id}`
                            ) as HTMLInputElement
                          ).value
                          updateCardMutation.mutate({
                            cardId: card.id,
                            cardData: { front, back },
                          })
                        }}
                      >
                        <Save className="mr-1.5 h-3.5 w-3.5" />
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingCard(null)}
                      >
                        <X className="mr-1.5 h-3.5 w-3.5" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Front</p>
                        <p className="font-display text-2xl font-medium tracking-tight text-ink">
                          {card.front}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Back</p>
                        <p className="font-display text-2xl font-medium tracking-tight text-ink">
                          {card.back}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-1 border-t border-ink/8 pt-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingCard(card.id)}
                        aria-label="Edit card"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => deleteCardMutation.mutate(card.id)}
                        aria-label="Delete card"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
