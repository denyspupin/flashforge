"use client"

import { useRef, useState } from "react"
import { FileUp, Upload, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useDeckImport } from "@/hooks/use-deck-import"
import { importPayloadSchema, type ImportPayload } from "@/lib/export-schema"
import { DECK_EXPORT } from "@/lib/constants"
import type { Deck, Language } from "@/types/deck"

type ImportMode = "new" | "existing"

type ImportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  userDecks: Deck[]
  languages: Language[]
}

function formatZodError(error: unknown): string {
  if (error && typeof error === "object" && "issues" in error) {
    const issues = (error as { issues: { path?: unknown[]; message?: string }[] })
      .issues
    if (Array.isArray(issues) && issues.length) {
      return issues
        .map((i) => {
          const path = Array.isArray(i.path) ? i.path.join(".") : "payload"
          return `${path}: ${i.message ?? "invalid"}`
        })
        .join(" · ")
    }
  }
  return "File is not a valid FlashForge deck export."
}

function languageName(
  code: string,
  languages: Language[]
): string {
  return (
    languages.find((l) => l.code === code)?.name ?? code
  )
}

export function ImportDialog({
  open,
  onOpenChange,
  userDecks,
  languages,
}: ImportDialogProps) {
  const [parsed, setParsed] = useState<ImportPayload | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [mode, setMode] = useState<ImportMode>("new")
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const importMutation = useDeckImport()

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setParseError(null)
    setParsed(null)
    setFileName(file.name)
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const result = importPayloadSchema.safeParse(json)
      if (!result.success) {
        setParseError(formatZodError(result.error))
        return
      }
      setParsed(result.data)
    } catch (err) {
      setParseError(
        err instanceof SyntaxError
          ? "File is not valid JSON."
          : "Could not read the file."
      )
    }
  }

  const reset = () => {
    setParsed(null)
    setFileName(null)
    setParseError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const canSubmit =
    parsed !== null &&
    !importMutation.isPending &&
    (mode === "new" || Boolean(selectedDeckId))

  const compatibleDecks = parsed
    ? userDecks.filter(
        (d) =>
          languages.find((l) => l.id === d.sourceLanguageId)?.code ===
            parsed.deck.sourceLanguage &&
          languages.find((l) => l.id === d.targetLanguageId)?.code ===
            parsed.deck.targetLanguage
      )
    : []

  const submit = () => {
    if (!parsed) return
    if (mode === "existing" && !selectedDeckId) return
    importMutation.mutate(
      mode === "new"
        ? { payload: parsed, target: { mode: "new" } }
        : {
            payload: parsed,
            target: { mode: "existing", deckId: selectedDeckId! },
          },
      {
        onSuccess: () => {
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogCloseButton />
        <DialogHeader>
          <DialogTitle>Import Deck</DialogTitle>
          <DialogDescription>
            Load a deck from a FlashForge export file. Imported decks are
            private by default.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="import-file"
              className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-muted/30 px-4 py-6 text-sm transition-colors hover:bg-muted/50"
            >
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {fileName ?? "Choose a .json file to import"}
              </span>
            </label>
            <input
              id="import-file"
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={onPickFile}
              className="sr-only"
            />
            {fileName && (
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span className="truncate">{fileName}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={reset}
                  className="h-6 px-2"
                >
                  <X className="mr-1 h-3 w-3" />
                  Clear
                </Button>
              </div>
            )}
          </div>

          {parseError && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive"
            >
              {parseError}
            </div>
          )}

          {parsed && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <div className="font-medium">{parsed.deck.title}</div>
                {parsed.deck.description && (
                  <div className="mt-1 text-muted-foreground">
                    {parsed.deck.description}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    {languageName(parsed.deck.sourceLanguage, languages)} →{" "}
                    {languageName(parsed.deck.targetLanguage, languages)}
                  </span>
                  <span>{parsed.cards.length} cards</span>
                  {parsed.deck.topics.length > 0 && (
                    <span>Topics: {parsed.deck.topics.join(", ")}</span>
                  )}
                </div>
                {parsed.cards.length === 0 && (
                  <div className="mt-2 text-xs text-amber-600">
                    This file contains no cards. The new deck will be empty.
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Import target</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("new")
                      setSelectedDeckId(null)
                    }}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      mode === "new"
                        ? "border-foreground/30 bg-foreground/5"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="font-medium">New deck</div>
                    <div className="text-xs text-muted-foreground">
                      Use the file&rsquo;s title and language pair
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("existing")}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      mode === "existing"
                        ? "border-foreground/30 bg-foreground/5"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="font-medium">Add to existing</div>
                    <div className="text-xs text-muted-foreground">
                      Append cards to a matching deck
                    </div>
                  </button>
                </div>

                {mode === "existing" && (
                  <div className="pt-1">
                    {compatibleDecks.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No existing decks match this language pair (
                        {languageName(parsed.deck.sourceLanguage, languages)} →{" "}
                        {languageName(parsed.deck.targetLanguage, languages)}
                        ).
                      </p>
                    ) : (
                      <Select
                        items={Object.fromEntries(
                          compatibleDecks.map((d) => [d.id, d.title])
                        )}
                        value={selectedDeckId}
                        onValueChange={(v) => setSelectedDeckId(v ?? null)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose a deck" />
                        </SelectTrigger>
                        <SelectContent>
                          {compatibleDecks.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}
              </div>

              {parsed.cards.length > DECK_EXPORT.MAX_IMPORT_CARDS && (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive"
                >
                  File contains {parsed.cards.length} cards (max{" "}
                  {DECK_EXPORT.MAX_IMPORT_CARDS}).
                </div>
              )}
            </div>
          )}

          {importMutation.isError && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive"
            >
              {importMutation.error instanceof Error
                ? importMutation.error.message
                : "Import failed. Try again."}
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancel
          </DialogClose>
          <Button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
          >
            {importMutation.isPending ? (
              "Importing…"
            ) : (
              <>
                <FileUp className="mr-2 h-4 w-4" />
                Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
