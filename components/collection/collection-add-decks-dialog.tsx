"use client"

import { useMemo, useState } from "react"
import { Check, Plus, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useAddDecksToCollection } from "@/hooks/use-add-decks-to-collection"
import { cn } from "@/lib/utils"
import type { Deck, Language } from "@/types/deck"

type CollectionAddDecksDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  collectionId: string
  sourceLanguageId: string
  targetLanguageId: string
  existingDeckIds: Set<string>
  decks: Deck[]
  languages: Language[]
}

export function CollectionAddDecksDialog({
  open,
  onOpenChange,
  collectionId,
  sourceLanguageId,
  targetLanguageId,
  existingDeckIds,
  decks,
  languages,
}: CollectionAddDecksDialogProps) {
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [lastAddedCount, setLastAddedCount] = useState<number | null>(null)

  const addMutation = useAddDecksToCollection(collectionId)

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSearch("")
      setSelected(new Set())
      setLastAddedCount(null)
      addMutation.reset()
    }
    onOpenChange(next)
  }

  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase()
    return decks.filter((d) => {
      if (existingDeckIds.has(d.id)) return false
      if (d.sourceLanguageId !== sourceLanguageId) return false
      if (d.targetLanguageId !== targetLanguageId) return false
      if (q && !d.title.toLowerCase().includes(q)) return false
      return true
    })
  }, [decks, existingDeckIds, sourceLanguageId, targetLanguageId, search])

  const toggle = (deckId: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(deckId)) next.delete(deckId)
      else next.add(deckId)
      return next
    })
  }

  const selectAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const d of candidates) next.add(d.id)
      return next
    })
  }

  const clearSelection = () => {
    setSelected(new Set())
  }

  const submit = () => {
    if (selected.size === 0) return
    addMutation.mutate(Array.from(selected), {
      onSuccess: (result) => {
        setLastAddedCount(result.data.addedCount)
        setSelected(new Set())
        setSearch("")
      },
    })
  }

  const selectedCount = selected.size
  const totalCandidates = candidates.length
  const canSubmit = selectedCount > 0 && !addMutation.isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[calc(100vh-2rem)] flex-col sm:max-w-[560px]">
        <DialogCloseButton />
        <DialogHeader>
          <DialogTitle>Add Decks to Collection</DialogTitle>
          <DialogDescription>
            Pick from your decks that match the collection&rsquo;s language
            pair.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your decks…"
            className="h-9 pl-8"
            autoFocus
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {lastAddedCount !== null && !addMutation.isError && (
          <div
            role="status"
            className="flex items-center gap-2 border-b px-1 pb-2 text-sm text-muted-foreground"
          >
            <Check className="h-3.5 w-3.5 text-primary" />
            <span>
              Added {lastAddedCount}{" "}
              {lastAddedCount === 1 ? "deck" : "decks"} to the collection.
            </span>
          </div>
        )}

        {addMutation.isError && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive"
          >
            {addMutation.error instanceof Error
              ? addMutation.error.message
              : "Couldn’t add decks. Try again."}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {totalCandidates} {totalCandidates === 1 ? "deck" : "decks"}{" "}
            available
            {selectedCount > 0 ? ` · ${selectedCount} selected` : ""}
          </span>
          {totalCandidates > 0 && selectedCount < totalCandidates && (
            <button
              type="button"
              onClick={selectAllVisible}
              className="hover:text-foreground underline-offset-2 hover:underline"
            >
              Select all
            </button>
          )}
          {selectedCount > 0 && (
            <button
              type="button"
              onClick={clearSelection}
              className="hover:text-foreground underline-offset-2 hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1 -mr-1">
          {totalCandidates === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm">
              {search ? (
                <>
                  <p className="font-medium">No matches</p>
                  <p className="text-muted-foreground mt-1">
                    No decks match &ldquo;{search}&rdquo;. Try a different
                    search.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium">No matching decks</p>
                  <p className="text-muted-foreground mt-1">
                    Create a deck with this language pair first, or pick a
                    different collection.
                  </p>
                </>
              )}
            </div>
          ) : (
            <ul className="space-y-2">
              {candidates.map((deck) => {
                const source = languages.find(
                  (l) => l.id === deck.sourceLanguageId
                )
                const target = languages.find(
                  (l) => l.id === deck.targetLanguageId
                )
                const isSelected = selected.has(deck.id)
                return (
                  <li key={deck.id}>
                    <button
                      type="button"
                      onClick={() => toggle(deck.id)}
                      aria-pressed={isSelected}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "hover:border-foreground/20 hover:bg-muted/40"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-background"
                        )}
                        aria-hidden
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {deck.title}
                        </span>
                        {deck.description && (
                          <span className="text-muted-foreground mt-0.5 block line-clamp-1 text-xs">
                            {deck.description}
                          </span>
                        )}
                        <span className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                          {source && target && (
                            <span className="font-mono-tag uppercase tracking-widest">
                              {source.flag && (
                                <span
                                  className="mr-1 text-sm leading-none"
                                  aria-hidden
                                >
                                  {source.flag}
                                </span>
                              )}
                              {source.name}
                              <span className="px-1 text-ink/30">→</span>
                              {target.flag && (
                                <span
                                  className="mr-1 text-sm leading-none"
                                  aria-hidden
                                >
                                  {target.flag}
                                </span>
                              )}
                              {target.name}
                            </span>
                          )}
                          <span aria-hidden>·</span>
                          <span>
                            {deck.cardCount}{" "}
                            {deck.cardCount === 1 ? "card" : "cards"}
                          </span>
                          {deck.topics && deck.topics.length > 0 && (
                            <>
                              <span aria-hidden>·</span>
                              <span className="truncate">
                                {deck.topics
                                  .slice(0, 3)
                                  .map((t) => t.name)
                                  .join(", ")}
                              </span>
                            </>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button type="button" onClick={submit} disabled={!canSubmit}>
            <Plus className="mr-2 h-4 w-4" />
            {addMutation.isPending
              ? "Adding…"
              : selectedCount > 0
                ? `Add ${selectedCount} ${selectedCount === 1 ? "Deck" : "Decks"}`
                : "Add Decks"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
