"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { BookOpen, Globe, User } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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
}

async function fetchCommunityDecks(): Promise<{ data: Deck[] }> {
  const res = await fetch("/api/v1/community/decks")
  if (!res.ok) throw new Error("Failed to fetch decks")
  return res.json()
}

export default function ExplorePage() {
  const router = useRouter()
  const { data, isLoading } = useQuery({
    queryKey: ["community-decks"],
    queryFn: fetchCommunityDecks,
  })

  const decks = data?.data || []

  return (
    <main className="min-h-screen p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Explore Community Decks</h1>
        <p className="text-muted-foreground mt-1">
          Discover flashcard decks created by the community
        </p>
      </div>

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
          {decks.map((deck) => (
            <Card
              key={deck.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/explore/decks/${deck.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{deck.title}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-1">
                      {deck.description || "No description"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge variant="default">
                    <Globe className="mr-1 h-3 w-3" />
                    Public
                  </Badge>
                  {deck.isCurated && (
                    <Badge variant="secondary">Curated</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  )
}
