"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Wand2 } from "lucide-react"

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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CollectionCard,
  CollectionCardEmptyState,
  CollectionCardSkeleton,
} from "@/components/collection/collection-card"
import { CollectionActionsMenu } from "@/components/collection/collection-actions-menu"
import { CollectionImportSection } from "@/components/collection/collection-import-section"
import { queryKeys } from "@/hooks"
import { cn } from "@/lib/utils"
import type { Collection } from "@/types/collection"
import type { Language } from "@/types/deck"

type NewCollectionMode = "create" | "import"

const createCollectionSchema = z.object({
  title: z.string().min(1, "Title is required").max(256),
  description: z.string().optional(),
  sourceLanguageId: z.string().uuid("Select a source language"),
  targetLanguageId: z.string().uuid("Select a target language"),
})

type CreateCollectionInput = z.infer<typeof createCollectionSchema>

const languageItems = (languages: Language[]) =>
  Object.fromEntries(languages.map((l) => [l.id, l.name]))

async function fetchCollections(): Promise<{ data: Collection[] }> {
  const res = await fetch("/api/v1/collections")
  if (!res.ok) throw new Error("Failed to fetch collections")
  return res.json()
}

async function fetchLanguages(): Promise<{ data: Language[] }> {
  const res = await fetch("/api/v1/languages")
  if (!res.ok) throw new Error("Failed to fetch languages")
  return res.json()
}

async function createCollection(
  data: CreateCollectionInput
): Promise<{ data: Collection }> {
  const res = await fetch("/api/v1/collections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Failed to create collection")
  return res.json()
}

async function deleteCollection(id: string): Promise<void> {
  const res = await fetch(`/api/v1/collections/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Failed to delete collection")
}

export default function CollectionList() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<NewCollectionMode>("create")
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { data: collectionsData, isLoading } = useQuery({
    queryKey: queryKeys.collections(),
    queryFn: fetchCollections,
  })

  const { data: languagesData } = useQuery({
    queryKey: queryKeys.languages(),
    queryFn: fetchLanguages,
    staleTime: Infinity,
  })

  const createMutation = useMutation({
    mutationFn: createCollection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections() })
      setOpen(false)
      setMode("create")
      form.reset()
      setSubmitError(null)
    },
    onError: (error) => {
      setSubmitError(
        error instanceof Error ? error.message : "Couldn’t create the collection. Try again."
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCollection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections() })
    },
  })

  const form = useForm<CreateCollectionInput>({
    resolver: zodResolver(createCollectionSchema),
    defaultValues: {
      title: "",
      description: "",
      sourceLanguageId: "",
      targetLanguageId: "",
    },
  })

  const onSubmit = (data: CreateCollectionInput) => {
    setSubmitError(null)
    createMutation.mutate(data)
  }

  const onSubmitInvalid = (errors: unknown) => {
    const errs = errors as Record<string, { message?: string }>
    const messages = Object.entries(errs)
      .map(([, v]) => v?.message)
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

  const handleImportSuccess = (collectionId: string) => {
    setOpen(false)
    setMode("create")
    router.push(`/collections/${collectionId}`)
  }

  const collections = collectionsData?.data || []
  const languages = languagesData?.data || []
  const languagesById = Object.fromEntries(languages.map((l) => [l.id, l]))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            My Collections
          </h1>
          <p className="text-muted-foreground mt-1">
            Group related decks together — like a full German B1 study set.
          </p>
        </div>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger render={<Button className="w-full sm:w-auto" />}>
            <Plus className="mr-2 h-4 w-4" />
            New Collection
          </DialogTrigger>
          <DialogContent className="flex max-h-[calc(100vh-2rem)] flex-col sm:max-w-[560px]">
            <DialogCloseButton />
            <DialogHeader>
              <DialogTitle>Create New Collection</DialogTitle>
              <DialogDescription>
                Collections group decks that share a language pair.
              </DialogDescription>
            </DialogHeader>

            <div
              className="inline-flex self-start rounded-lg border bg-muted/30 p-0.5"
              role="tablist"
              aria-label="New collection source"
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
                            <Input placeholder="e.g., German B1 Vocabulary" {...field} />
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
                              placeholder="What does this collection cover?"
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
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending ? "Creating..." : "Create Collection"}
                    </Button>
                  </form>
                </Form>
              ) : (
                <CollectionImportSection
                  languages={languages}
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

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <CollectionCardSkeleton key={i} />
          ))}
        </div>
      ) : collections.length === 0 ? (
        <CollectionCardEmptyState
          title="No collections yet"
          description="Group related decks into a collection to study them together."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Collection
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => {
            const sourceName = languagesById[collection.sourceLanguageId]?.name
            const targetName = languagesById[collection.targetLanguageId]?.name
            const sourceFlag = languagesById[collection.sourceLanguageId]?.flag
            const targetFlag = languagesById[collection.targetLanguageId]?.flag
            return (
              <CollectionCard
                key={collection.id}
                collection={collection}
                href={`/collections/${collection.id}`}
                languageNames={{
                  source: sourceName,
                  target: targetName,
                  sourceFlag,
                  targetFlag,
                }}
                actions={
                  <CollectionActionsMenu
                    collection={collection}
                    onEdit={() => router.push(`/collections/${collection.id}`)}
                    onDelete={() => deleteMutation.mutate(collection.id)}
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
