"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Globe, Plus, Wand2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DeckActionsMenu } from "@/components/deck/deck-actions-menu"
import {
  DeckCard,
  DeckCardEmptyState,
  DeckCardSkeleton,
} from "@/components/deck/deck-card"
import { DeckImportSection } from "@/components/deck/deck-import-section"
import { queryKeys } from "@/hooks"
import type { ImportDeckResult } from "@/hooks/use-deck-import"
import { cn } from "@/lib/utils"
import type { Deck, Language } from "@/types/deck"

type NewDeckMode = "create" | "import"

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
  const [mode, setMode] = useState<NewDeckMode>("create")
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [, startNavigate] = useTransition()

  const { data: decksData, isLoading: decksLoading } = useQuery({
    queryKey: queryKeys.decks(),
    queryFn: fetchDecks,
  })

  const { data: languagesData } = useQuery({
    queryKey: queryKeys.languages(),
    queryFn: fetchLanguages,
    staleTime: Infinity,
  })

  const createMutation = useMutation({
    mutationFn: createDeck,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.decks() })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() })
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
      queryClient.invalidateQueries({ queryKey: queryKeys.decks() })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() })
    },
  })

  const publishMutation = useMutation({
    mutationFn: publishDeck,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.decks() })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() })
    },
  })

  const unpublishMutation = useMutation({
    mutationFn: unpublishDeck,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.decks() })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() })
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

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setMode("create")
      form.reset()
      setSubmitError(null)
    }
  }

  const handleImportSuccess = (result: ImportDeckResult) => {
    setOpen(false)
    setMode("create")
    if (result.mode === "new") {
      startNavigate(() => router.push(`/decks/${result.deckId}`))
    }
  }

  const decks = decksData?.data || []
  const languages = useMemo(() => languagesData?.data ?? [], [languagesData])
  const languagesById = useMemo(
    () => Object.fromEntries(languages.map((l) => [l.id, l])),
    [languages]
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My Decks</h1>
          <p className="text-muted-foreground mt-1">
            Manage your flashcard collections
          </p>
        </div>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger render={<Button className="w-full sm:w-auto" />}>
            <Plus className="mr-2 h-4 w-4" />
            New Deck
          </DialogTrigger>
          <DialogContent className="flex max-h-[calc(100vh-2rem)] flex-col sm:max-w-[560px]">
            <DialogCloseButton />
            <DialogHeader>
              <DialogTitle>Create New Deck</DialogTitle>
              <DialogDescription>
                Create a new flashcard deck to start learning.
              </DialogDescription>
            </DialogHeader>

            <div
              className="inline-flex self-start rounded-lg border bg-muted/30 p-0.5"
              role="tablist"
              aria-label="New deck source"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "create"}
                onClick={() => setMode("create")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm transition-colors",
                  mode === "create"
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Plus className="h-3.5 w-3.5" />
                New
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "import"}
                onClick={() => setMode("import")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm transition-colors",
                  mode === "import"
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Wand2 className="h-3.5 w-3.5" />
                Generate with AI
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1 -mr-1">
              {mode === "create" ? (
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
                            <FormLabel>
                              From{" "}
                              <span className="font-normal text-muted-foreground">
                                (source language)
                              </span>
                            </FormLabel>
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
                                    {lang.flag && (
                                      <span
                                        className="text-base leading-none"
                                        aria-hidden
                                      >
                                        {lang.flag}
                                      </span>
                                    )}
                                    <span>{lang.name}</span>
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
                            <FormLabel>
                              To{" "}
                              <span className="font-normal text-muted-foreground">
                                (target language)
                              </span>
                            </FormLabel>
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
                                    {lang.flag && (
                                      <span
                                        className="text-base leading-none"
                                        aria-hidden
                                      >
                                        {lang.flag}
                                      </span>
                                    )}
                                    <span>{lang.name}</span>
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
                      render={({ field }) => {
                        const isPublic = field.value === "public"
                        return (
                          <FormItem className="flex flex-row items-center justify-between gap-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-sm">Make deck public</FormLabel>
                              <p className="text-xs text-muted-foreground">
                                Share with the community — anyone can discover, study, and fork it.
                              </p>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <Globe
                                className={cn(
                                  "h-5 w-5 transition-colors",
                                  isPublic ? "text-primary" : "text-muted-foreground/60"
                                )}
                                aria-hidden
                              />
                              <FormControl>
                                <Switch
                                  checked={isPublic}
                                  onCheckedChange={(checked) =>
                                    field.onChange(checked ? "public" : "private")
                                  }
                                />
                              </FormControl>
                            </div>
                          </FormItem>
                        )
                      }}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending ? "Creating..." : "Create Deck"}
                    </Button>
                  </form>
                </Form>
              ) : (
                <DeckImportSection
                  languages={languages}
                  userDecks={decks}
                  onSuccess={handleImportSuccess}
                />
              )}
            </div>

            <div className="flex justify-end border-t pt-3">
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancel
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {decksLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        <div className="grid grid-cols-1 gap-4 [contain:layout] sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => {
            const sourceName = languagesById[deck.sourceLanguageId]?.name
            const targetName = languagesById[deck.targetLanguageId]?.name
            const sourceFlag = languagesById[deck.sourceLanguageId]?.flag
            const targetFlag = languagesById[deck.targetLanguageId]?.flag
            return (
              <DeckCard
                key={deck.id}
                deck={deck}
                href={`/decks/${deck.id}`}
                languageNames={{
                  source: sourceName,
                  target: targetName,
                  sourceFlag,
                  targetFlag,
                }}
                onStudy={(deckId) =>
                  startNavigate(() => router.push(`/study?deckId=${deckId}`))
                }
                actions={
                  <DeckActionsMenu
                    deck={deck}
                    onEdit={() =>
                      startNavigate(() => router.push(`/decks/${deck.id}`))
                    }
                    onTogglePublish={() =>
                      deck.visibility === "private"
                        ? publishMutation.mutate(deck.id)
                        : unpublishMutation.mutate(deck.id)
                    }
                    onDelete={() => deleteMutation.mutate(deck.id)}
                  />
                }
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
