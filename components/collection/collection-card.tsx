"use client"

import Link from "next/link"
import { Library, Layers } from "lucide-react"
import type { ReactNode } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Collection } from "@/types/collection"

type CollectionCardProps = {
  collection: Collection
  href: string
  languageNames?: {
    source?: string
    target?: string
    sourceFlag?: string
    targetFlag?: string
  }
  actions?: ReactNode
  className?: string
}

function CollectionCard({
  collection,
  href,
  languageNames,
  actions,
  className,
}: CollectionCardProps) {
  const hasLanguagePair = languageNames?.source && languageNames?.target

  return (
    <Card
      className={cn(
        "group relative flex h-full flex-col gap-3 py-5 transition-shadow hover:shadow-md focus-within:shadow-md",
        className,
      )}
    >
      <CardHeader className="px-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {hasLanguagePair ? (
              <div className="flex flex-wrap items-center gap-1.5 font-mono-tag text-sm font-medium uppercase tracking-wider text-ink/70">
                {languageNames!.sourceFlag && (
                  <span className="text-base leading-none" aria-hidden>
                    {languageNames!.sourceFlag}
                  </span>
                )}
                <span>{languageNames!.source}</span>
                <span className="text-ink/30">→</span>
                {languageNames!.targetFlag && (
                  <span className="text-base leading-none" aria-hidden>
                    {languageNames!.targetFlag}
                  </span>
                )}
                <span>{languageNames!.target}</span>
              </div>
            ) : (
              <div className="font-mono-tag text-sm font-medium uppercase tracking-wider text-ink/70 opacity-0">
                placeholder
              </div>
            )}
            <CardTitle className="mt-1 line-clamp-1 text-lg">
              <Link
                href={href}
                className="rounded-sm outline-none transition-colors hover:text-ink/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {collection.title}
              </Link>
            </CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {collection.description || "No description"}
            </CardDescription>
          </div>
          {actions && (
            <div className="-mt-1 -mr-1 flex shrink-0 items-center scale-90 opacity-0 transition-[opacity,transform] duration-200 ease-out group-hover:scale-100 group-hover:opacity-100 group-focus-within:scale-100 group-focus-within:opacity-100 focus-within:scale-100 focus-within:opacity-100 [@media(hover:none)]:scale-100 [@media(hover:none)]:opacity-100">
              {actions}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="mt-auto flex flex-1 items-end justify-between gap-3 px-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            <span>
              {collection.deckCount} {collection.deckCount === 1 ? "deck" : "decks"}
            </span>
          </span>
          <span aria-hidden>·</span>
          <span>
            {collection.totalCards} {collection.totalCards === 1 ? "card" : "cards"}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function CollectionCardSkeleton() {
  return (
    <Card className="animate-pulse py-5">
      <CardHeader className="px-5">
        <div className="h-3 w-20 rounded bg-muted" />
        <div className="mt-3 h-5 w-3/4 rounded bg-muted" />
        <div className="mt-2 h-3 w-full rounded bg-muted" />
        <div className="h-3 w-2/3 rounded bg-muted" />
      </CardHeader>
      <CardContent className="px-5">
        <div className="flex gap-2">
          <div className="h-3 w-16 rounded-full bg-muted" />
          <div className="h-3 w-12 rounded-full bg-muted" />
        </div>
      </CardContent>
    </Card>
  )
}

function CollectionCardEmptyState({
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
      <Library className="text-muted-foreground mb-4 h-12 w-12" />
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-1 mb-4">{description}</p>
      {action}
    </Card>
  )
}

const CollectionCardCompound = Object.assign(CollectionCard, {
  Skeleton: CollectionCardSkeleton,
  EmptyState: CollectionCardEmptyState,
})

export { CollectionCardCompound as CollectionCard }
export { CollectionCardSkeleton, CollectionCardEmptyState }
