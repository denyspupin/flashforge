"use client"

import Link from "next/link"
import {
  BookOpen,
  Copy,
  Globe,
  Lock,
  Play,
  Sparkles,
} from "lucide-react"
import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Deck } from "@/types/deck"

type DeckCardProps = {
  deck: Deck
  href: string
  languageNames?: { source?: string; target?: string }
  footerLeft?: ReactNode
  actions?: ReactNode
  badges?: ReactNode
  onStudy?: (deckId: string) => void
  className?: string
}

function DeckCard({
  deck,
  href,
  languageNames,
  footerLeft,
  actions,
  badges,
  onStudy,
  className,
}: DeckCardProps) {
  const hasLanguagePair = languageNames?.source && languageNames?.target
  const hasStudyAction = Boolean(onStudy)
  const renderedBadges = badges ?? <DefaultDeckBadges deck={deck} />

  return (
    <Card
      className={cn(
        "group relative flex h-full flex-col gap-3 py-5 transition-shadow hover:shadow-md focus-within:shadow-md",
        className,
      )}
    >
      <Link
        href={href}
        aria-label={`Open ${deck.title}`}
        className="absolute inset-0 z-0 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
      <CardHeader className="relative z-10 px-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="font-mono-tag text-[10px] uppercase tracking-widest text-ink/45">
              {hasLanguagePair ? (
                <>
                  {languageNames!.source} → {languageNames!.target}
                </>
              ) : (
                <span className="opacity-0">placeholder</span>
              )}
            </div>
            <CardTitle className="mt-1 line-clamp-1 text-lg">
              {deck.title}
            </CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {deck.description || "No description"}
            </CardDescription>
          </div>
          {hasStudyAction && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onStudy!(deck.id)
              }}
              aria-label={`Study ${deck.title}`}
              className="relative z-30 -mt-1 -mr-1 h-8 gap-1.5 rounded-full bg-ink px-3 text-xs font-medium text-paper shadow-sm opacity-100 transition-opacity focus-visible:opacity-100 hover:bg-ink/90 max-sm:hidden group-hover:opacity-100 group-focus-within:opacity-100 md:opacity-0"
            >
              <Play className="h-3.5 w-3.5" />
              Study
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="relative z-10 mt-auto flex flex-1 flex-col gap-4 px-5">
        <div className="flex flex-wrap items-center gap-1.5">{renderedBadges}</div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <div className="text-xs text-muted-foreground">
            {footerLeft ?? (
              <span>
                {deck.cardCount} {deck.cardCount === 1 ? "card" : "cards"}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {hasStudyAction && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  onStudy!(deck.id)
                }}
                aria-label={`Study ${deck.title}`}
                className="relative z-30 h-7 gap-1 rounded-full bg-ink px-2.5 text-[11px] font-medium text-paper sm:hidden hover:bg-ink/90"
              >
                <Play className="h-3 w-3" />
                Study
              </Button>
            )}
            {actions && (
              <div className="relative z-20 flex shrink-0 items-center">
                {actions}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DeckCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="px-5">
        <div className="h-3 w-20 rounded bg-muted" />
        <div className="mt-3 h-5 w-3/4 rounded bg-muted" />
        <div className="mt-2 h-3 w-full rounded bg-muted" />
        <div className="h-3 w-2/3 rounded bg-muted" />
      </CardHeader>
      <CardContent className="px-5">
        <div className="flex gap-2">
          <div className="h-5 w-16 rounded-full bg-muted" />
          <div className="h-5 w-12 rounded-full bg-muted" />
        </div>
      </CardContent>
    </Card>
  )
}

function DeckCardEmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <Card className="flex flex-col items-center justify-center p-8 text-center sm:p-12">
      <BookOpen className="text-muted-foreground mb-4 h-12 w-12" />
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-1 mb-4">{description}</p>
      {action}
    </Card>
  )
}

function VisibilityBadge({ visibility }: { visibility: Deck["visibility"] }) {
  return (
    <Badge variant={visibility === "public" ? "default" : "secondary"}>
      {visibility === "public" ? (
        <Globe className="h-3 w-3" />
      ) : (
        <Lock className="h-3 w-3" />
      )}
      {visibility === "public" ? "Public" : "Private"}
    </Badge>
  )
}

function CuratedBadge() {
  return (
    <Badge variant="highlight">
      <Sparkles className="h-3 w-3" />
      Curated
    </Badge>
  )
}

function ForkedBadge() {
  return (
    <Badge variant="outline">
      <Copy className="h-3 w-3" />
      Forked
    </Badge>
  )
}

function TopicBadges({ topics }: { topics?: Deck["topics"] }) {
  return (
    <>
      {topics?.slice(0, 2).map((topic) => (
        <Badge key={topic.id} variant="outline" className="font-normal">
          {topic.name}
        </Badge>
      ))}
    </>
  )
}

function DefaultDeckBadges({ deck }: { deck: Deck }) {
  return (
    <>
      <VisibilityBadge visibility={deck.visibility} />
      {deck.isCurated ? <CuratedBadge /> : null}
      {deck.forkedFromDeckId ? <ForkedBadge /> : null}
      <TopicBadges topics={deck.topics} />
    </>
  )
}

type DeckCardComponent = typeof DeckCard & {
  Skeleton: typeof DeckCardSkeleton
  EmptyState: typeof DeckCardEmptyState
  VisibilityBadge: typeof VisibilityBadge
  CuratedBadge: typeof CuratedBadge
  ForkedBadge: typeof ForkedBadge
  TopicBadges: typeof TopicBadges
  Badges: typeof DefaultDeckBadges
}

const DeckCardCompound: DeckCardComponent = Object.assign(DeckCard, {
  Skeleton: DeckCardSkeleton,
  EmptyState: DeckCardEmptyState,
  VisibilityBadge,
  CuratedBadge,
  ForkedBadge,
  TopicBadges,
  Badges: DefaultDeckBadges,
})

export { DeckCardCompound as DeckCard }
export { DeckCardSkeleton, DeckCardEmptyState }
export { VisibilityBadge, CuratedBadge, ForkedBadge, TopicBadges, DefaultDeckBadges }
