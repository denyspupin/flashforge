"use client";

import Link from "next/link";
import { ArrowRight, Award, Copy, Globe, Layers, Library, Lock } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/garn/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/garn/card";
import { Skeleton } from "@/components/garn/skeleton";
import { cn } from "@/lib/utils";
import type { Collection } from "@/types/collection";

type CollectionCardProps = {
  collection: Collection;
  href: string;
  languageNames?: {
    source?: string;
    target?: string;
    sourceFlag?: string;
    targetFlag?: string;
  };
  badges?: ReactNode;
  footerLeft?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

function CollectionCard({
  collection,
  href,
  languageNames,
  badges,
  footerLeft,
  actions,
  className,
}: CollectionCardProps) {
  const hasLanguagePair = languageNames?.source && languageNames?.target;
  const renderedBadges = badges ?? (
    <DefaultCollectionBadges collection={collection} />
  );

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
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-sm font-medium uppercase tracking-wider text-muted-foreground">
                {languageNames!.sourceFlag && (
                  <span className="text-base leading-none" aria-hidden>
                    {languageNames!.sourceFlag}
                  </span>
                )}
                <span>{languageNames!.source}</span>
                <span className="text-muted-foreground/50">→</span>
                {languageNames!.targetFlag && (
                  <span className="text-base leading-none" aria-hidden>
                    {languageNames!.targetFlag}
                  </span>
                )}
                <span>{languageNames!.target}</span>
              </div>
            ) : (
              <div className="font-mono text-sm font-medium uppercase tracking-wider text-muted-foreground opacity-0">
                placeholder
              </div>
            )}
            <CardTitle className="mt-1 line-clamp-1 text-lg">
              <Link
                href={href}
                className="rounded-sm outline-none transition-colors hover:text-foreground/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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

      <CardContent className="mt-auto flex flex-1 flex-col gap-4 px-5">
        {renderedBadges && (
          <div className="flex flex-wrap items-center gap-1.5">
            {renderedBadges}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {footerLeft ?? (
              <>
                <span className="inline-flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  <span>
                    {collection.deckCount}{" "}
                    {collection.deckCount === 1 ? "deck" : "decks"}
                  </span>
                </span>
                <span aria-hidden>·</span>
                <span>
                  {collection.totalCards}{" "}
                  {collection.totalCards === 1 ? "card" : "cards"}
                </span>
              </>
            )}
          </div>
          <Link
            href={href}
            aria-label={`Open ${collection.title}`}
            title="Open"
            className="inline-flex h-11 w-11 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background shadow-sm transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function CollectionCardSkeleton() {
  return (
    <Card className="py-5">
      <CardHeader className="px-5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-3 h-5 w-3/4" />
        <Skeleton className="mt-2 h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </CardHeader>
      <CardContent className="px-5">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

function CollectionCardEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center justify-center p-8 text-center sm:p-12">
      <Library className="text-muted-foreground mb-4 h-12 w-12" />
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-1 mb-4">{description}</p>
      {action}
    </Card>
  );
}

function VisibilityBadge({
  visibility,
}: {
  visibility: Collection["visibility"];
}) {
  return (
    <Badge tone={visibility === "public" ? "brand" : "neutral"}>
      {visibility === "public" ? (
        <Globe className="h-3 w-3" />
      ) : (
        <Lock className="h-3 w-3" />
      )}
      {visibility === "public" ? "Public" : "Private"}
    </Badge>
  );
}

function CuratedBadge() {
  return (
    <Badge tone="brand" appearance="solid">
      <Award className="h-3 w-3" />
      Curated
    </Badge>
  );
}

function ForkedBadge() {
  return (
    <Badge appearance="outline">
      <Copy className="h-3 w-3" />
      Forked
    </Badge>
  );
}

function DefaultCollectionBadges({ collection }: { collection: Collection }) {
  return (
    <>
      <VisibilityBadge visibility={collection.visibility} />
      {collection.isCurated ? <CuratedBadge /> : null}
      {collection.forkedFromCollectionId ? <ForkedBadge /> : null}
    </>
  );
}

type CollectionCardComponent = typeof CollectionCard & {
  Skeleton: typeof CollectionCardSkeleton;
  EmptyState: typeof CollectionCardEmptyState;
  VisibilityBadge: typeof VisibilityBadge;
  CuratedBadge: typeof CuratedBadge;
  ForkedBadge: typeof ForkedBadge;
  Badges: typeof DefaultCollectionBadges;
};

const CollectionCardCompound: CollectionCardComponent = Object.assign(
  CollectionCard,
  {
    Skeleton: CollectionCardSkeleton,
    EmptyState: CollectionCardEmptyState,
    VisibilityBadge,
    CuratedBadge,
    ForkedBadge,
    Badges: DefaultCollectionBadges,
  },
);

export { CollectionCardCompound as CollectionCard };
export { CollectionCardSkeleton, CollectionCardEmptyState };
export { VisibilityBadge, CuratedBadge, ForkedBadge, DefaultCollectionBadges };
