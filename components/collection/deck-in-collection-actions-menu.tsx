"use client"

import { Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type DeckInCollectionActionsMenuProps = {
  deckTitle: string
  onEdit?: () => void
  onRemove?: () => void
  removing?: boolean
  triggerClassName?: string
}

export function DeckInCollectionActionsMenu({
  deckTitle,
  onEdit,
  onRemove,
  removing,
  triggerClassName,
}: DeckInCollectionActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Actions for ${deckTitle}`}
            className={cn("h-8 w-8", triggerClassName)}
            disabled={removing}
          />
        }
      >
        {removing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MoreHorizontal className="h-4 w-4" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {onEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit deck
          </DropdownMenuItem>
        )}
        {onRemove && (
          <DropdownMenuItem
            className="text-destructive"
            onClick={onRemove}
            disabled={removing}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove from collection
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
