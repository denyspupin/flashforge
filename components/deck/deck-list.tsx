"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, MoreHorizontal, Pencil, Trash2, Globe, Lock } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  DeckCard,
  DeckCardEmptyState,
  DeckCardSkeleton,
} from "@/components/deck/deck-card"
import type { Deck, Language } from "@/types/deck"

const createDeckSchema = z.object({
  title: z.string().min(1).max(256),
  description: z.string().optional(),
  sourceLanguageId: z.string().uuid("Select a source language"),
  targetLanguageId: z.string().uuid("Select a target language"),
  visibility: z.enum(["private", "public"]),
})

type CreateDeckInput = z.infer<typeof createDeckSchema>

const languageItems = (languages: Language[]) =>
  Object.fromEntries(languages.map((l) => [l.id, l.name]))

async function fetchDecks(): Promise<{ data: Deck[] }> {
  const res = await fetch("/api/v1/decks")
  if (!res.ok) throw new Error("Failed to fetch decks")
  return res.json()
}

async function fetchLanguages(): Promise<{ data: Language[] }> {
  const res = await fetch("/api/v1/languages")
  if (!res.ok) throw new Error("Failed to fetch languages")
  return res.json()
}

async function createDeck(data: CreateDeckInput): Promise<{ data: Deck }> {
  const res = await fetch("/api/v1/decks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Failed to create deck")
  return res.json()
}

async function deleteDeck(id: string): Promise<void> {
  const res = await fetch(`/api/v1/decks/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Failed to delete deck")
}

async function publishDeck(id: string): Promise<void> {
  const res = await fetch(`/api/v1/decks/${id}/publish`, { method: "POST" })
  if (!res.ok) throw new Error("Failed to publish deck")
}

async function unpublishDeck(id: string): Promise<void> {
  const res = await fetch(`/api/v1/decks/${id}/unpublish`, { method: "POST" })
  if (!res.ok) throw new Error("Failed to unpublish deck")
}

export default function DeckList() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { data: decksData, isLoading: decksLoading } = useQuery({
    queryKey: ["decks"],
    queryFn: fetchDecks,
  })

  const { data: languagesData } = useQuery({
    queryKey: ["languages"],
    queryFn: fetchLanguages,
  })

  const createMutation = useMutation({
    mutationFn: createDeck,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["decks"] })
      setOpen(false)
      form.reset()
      setSubmitError(null)
    },
    onError: (error) => {
      console.error("[create deck] mutation failed:", error)
      setSubmitError(error instanceof Error ? error.message : "Couldn’t create the deck. Try again.")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteDeck,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["decks"] })
    },
  })

  const publishMutation = useMutation({
    mutationFn: publishDeck,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["decks"] })
    },
  })

  const unpublishMutation = useMutation({
    mutationFn: unpublishDeck,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["decks"] })
    },
  })

  const form = useForm<CreateDeckInput>({
    resolver: zodResolver(createDeckSchema),
    defaultValues: {
      title: "",
      description: "",
      sourceLanguageId: "",
      targetLanguageId: "",
      visibility: "private" as const,
    },
  })

  const onSubmit = (data: CreateDeckInput) => {
    console.log("[create deck] submitting:", data)
    setSubmitError(null)
    createMutation.mutate(data)
  }

  const onSubmitInvalid = (errors: unknown) => {
    console.warn("[create deck] validation failed:", errors)
    const errs = errors as Record<string, { message?: string }>
    const messages = Object.entries(errs)
      .map(([k, v]) => v?.message)
      .filter(Boolean)
    setSubmitError(messages.length ? messages.join(" · ") : "Please fill all required fields.")
  }

  const decks = decksData?.data || []
  const languages = languagesData?.data || []
  const languagesById = Object.fromEntries(languages.map((l) => [l.id, l]))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Decks</h1>
          <p className="text-muted-foreground mt-1">
            Manage your flashcard collections
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            New Deck
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Deck</DialogTitle>
              <DialogDescription>
                Create a new flashcard deck to start learning.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit, onSubmitInvalid)}
                className="space-y-4"
                noValidate
              >
                {submitError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive"
                  >
                    {submitError}
                  </div>
                )}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., German Food Vocabulary" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief description of this deck..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="sourceLanguageId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From</FormLabel>
                        <Select
                          items={languageItems(languages)}
                          value={field.value || null}
                          onValueChange={(v) => field.onChange(v ?? "")}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {languages.map((lang) => (
                              <SelectItem key={lang.id} value={lang.id}>
                                {lang.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="targetLanguageId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>To</FormLabel>
                        <Select
                          items={languageItems(languages)}
                          value={field.value || null}
                          onValueChange={(v) => field.onChange(v ?? "")}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {languages.map((lang) => (
                              <SelectItem key={lang.id} value={lang.id}>
                                {lang.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="visibility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Visibility</FormLabel>
                      <Select
                        items={{ private: "Private", public: "Public" }}
                        value={field.value || null}
                        onValueChange={(v) => field.onChange(v ?? "")}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="private">Private</SelectItem>
                          <SelectItem value="public">Public</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createMutation.isPending}
                  onClick={() => {
                    console.log("[create deck] submit clicked, form state:", form.getValues())
                  }}
                >
                  {createMutation.isPending ? "Creating..." : "Create Deck"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {decksLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <DeckCardSkeleton key={i} />
          ))}
        </div>
      ) : decks.length === 0 ? (
        <DeckCardEmptyState
          title="No decks yet"
          description="Create your first deck to start learning"
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Deck
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((deck) => {
            const sourceName = languagesById[deck.sourceLanguageId]?.name
            const targetName = languagesById[deck.targetLanguageId]?.name
            return (
              <DeckCard
                key={deck.id}
                deck={deck}
                href={`/decks/${deck.id}`}
                languageNames={{
                  source: sourceName,
                  target: targetName,
                }}
                showHoverStudy
                onStudy={(deckId) => router.push(`/study?deckId=${deckId}`)}
                actions={
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        />
                      }
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => router.push(`/decks/${deck.id}`)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      {deck.visibility === "private" ? (
                        <DropdownMenuItem
                          onClick={() => publishMutation.mutate(deck.id)}
                        >
                          <Globe className="mr-2 h-4 w-4" />
                          Publish
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => unpublishMutation.mutate(deck.id)}
                        >
                          <Lock className="mr-2 h-4 w-4" />
                          Make Private
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => deleteMutation.mutate(deck.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                }
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
