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
        following && "bg-primary/5 text-primary",
        className
      )}
      aria-label={following ? "Unfollow" : "Follow"}
      aria-pressed={following}
      title={following ? undefined : "Follow to keep up with updates"}
    >
      {following ? (
        <Check className="h-4 w-4" />
      ) : (
        <Plus className="h-4 w-4" />
      )}
      {following ? "Following" : "Follow"}
    </Button>
  )
}
