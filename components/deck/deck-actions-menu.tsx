"use client"

import type { MouseEvent } from "react"
import { Globe, Lock, MoreHorizontal, Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { Deck } from "@/types/deck"

type DeckActionsMenuProps = {
  deck: Deck
  onEdit: () => void
  onTogglePublish: () => void
  onDelete: () => void
  triggerClassName?: string
}

export function DeckActionsMenu({
  deck,
  onEdit,
  onTogglePublish,
  onDelete,
  triggerClassName,
}: DeckActionsMenuProps) {
  const stop = (fn: () => void) => (e: MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    fn()
  }

  const isPrivate = deck.visibility === "private"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Deck actions"
            className={cn("h-8 w-8", triggerClassName)}
            onClick={stop(() => {})}
          />
        }
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={stop(onEdit)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={stop(onTogglePublish)}>
          {isPrivate ? (
            <>
              <Globe className="mr-2 h-4 w-4" />
              Publish
            </>
          ) : (
            <>
              <Lock className="mr-2 h-4 w-4" />
              Make Private
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive"
          onClick={stop(onDelete)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
