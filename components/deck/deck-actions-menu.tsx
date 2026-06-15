"use client"

import {
  Download,
  Globe,
  Lock,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react"

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
  const handleExport = () => {
    const url = `/api/v1/decks/${deck.id}/export`
    const a = document.createElement("a")
    a.href = url
    a.download = ""
    a.rel = "noopener"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
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
            className={cn("h-11 w-11 sm:h-8 sm:w-8", triggerClassName)}
          />
        }
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onTogglePublish}>
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
        <DropdownMenuItem onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive" onClick={onDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
