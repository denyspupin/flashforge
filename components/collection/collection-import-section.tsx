"use client"

import { useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  ChevronDown,
  ClipboardPaste,
  Copy,
  FileUp,
  Layers,
  Loader2,
  Upload,
  Wand2,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useCollectionImport } from "@/hooks/use-collection-import"
import { COLLECTION_GENERATION_PROMPT } from "@/lib/ai-prompt"
import {
  collectionImportPayloadSchema,
  type CollectionImportPayload,
} from "@/lib/export-schema"
import { COLLECTION_EXPORT, PROMPT_TEMPLATES } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { ApiResponse } from "@/lib/api/response"
import type { AdminPrompt } from "@/lib/queries/admin-prompts"
import { queryKeys } from "@/hooks"
import type { Language } from "@/types/deck"

type CollectionImportSectionProps = {
  languages: Language[]
  onSuccess: (collectionId: string) => void
}

type Source = "file" | "paste"

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
  return "File is not a valid FlashForge collection export."
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

export function CollectionImportSection({
  languages,
  onSuccess,
}: CollectionImportSectionProps) {
  const [source, setSource] = useState<Source>("paste")
  const [parsed, setParsed] = useState<CollectionImportPayload | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [pastedText, setPastedText] = useState("")
  const [parseError, setParseError] = useState<string | null>(null)
  const [promptOpen, setPromptOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const importMutation = useCollectionImport()

  const activePromptQuery = useQuery({
    queryKey: queryKeys.activePrompt(
      PROMPT_TEMPLATES.COLLECTION_GENERATION_SLUG
    ),
    queryFn: () =>
      fetchActivePrompt(PROMPT_TEMPLATES.COLLECTION_GENERATION_SLUG),
    staleTime: Infinity,
  })

  const promptBody =
    activePromptQuery.data?.body ?? COLLECTION_GENERATION_PROMPT
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
      const result = collectionImportPayloadSchema.safeParse(json)
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

  const totalCards = parsed
    ? parsed.decks.reduce((sum, d) => sum + d.cards.length, 0)
    : 0

  const canSubmit = parsed !== null && !importMutation.isPending

  const submit = () => {
    if (!parsed) return
    importMutation.mutate(
      { payload: parsed },
      {
        onSuccess: (result) => {
          if (result?.data?.collectionId) {
            onSuccess(result.data.collectionId)
          }
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
            htmlFor="collection-import-file"
            className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-muted/30 px-4 py-6 text-sm transition-colors hover:bg-muted/50"
          >
            <Upload className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {fileName ?? "Choose a .json file to import"}
            </span>
          </label>
          <input
            id="collection-import-file"
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
            placeholder="Paste your FlashForge collection export JSON here…"
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
              <span className="truncate">
                Generate a collection with AI
              </span>
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
                  and ask it to generate a collection for you. Save the AI&rsquo;s
                  JSON response as a <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">.json</code> file
                  and import it above.
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
            <div className="font-medium">{parsed.collection.title}</div>
            {parsed.collection.description && (
              <div className="mt-1 text-muted-foreground">
                {parsed.collection.description}
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                {languageName(parsed.collection.sourceLanguage, languages)} →{" "}
                {languageName(parsed.collection.targetLanguage, languages)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Layers className="h-3 w-3" />
                {parsed.decks.length}{" "}
                {parsed.decks.length === 1 ? "deck" : "decks"}
              </span>
              <span>
                {totalCards} {totalCards === 1 ? "card" : "cards"}
              </span>
            </div>
            <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
              {parsed.decks.map((deck) => (
                <li key={deck.title} className="truncate">
                  · {deck.title} — {deck.cards.length}{" "}
                  {deck.cards.length === 1 ? "card" : "cards"}
                </li>
              ))}
            </ul>
          </div>

          {parsed.decks.length > COLLECTION_EXPORT.MAX_IMPORT_DECKS && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive"
            >
              File contains {parsed.decks.length} decks (max{" "}
              {COLLECTION_EXPORT.MAX_IMPORT_DECKS}).
            </div>
          )}
          {totalCards > COLLECTION_EXPORT.MAX_IMPORT_CARDS && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive"
            >
              File contains {totalCards} cards (max{" "}
              {COLLECTION_EXPORT.MAX_IMPORT_CARDS}).
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
            Import Collection
          </>
        )}
      </Button>
    </div>
  )
}
