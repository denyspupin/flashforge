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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useDeckImport, type ImportDeckResult } from "@/hooks/use-deck-import"
import { DECK_GENERATION_PROMPT } from "@/lib/ai-prompt"
import { importPayloadSchema, type ImportPayload } from "@/lib/export-schema"
import { DECK_EXPORT, PROMPT_TEMPLATES } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { ApiResponse } from "@/lib/api/response"
import type { AdminPrompt } from "@/lib/queries/admin-prompts"
import { queryKeys } from "@/hooks"
import type { Deck, Language } from "@/types/deck"

type DeckImportSectionProps = {
  languages: Language[]
  userDecks: Deck[]
  onSuccess: (result: ImportDeckResult) => void
}

type Source = "file" | "paste"
type TargetMode = "new" | "existing"

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
  return languages.find((l) => l.code === code)?.name ?? code
}

async function fetchActivePrompt(slug: string): Promise<AdminPrompt | null> {
  const res = await fetch(
    `/api/v1/prompts/active?slug=${encodeURIComponent(slug)}`,
  )
  if (!res.ok) return null
  const body: ApiResponse<AdminPrompt> = await res.json()
  return body.data
}

export function DeckImportSection({
  languages,
  userDecks,
  onSuccess,
}: DeckImportSectionProps) {
  const [source, setSource] = useState<Source>("paste")
  const [parsed, setParsed] = useState<ImportPayload | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [pastedText, setPastedText] = useState("")
  const [parseError, setParseError] = useState<string | null>(null)
  const [mode, setMode] = useState<TargetMode>("new")
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null)
  const [promptOpen, setPromptOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const importMutation = useDeckImport()

  const activePromptQuery = useQuery({
    queryKey: queryKeys.activePrompt(PROMPT_TEMPLATES.DECK_GENERATION_SLUG),
    queryFn: () =>
      fetchActivePrompt(PROMPT_TEMPLATES.DECK_GENERATION_SLUG),
    staleTime: Infinity,
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

  const onSourceChange = (next: Source) => {
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

  const compatibleDecks = parsed
    ? userDecks.filter(
        (d) =>
          languages.find((l) => l.id === d.sourceLanguageId)?.code ===
            parsed.deck.sourceLanguage &&
          languages.find((l) => l.id === d.targetLanguageId)?.code ===
            parsed.deck.targetLanguage
      )
    : []

  const canSubmit =
    parsed !== null &&
    !importMutation.isPending &&
    (mode === "new" || Boolean(selectedDeckId))

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
        onSuccess: (result) => {
          if (result?.data) onSuccess(result.data)
        },
      }
    )
  }

  return (
    <div className="space-y-4">
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
            htmlFor="deck-import-file"
            className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-muted/30 px-4 py-6 text-sm transition-colors hover:bg-muted/50"
          >
            <Upload className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {fileName ?? "Choose a .json file to import"}
            </span>
          </label>
          <input
            id="deck-import-file"
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
        <div className="space-y-2">
          <Textarea
            value={pastedText}
            onChange={onPasteText}
            placeholder="Paste your FlashForge deck export JSON here…"
            spellCheck={false}
            rows={10}
            className="max-h-72 min-h-40 resize-y bg-muted/30 font-mono text-xs leading-relaxed"
          />
          <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
            {pastedText && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetPaste}
                className="h-7"
              >
                <X className="mr-1 h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
        </div>
      )}

      {!parsed && (
        <div className="rounded-lg border border-primary/30 bg-primary/5">
          <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm font-medium">
            <button
              type="button"
              onClick={() => setPromptOpen((v) => !v)}
              aria-expanded={promptOpen}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
            >
              <Wand2 className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">Generate a deck with AI</span>
              <span className="ml-1 rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                Prompt included
              </span>
              <ChevronDown
                className={cn(
                  "ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                  promptOpen && "rotate-180"
                )}
              />
            </button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyPrompt}
              disabled={activePromptQuery.isLoading}
              className="h-7 px-2.5"
            >
              <Copy className="mr-1.5 h-3 w-3" />
              {copied ? "Copied!" : "Copy prompt"}
            </Button>
          </div>
          {promptOpen && (
            <div className="space-y-2 border-t border-primary/20 px-3 py-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Paste this prompt into any AI chat (ChatGPT, Claude, Gemini…)
                  and ask it to generate a deck for you. Save the AI&rsquo;s
                  JSON response as a <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">.json</code>{" "}
                  file and import it above.
                </p>
                {promptVersion !== null ? (
                  <span className="text-muted-foreground shrink-0 rounded-md bg-ink/5 px-1.5 py-0.5 font-mono text-[10px]">
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
                  Showing the built-in default. Admins can change this under
                  Admin → Prompts.
                </p>
              ) : null}
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
        <div className="space-y-3">
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
              <span>
                {parsed.cards.length}{" "}
                {parsed.cards.length === 1 ? "card" : "cards"}
              </span>
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
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  mode === "new"
                    ? "border-foreground/30 bg-foreground/5"
                    : "hover:bg-muted/50"
                )}
              >
                <div className="font-medium">New deck</div>
                <div className="text-xs text-muted-foreground">
                  Use the file&rsquo;s title and language pair
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMode("existing")}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  mode === "existing"
                    ? "border-foreground/30 bg-foreground/5"
                    : "hover:bg-muted/50"
                )}
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
                    {languageName(parsed.deck.targetLanguage, languages)}).
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

      <Button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className="w-full"
      >
        {importMutation.isPending ? (
          "Importing…"
        ) : (
          <>
            <FileUp className="mr-2 h-4 w-4" />
            {mode === "existing" ? "Add to deck" : "Import Deck"}
          </>
        )}
      </Button>
    </div>
  )
}
