"use client"

import { useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  ChevronDown,
  ClipboardPaste,
  Copy,
  FileUp,
  Loader2,
  Upload,
  Wand2,
  X,
} from "lucide-react"

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
import { Textarea } from "@/components/ui/textarea"
import { useDeckImport } from "@/hooks/use-deck-import"
import { DECK_GENERATION_PROMPT } from "@/lib/ai-prompt"
import { importPayloadSchema, type ImportPayload } from "@/lib/export-schema"
import { DECK_EXPORT, PROMPT_TEMPLATES } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { ApiResponse } from "@/lib/api/response"
import type { AdminPrompt } from "@/lib/queries/admin-prompts"
import { queryKeys } from "@/hooks"
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

async function fetchActivePrompt(slug: string): Promise<AdminPrompt | null> {
  const res = await fetch(
    `/api/v1/prompts/active?slug=${encodeURIComponent(slug)}`,
  )
  if (!res.ok) return null
  const body: ApiResponse<AdminPrompt> = await res.json()
  return body.data
}

export function ImportDialog({
  open,
  onOpenChange,
  userDecks,
  languages,
}: ImportDialogProps) {
  const [source, setSource] = useState<"file" | "paste">("file")
  const [parsed, setParsed] = useState<ImportPayload | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [pastedText, setPastedText] = useState("")
  const [parseError, setParseError] = useState<string | null>(null)
  const [mode, setMode] = useState<ImportMode>("new")
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null)
  const [promptOpen, setPromptOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const importMutation = useDeckImport()

  const activePromptQuery = useQuery({
    queryKey: queryKeys.activePrompt(PROMPT_TEMPLATES.DECK_GENERATION_SLUG),
    queryFn: () =>
      fetchActivePrompt(PROMPT_TEMPLATES.DECK_GENERATION_SLUG),
    staleTime: 60_000,
  })

  const promptBody =
    activePromptQuery.data?.body ?? DECK_GENERATION_PROMPT
  const promptVersion = activePromptQuery.data?.version ?? null
  const promptSource: "remote" | "fallback" = activePromptQuery.data
    ? "remote"
    : "fallback"

  const tryParse = (text: string, readErrorMessage: string) => {
    if (!text.trim()) {
      setParseError(null)
      setParsed(null)
      return
    }
    try {
      const json = JSON.parse(text)
      const result = importPayloadSchema.safeParse(json)
      if (!result.success) {
        setParseError(formatZodError(result.error))
        setParsed(null)
      } else {
        setParseError(null)
        setParsed(result.data)
      }
    } catch (err) {
      setParseError(
        err instanceof SyntaxError ? "Not valid JSON." : readErrorMessage
      )
      setParsed(null)
    }
  }

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setParseError(null)
    setParsed(null)
    setFileName(file.name)
    try {
      const text = await file.text()
      tryParse(text, "Could not read the file.")
    } catch {
      setParseError("Could not read the file.")
    }
  }

  const onPasteText = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    setPastedText(text)
    tryParse(text, "Could not parse the text.")
  }

  const onPasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setPastedText(text)
      tryParse(text, "Could not read the clipboard content.")
    } catch {
      setParseError("Could not read the clipboard. Try pasting manually.")
    }
  }

  const onSourceChange = (next: "file" | "paste") => {
    if (next === source) return
    setSource(next)
    setParsed(null)
    setParseError(null)
    setFileName(null)
    setPastedText("")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const resetFile = () => {
    setParsed(null)
    setFileName(null)
    setParseError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const resetPaste = () => {
    setParsed(null)
    setPastedText("")
    setParseError(null)
  }

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(promptBody)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
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
      <DialogContent className="flex max-h-[calc(100vh-2rem)] flex-col sm:max-w-[520px]">
        <DialogCloseButton />
        <DialogHeader>
          <DialogTitle>Import Deck</DialogTitle>
          <DialogDescription>
            Load a deck from a FlashForge export file. Imported decks are
            private by default.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 -mr-1">
          <div
            className="inline-flex rounded-lg border bg-muted/30 p-0.5"
            role="tablist"
            aria-label="Import source"
          >
            <button
              type="button"
              role="tab"
              aria-selected={source === "file"}
              onClick={() => onSourceChange("file")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm transition-colors",
                source === "file"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Upload className="h-3.5 w-3.5" />
              File
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={source === "paste"}
              onClick={() => onSourceChange("paste")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm transition-colors",
                source === "paste"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ClipboardPaste className="h-3.5 w-3.5" />
              Paste
            </button>
          </div>

          {source === "file" ? (
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
                    onClick={resetFile}
                    className="h-6 sm:h-6 px-2 sm:px-2"
                  >
                    <X className="mr-1 h-3 w-3" />
                    Clear
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <Textarea
                value={pastedText}
                onChange={onPasteText}
                placeholder="Paste your FlashForge export JSON here…"
                spellCheck={false}
                rows={8}
                className="max-h-64 min-h-32 resize-y bg-muted/30 font-mono text-xs leading-relaxed"
              />
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onPasteFromClipboard}
                  className="h-6 sm:h-6 px-2 sm:px-2"
                >
                  <ClipboardPaste className="mr-1 h-3 w-3" />
                  Paste from clipboard
                </Button>
                {pastedText && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetPaste}
                    className="h-6 sm:h-6 px-2 sm:px-2"
                  >
                    <X className="mr-1 h-3 w-3" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          )}

          {!parsed && (
            <div className="rounded-lg border bg-muted/30">
              <button
                type="button"
                onClick={() => setPromptOpen((v) => !v)}
                aria-expanded={promptOpen}
                className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium"
              >
                <span className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-muted-foreground" />
                  Don&rsquo;t have an export file?
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    promptOpen && "rotate-180"
                  )}
                />
              </button>
              {promptOpen && (
                <div className="space-y-2 border-t px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      Copy this prompt and paste it into any AI chat. Ask it
                      to generate a deck and save the response as a .json
                      file.
                    </p>
                    {promptVersion !== null ? (
                      <span className="text-muted-foreground rounded-md bg-ink/5 px-1.5 py-0.5 font-mono text-[10px]">
                        v{promptVersion}
                      </span>
                    ) : null}
                  </div>
                  {activePromptQuery.isLoading ? (
                    <div className="text-muted-foreground flex items-center gap-2 rounded-md border bg-background p-3 text-xs">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading latest prompt…
                    </div>
                  ) : (
                    <pre className="max-h-64 overflow-auto rounded-md border bg-background p-3 font-mono text-[11px] leading-relaxed">
                      {promptBody}
                    </pre>
                  )}
                  {promptSource === "fallback" ? (
                    <p className="text-muted-foreground text-[10px]">
                      Showing the built-in default. Admins can change this
                      under Admin → Prompts.
                    </p>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyPrompt}
                    disabled={activePromptQuery.isLoading}
                  >
                    <Copy className="mr-2 h-3 w-3" />
                    {copied ? "Copied!" : "Copy prompt"}
                  </Button>
                </div>
              )}
            </div>
          )}

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
