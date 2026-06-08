"use client"

import Link from "next/link"
import {
  BookOpen,
  Copy,
  Globe,
  Lock,
  Sparkles,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
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
  footerLeft?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function DeckCard({
  deck,
  href,
  languageNames,
  footerLeft,
  actions,
  className,
}: DeckCardProps) {
  const hasLanguagePair = languageNames?.source && languageNames?.target
  const showTopics = (deck.topics?.length ?? 0) > 0
  const showForkedBadge = Boolean(deck.forkedFromDeckId)

  return (
    <Card
      className={cn(
        "group flex h-full flex-col gap-3 py-5 transition-shadow hover:shadow-md",
        className,
      )}
    >
      <CardHeader className="px-5">
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
            <Link
              href={href}
              className="mt-1 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              <CardTitle className="line-clamp-1 text-lg">{deck.title}</CardTitle>
              <CardDescription className="mt-1 line-clamp-2">
                {deck.description || "No description"}
              </CardDescription>
            </Link>
          </div>
        </div>
      </CardHeader>

      <CardContent className="mt-auto flex flex-1 flex-col gap-4 px-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={deck.visibility === "public" ? "default" : "secondary"}>
            {deck.visibility === "public" ? (
              <Globe className="mr-1 h-3 w-3" />
            ) : (
              <Lock className="mr-1 h-3 w-3" />
            )}
            {deck.visibility === "public" ? "Public" : "Private"}
          </Badge>
          {deck.isCurated && (
            <Badge variant="secondary">
              <Sparkles className="mr-1 h-3 w-3" />
              Curated
            </Badge>
          )}
          {showForkedBadge && (
            <Badge variant="outline">
              <Copy className="mr-1 h-3 w-3" />
              Forked
            </Badge>
          )}
          {deck.topics?.slice(0, 2).map((topic) => (
            <Badge key={topic.id} variant="outline" className="font-normal">
              {topic.name}
            </Badge>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <div className="text-xs text-muted-foreground">
            {footerLeft ?? (
              <span>
                {deck.cardCount} {deck.cardCount === 1 ? "card" : "cards"}
              </span>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center">{actions}</div>}
        </div>
      </CardContent>
    </Card>
  )
}

export function DeckCardSkeleton() {
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

export function DeckCardEmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <Card className="flex flex-col items-center justify-center p-12 text-center">
      <BookOpen className="text-muted-foreground mb-4 h-12 w-12" />
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-1 mb-4">{description}</p>
      {action}
    </Card>
  )
}
