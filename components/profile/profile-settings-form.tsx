"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Check, Languages, Loader2, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Language } from "@/types"

const profileSchema = z.object({
  name: z.string().trim().max(256).optional().or(z.literal("")),
  nativeLanguageId: z.string().optional(),
})

type ProfileFormValues = z.infer<typeof profileSchema>

type UpdateProfileInput = {
  name?: string | null
  nativeLanguageId?: string | null
}

type ProfileSettingsFormProps = {
  initialName: string | null
  initialNativeLanguageId: string | null
  languages: Language[]
}

const languageItems = (languages: Language[]) =>
  Object.fromEntries(languages.map((l) => [l.id, l.name]))

export function ProfileSettingsForm({
  initialName,
  initialNativeLanguageId,
  languages,
}: ProfileSettingsFormProps) {
  const router = useRouter()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: initialName ?? "",
      nativeLanguageId: initialNativeLanguageId ?? "",
    },
  })

  useEffect(() => {
    form.reset({
      name: initialName ?? "",
      nativeLanguageId: initialNativeLanguageId ?? "",
    })
  }, [form, initialName, initialNativeLanguageId])

  const onSubmit = async (values: ProfileFormValues) => {
    setSubmitError(null)
    setSavedAt(null)

    const payload: UpdateProfileInput = {}

    const trimmedName = values.name?.trim() ?? ""
    if (trimmedName === "") {
      if (initialName) payload.name = null
    } else if (trimmedName !== (initialName ?? "")) {
      payload.name = trimmedName
    }

    const nextLanguage = values.nativeLanguageId || null
    if (nextLanguage !== initialNativeLanguageId) {
      payload.nativeLanguageId = nextLanguage
    }

    if (Object.keys(payload).length === 0) {
      setSavedAt(new Date())
      return
    }

    try {
      const res = await fetch("/api/v1/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        const code = body?.error?.code
        if (code === "NOT_FOUND") {
          setSubmitError("That language doesn’t exist anymore.")
        } else if (code === "VALIDATION_ERROR") {
          setSubmitError("Please double-check the values you entered.")
        } else {
          setSubmitError("Couldn’t save your changes. Try again.")
        }
        return
      }

      setSavedAt(new Date())
      router.refresh()
    } catch (error) {
      console.error("[profile] update failed:", error)
      setSubmitError("Network error. Try again.")
    }
  }

  const onSubmitInvalid = (errors: unknown) => {
    const errs = errors as Record<string, { message?: string }>
    const messages = Object.entries(errs)
      .map(([, v]) => v?.message)
      .filter(Boolean)
    setSubmitError(messages.length ? messages.join(" · ") : "Please fix the highlighted fields.")
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, onSubmitInvalid)}
        className="space-y-6"
        noValidate
      >
        {submitError ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive"
          >
            {submitError}
          </div>
        ) : null}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Your name"
                  autoComplete="name"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Shown across your decks, leaderboards, and community activity.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="nativeLanguageId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                <Languages className="h-3.5 w-3.5" />
                Native / primary language
              </FormLabel>
              <Select
                items={languageItems(languages)}
                value={field.value || null}
                onValueChange={(v) => field.onChange(v ?? "")}
              >
                <FormControl>
                  <SelectTrigger className="w-full sm:w-72">
                    <SelectValue placeholder="Choose a language" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.id} value={lang.id}>
                      <span className="flex items-center gap-2">
                        <span className="font-mono-tag text-[10px] uppercase tracking-widest text-ink/50">
                          {lang.code}
                        </span>
                        <span>{lang.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Used as the default source language when you build new decks.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col-reverse items-stretch gap-3 border-t border-ink/8 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <SaveStatus savedAt={savedAt} />
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="sm:w-auto"
          >
            {form.formState.isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save changes
          </Button>
        </div>
      </form>
    </Form>
  )
}

function SaveStatus({ savedAt }: { savedAt: Date | null }) {
  const [, force] = useState(0)

  useEffect(() => {
    if (!savedAt) return
    const interval = setInterval(() => force((n) => n + 1), 30_000)
    return () => clearInterval(interval)
  }, [savedAt])

  if (!savedAt) {
    return (
      <p className="text-muted-foreground text-xs">
        Changes apply to your account immediately.
      </p>
    )
  }

  return (
    <p className="flex items-center gap-1.5 text-xs text-ember">
      <Check className="h-3.5 w-3.5" />
      Saved {formatRelative(savedAt)}
    </p>
  )
}

function formatRelative(date: Date): string {
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000))
  if (seconds < 5) return "just now"
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })
}
