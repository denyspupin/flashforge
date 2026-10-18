"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/hooks/query-keys"

export type ToggleFavoriteInput = {
  deckId?: string
  collectionId?: string
}

export type ToggleFavoriteResult = {
  favorited: boolean
}

async function toggleFavorite(
  input: ToggleFavoriteInput
): Promise<ToggleFavoriteResult> {
  const res = await fetch("/api/v1/favorites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  const body = (await res.json().catch(() => null)) as
    | { data?: ToggleFavoriteResult; error?: { message?: string } }
    | null
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? "Failed to update favorites")
  }
  return body.data
}

export function useToggleFavorite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: toggleFavorite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.favorites() })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() })
    },
  })
}
