"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, BookOpen, MoreHorizontal, Pencil, Trash2, Copy, Globe, Lock } from "lucide-react"

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
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const createDeckSchema = z.object({
  title: z.string().min(1).max(256),
  description: z.string().optional(),
  sourceLanguageId: z.string().uuid("Select a source language"),
  targetLanguageId: z.string().uuid("Select a target language"),
  visibility: z.enum(["private", "public"]),
})

type CreateDeckInput = z.infer<typeof createDeckSchema>

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
}

interface Language {
  id: string
  name: string
  code: string
}

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
    createMutation.mutate(data)
  }

  const decks = decksData?.data || []
  const languages = languagesData?.data || []

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
          <DialogTrigger>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Deck
            </Button>
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
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
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
                          onValueChange={field.onChange}
                          defaultValue={field.value}
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
                          onValueChange={field.onChange}
                          defaultValue={field.value}
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
                        onValueChange={field.onChange}
                        defaultValue={field.value}
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
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-24 bg-muted" />
            </Card>
          ))}
        </div>
      ) : decks.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No decks yet</h3>
          <p className="text-muted-foreground mt-1 mb-4">
            Create your first deck to start learning
          </p>
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Deck
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((deck) => (
            <Card key={deck.id} className="group cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div
                    className="flex-1"
                    onClick={() => router.push(`/decks/${deck.id}`)}
                  >
                    <CardTitle className="text-lg">{deck.title}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-1">
                      {deck.description || "No description"}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
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
                </div>
              </CardHeader>
              <CardContent onClick={() => router.push(`/decks/${deck.id}`)}>
                <div className="flex items-center gap-2">
                  <Badge variant={deck.visibility === "public" ? "default" : "secondary"}>
                    {deck.visibility === "public" ? (
                      <Globe className="mr-1 h-3 w-3" />
                    ) : (
                      <Lock className="mr-1 h-3 w-3" />
                    )}
                    {deck.visibility}
                  </Badge>
                  {deck.forkedFromDeckId && (
                    <Badge variant="outline">
                      <Copy className="mr-1 h-3 w-3" />
                      Forked
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
