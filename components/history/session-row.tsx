"use client"

import { useRouter } from "next/navigation"
import {
  Check,
  ChevronRight,
  Target,
  X as XIcon,
  Zap,
} from "lucide-react"

import { Button } from "@/components/garn/button"
import { Badge } from "@/components/garn/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/garn/card"
import { formatSmartRelative } from "@/lib/format/date"
import { cn } from "@/lib/utils"

import type { HistorySession as SessionRowSession } from "@/lib/queries/study-history"

type SessionRowProps = {
  session: SessionRowSession
  showDeck?: boolean
  onStudy?: (deckId: string) => void
  compact?: boolean
}

function accuracyPct(reviewed: number, correct: number): number {
  if (reviewed <= 0) return 0
  return Math.round((correct / reviewed) * 100)
}

function accuracyTone(pct: number): "high" | "mid" | "low" {
  if (pct >= 80) return "high"
  if (pct >= 50) return "mid"
  return "low"
}

export function SessionRow({
  session,
  showDeck = false,
  onStudy,
  compact = false,
}: SessionRowProps) {
  const router = useRouter()
  const accuracy = accuracyPct(session.cardsReviewed, session.cardsCorrect)
  const tone = accuracyTone(accuracy)
  const failedCount = session.failedCardIds.length
  const study = () =>
    onStudy
      ? onStudy(session.deckId)
      : router.push(`/study?deckId=${session.deckId}`)

  const toneMap = {
    high: { tone: "success" as const, appearance: "soft" as const },
    mid: { tone: "warning" as const, appearance: "soft" as const },
    low: { tone: "danger" as const, appearance: "soft" as const },
  } as const

  return (
    <Card className={cn(compact && "ring-foreground/8")}>
      <CardHeader className="px-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            {showDeck ? (
              <p
                className="text-muted-foreground font-mono truncate text-[10px] uppercase tracking-widest"
                title={session.deck.title}
              >
                {session.deck.sourceLanguageFlag && (
                  <span className="mr-1 text-xs leading-none">
                    {session.deck.sourceLanguageFlag}
                  </span>
                )}
                {session.deck.sourceLanguage || "Unknown"} →{" "}
                {session.deck.targetLanguageFlag && (
                  <span className="mr-1 text-xs leading-none">
                    {session.deck.targetLanguageFlag}
                  </span>
                )}
                {session.deck.targetLanguage || ""}
              </p>
            ) : null}
            <CardTitle
              className={cn(
                "line-clamp-1",
                showDeck ? "text-base" : "text-sm font-medium",
              )}
            >
              {showDeck ? session.deck.title : "Study session"}
            </CardTitle>
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span title={session.completedAt ?? session.startedAt}>
                {formatSmartRelative(session.completedAt ?? session.startedAt)}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pt-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {session.cardsReviewed > 0 ? (
              <Badge
                tone={toneMap[tone].tone}
                appearance={toneMap[tone].appearance}
                size="sm"
                mono
                title={`${session.cardsCorrect} of ${session.cardsReviewed} correct`}
              >
                <Target className="h-3 w-3" />
                {accuracy}% accuracy
              </Badge>
            ) : null}
            <Badge tone="neutral" appearance="subtle" size="sm" mono>
              <Check className="h-3 w-3" />
              {session.cardsCorrect}{" "}
              {session.cardsCorrect === 1 ? "card" : "cards"} correct
            </Badge>
            {failedCount > 0 ? (
              <Badge tone="danger" appearance="subtle" size="sm" mono>
                <XIcon className="h-3 w-3" />
                {failedCount} {failedCount === 1 ? "miss" : "misses"}
              </Badge>
            ) : null}
            {session.xpAwarded > 0 ? (
              <Badge tone="brand" appearance="subtle" size="sm" mono>
                <Zap className="h-3 w-3" />
                +{session.xpAwarded} XP
              </Badge>
            ) : null}
          </div>

          <Button
            size="xs"
            variant="ghost"
            onClick={study}
            className="text-muted-foreground hover:text-foreground"
          >
            Study again
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
