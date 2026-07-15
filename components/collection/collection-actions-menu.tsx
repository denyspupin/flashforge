"use client"

import { Globe, Lock, MoreHorizontal, Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { Collection } from "@/types/collection"

type CollectionActionsMenuProps = {
  collection: Collection
  onEdit: () => void
  onTogglePublish: () => void
  onDelete: () => void
  triggerClassName?: string
}

export function CollectionActionsMenu({
  collection,
  onEdit,
  onTogglePublish,
  onDelete,
  triggerClassName,
}: CollectionActionsMenuProps) {
  const isPrivate = collection.visibility === "private"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Collection actions"
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
        <DropdownMenuItem className="text-destructive" onClick={onDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
