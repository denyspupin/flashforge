"use client"

import { useRouter } from "next/navigation"
import { Flame, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type ContinueStudyingCardProps = {
  deckId: string
  deckTitle: string
  cardsReviewed: number
  cardsCorrect: number
}

export function ContinueStudyingCard({
  deckId,
  deckTitle,
  cardsReviewed,
  cardsCorrect,
}: ContinueStudyingCardProps) {
  const router = useRouter()
  const accuracy =
    cardsReviewed > 0 ? Math.round((cardsCorrect / cardsReviewed) * 100) : 0

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardDescription className="font-mono-tag text-[10px] uppercase tracking-widest">
            Continue studying
          </CardDescription>
          <CardTitle className="line-clamp-1 text-xl">{deckTitle}</CardTitle>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ember/12">
          <Flame className="h-5 w-5 text-ember" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          {cardsReviewed > 0 ? (
            <span>
              {cardsReviewed} {cardsReviewed === 1 ? "card" : "cards"} reviewed
              {cardsCorrect > 0 ? ` · ${accuracy}% accuracy` : ""}
            </span>
          ) : (
            <span>Pick up where you left off.</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/decks/${deckId}`)}
          >
            View deck
          </Button>
          <Button
            size="sm"
            onClick={() => router.push(`/study?deckId=${deckId}`)}
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Resume
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
