"use client"

import { useQuery } from "@tanstack/react-query"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Globe, BookOpen } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface PublicCard {
  id: string
  front: string
  back: string
}

interface PublicDeck {
  id: string
  title: string
  description: string | null
  visibility: "public"
  creatorName: string
  cards: PublicCard[]
  isCurated: boolean
  createdAt: string
}

async function fetchPublicDeck(id: string): Promise<{ data: PublicDeck }> {
  const res = await fetch(`/api/v1/community/decks/${id}`)
  if (!res.ok) throw new Error("Failed to fetch deck")
  return res.json()
}

export default function PublicDeckPage() {
  const router = useRouter()
  const params = useParams()
  const deckId = params.id as string

  const { data, isLoading } = useQuery({
    queryKey: ["public-deck", deckId],
    queryFn: () => fetchPublicDeck(deckId),
  })

  const deck = data?.data

  if (isLoading) {
    return (
      <main className="min-h-screen p-6 max-w-4xl mx-auto">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mb-4" />
        <div className="h-32 bg-muted animate-pulse rounded" />
      </main>
    )
  }

  if (!deck) {
    return (
      <main className="min-h-screen p-6 max-w-4xl mx-auto">
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Deck not found</h3>
          <p className="text-muted-foreground mt-1">
            This deck might be private or does not exist
          </p>
          <Button className="mt-4" onClick={() => router.push("/explore")}>
            Back to Explore
          </Button>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push("/explore")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{deck.title}</h1>
          {deck.description && (
            <p className="text-muted-foreground mt-1">{deck.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default">
            <Globe className="mr-1 h-3 w-3" />
            Public
          </Badge>
          {deck.isCurated && <Badge variant="secondary">Curated</Badge>}
        </div>
      </div>

      <div className="mb-4 text-sm text-muted-foreground">
        By {deck.creatorName} · {deck.cards?.length || 0} cards
      </div>

      <div className="space-y-3">
        {deck.cards?.map((card) => (
          <Card key={card.id}>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Front</p>
                  <p className="font-medium">{card.front}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Back</p>
                  <p className="font-medium">{card.back}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  )
}
