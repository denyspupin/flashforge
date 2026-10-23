"use client"

import { Check, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useFollowsQuery } from "@/hooks/use-follows"
import { useToggleFollow } from "@/hooks/use-toggle-follow"
import { cn } from "@/lib/utils"

type FollowTarget = {
  deckId?: string
  collectionId?: string
}

type FollowToggleButtonProps = {
  target: FollowTarget
  className?: string
  compact?: boolean
}

function isFollowing(
  follows: NonNullable<ReturnType<typeof useFollowsQuery>["data"]>,
  target: FollowTarget
) {
  if (target.deckId) {
    return follows.followedDecks.some((deck) => deck.id === target.deckId)
  }
  if (target.collectionId) {
    return follows.followedCollections.some(
      (collection) => collection.id === target.collectionId
    )
  }
  return false
}

export function FollowToggleButton({
  target,
  className,
  compact = false,
}: FollowToggleButtonProps) {
  const { data: follows } = useFollowsQuery()
  const toggleMutation = useToggleFollow()

  const following = follows ? isFollowing(follows, target) : false

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => toggleMutation.mutate(target)}
      disabled={!follows || toggleMutation.isPending}
      className={cn(
        "shrink-0",
        compact &&
          "h-6 gap-1 rounded-md px-2 font-mono-tag text-[10px] uppercase tracking-widest sm:h-6 sm:px-2 sm:text-[10px]",
        following && "bg-primary/5 text-primary",
        className
      )}
      aria-label={following ? "Unfollow" : "Follow"}
      aria-pressed={following}
      title={following ? undefined : "Follow to keep up with updates"}
    >
      {following ? (
        <Check className={compact ? "size-3" : "h-4 w-4"} />
      ) : (
        <Plus className={compact ? "size-3" : "h-4 w-4"} />
      )}
      {following ? "Following" : "Follow"}
    </Button>
  )
}
