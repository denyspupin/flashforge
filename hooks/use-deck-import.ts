"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/hooks/query-keys"
import type { ImportRequest } from "@/lib/export-schema"

export type ImportDeckResult = {
  deckId: string
  mode: "new" | "existing"
  cardsCreated: number
}

async function importDeck(
  request: ImportRequest
): Promise<{ data: ImportDeckResult }> {
  const res = await fetch("/api/v1/decks/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null
    const message = body?.error?.message ?? "Failed to import deck"
    throw new Error(message)
  }
  return res.json()
}

export function useDeckImport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: importDeck,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.decks() })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() })
      if (result?.data?.deckId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.deck(result.data.deckId),
        })
      }
    },
  })
}
