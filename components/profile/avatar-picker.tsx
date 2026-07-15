"use client"

import { useState } from "react"
import Image from "next/image"
import { useQueryClient } from "@tanstack/react-query"
import { Check, Link2, RefreshCw, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { queryKeys } from "@/hooks"
import { cn } from "@/lib/utils"

const DICEBEAR_STYLES = [
  "avataaars",
  "bottts",
  "fun-emoji",
  "lorelei",
  "micah",
  "personas",
  "thumbs",
  "shapes",
] as const

const GRID_SIZE = 12

type AvatarOption = {
  style: (typeof DICEBEAR_STYLES)[number]
  seed: string
  url: string
}

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10)
}

function buildOptions(): AvatarOption[] {
  const seen = new Set<string>()
  const options: AvatarOption[] = []

  while (options.length < GRID_SIZE) {
    const style =
      DICEBEAR_STYLES[Math.floor(Math.random() * DICEBEAR_STYLES.length)]
    const seed = randomSeed()
    const key = `${style}-${seed}`
    if (seen.has(key)) continue
    seen.add(key)
    options.push({
      style,
      seed,
      url: `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`,
    })
  }

  return options
}

function detectDicebear(url: string | null): { style: string; seed: string } | null {
  if (!url) return null
  const match = url.match(
    /^https?:\/\/api\.dicebear\.com\/9\.x\/([^/]+)\/svg\?seed=([^&]+)/i,
  )
  if (!match) return null
  return { style: match[1], seed: decodeURIComponent(match[2]) }
}

type AvatarPickerProps = {
  currentAvatarUrl: string | null
  defaultAvatarUrl: string | null
}

export function AvatarPicker({
  currentAvatarUrl,
  defaultAvatarUrl,
}: AvatarPickerProps) {
  const queryClient = useQueryClient()
  const [options, setOptions] = useState<AvatarOption[]>(() => buildOptions())
  const [selected, setSelected] = useState<string | null>(currentAvatarUrl)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCustom, setShowCustom] = useState(false)
  const [customUrl, setCustomUrl] = useState("")

  const matchesDefault =
    defaultAvatarUrl !== null && selected === defaultAvatarUrl

  async function persist(nextUrl: string | null, key: string) {
    setSavingKey(key)
    setError(null)
    setSelected(nextUrl)

    try {
      const res = await fetch("/api/v1/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: nextUrl }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        const code = body?.error?.code
        if (code === "VALIDATION_ERROR") {
          setError("That URL isn’t valid. Use a full http(s) link.")
        } else {
          setError("Couldn’t save your avatar. Try again.")
        }
        setSelected(currentAvatarUrl)
        return
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.me() })
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile() })
    } catch (e) {
      console.error("[avatar] save failed:", e)
      setError("Network error. Try again.")
      setSelected(currentAvatarUrl)
    } finally {
      setSavingKey(null)
    }
  }

  function handleShuffle() {
    setOptions(buildOptions())
  }

  function handleCustomSave() {
    const trimmed = customUrl.trim()
    if (!trimmed) return
    void persist(trimmed, `custom:${trimmed}`)
    setCustomUrl("")
    setShowCustom(false)
  }

  function handleReset() {
    if (defaultAvatarUrl === null) return
    void persist(null, "reset")
  }

  const currentDicebear = detectDicebear(selected)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {options.map((option) => {
          const isSelected = selected === option.url
          const isSaving = savingKey === option.url
          return (
            <button
              key={option.url}
              type="button"
              onClick={() => persist(option.url, option.url)}
              disabled={savingKey !== null}
              aria-label={`Use ${option.style} avatar ${option.seed}`}
              aria-pressed={isSelected}
              className={cn(
                "group relative aspect-square overflow-hidden rounded-lg bg-muted/40 ring-1 ring-ink/10 transition-all hover:ring-2 hover:ring-ember/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                isSelected && "ring-2 ring-ember",
              )}
            >
              <Image
                src={option.url}
                alt=""
                fill
                unoptimized
                className="object-cover"
              />
              {isSelected ? (
                <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ember text-paper shadow-sm">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              ) : null}
              {isSaving ? (
                <span className="absolute inset-0 flex items-center justify-center bg-paper/60">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-ember border-t-transparent" />
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleShuffle}
          disabled={savingKey !== null}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Shuffle
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowCustom((s) => !s)}
          disabled={savingKey !== null}
          aria-expanded={showCustom}
        >
          <Link2 className="h-3.5 w-3.5" />
          Custom URL
        </Button>
        {selected !== null && !matchesDefault ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={savingKey !== null || defaultAvatarUrl === null}
            title={
              defaultAvatarUrl === null
                ? "No account picture to reset to"
                : "Restore your account picture"
            }
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to account picture
          </Button>
        ) : null}
      </div>

      {showCustom ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="url"
            placeholder="https://api.dicebear.com/9.x/avataaars/svg?seed=alex"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleCustomSave()
              }
            }}
            disabled={savingKey !== null}
            autoFocus
          />
          <Button
            type="button"
            onClick={handleCustomSave}
            disabled={!customUrl.trim() || savingKey !== null}
          >
            Save
          </Button>
        </div>
      ) : null}

      {currentDicebear ? (
        <p className="text-muted-foreground text-xs">
          Selected: <span className="font-mono-tag">{currentDicebear.style}</span>{" "}
          · seed{" "}
          <span className="font-mono-tag">{currentDicebear.seed}</span>
        </p>
      ) : null}
    </div>
  )
}
