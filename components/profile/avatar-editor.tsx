"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"

import {
  Dialog,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { AvatarPicker } from "@/components/profile/avatar-picker"

type AvatarEditorProps = {
  avatarUrl: string | null
  defaultAvatarUrl: string | null
  displayName: string | null
  email: string | null
  className?: string
}

function initialsFrom(
  name: string | null | undefined,
  email: string | null | undefined
): string {
  const cleaned = (name ?? "").trim()
  if (cleaned) {
    const parts = cleaned.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return parts[0].slice(0, 2).toUpperCase()
  }
  const handle = (email ?? "").split("@")[0] ?? ""
  return handle.slice(0, 2).toUpperCase() || "?"
}

export function AvatarEditor({
  avatarUrl,
  defaultAvatarUrl,
  displayName,
  email,
  className,
}: AvatarEditorProps) {
  const [open, setOpen] = useState(false)
  const initials = initialsFrom(displayName, email)
  const alt = displayName?.trim() || email?.split("@")[0] || "Your avatar"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label="Change avatar"
            className={
              "group relative h-20 w-20 shrink-0 overflow-hidden rounded-full ring-2 ring-paper transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:opacity-50" +
              (className ? ` ${className}` : "")
            }
          />
        }
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={alt}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-ember/12 font-display text-2xl text-ember">
            {initials}
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-ink/0 transition-colors group-hover:bg-ink/50 group-focus-visible:bg-ink/50">
          <Pencil className="h-5 w-5 text-paper opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
        </span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogCloseButton />
        <DialogHeader>
          <DialogTitle>Change your avatar</DialogTitle>
          <DialogDescription>
            Pick a generated avatar from DiceBear or paste a custom URL. Reset
            restores your account picture.
          </DialogDescription>
        </DialogHeader>
        <AvatarPicker
          currentAvatarUrl={avatarUrl}
          defaultAvatarUrl={defaultAvatarUrl}
        />
      </DialogContent>
    </Dialog>
  )
}
