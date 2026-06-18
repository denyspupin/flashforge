"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/hooks/query-keys"

export type AddDecksToCollectionResult = {
  added: string[]
  addedCount: number
}

async function addDecksToCollection(
  collectionId: string,
  deckIds: string[]
): Promise<{ data: AddDecksToCollectionResult }> {
  const res = await fetch(`/api/v1/collections/${collectionId}/decks/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deckIds }),
  })
  const body = (await res.json().catch(() => null)) as
    | { data?: AddDecksToCollectionResult; error?: { message?: string } }
    | null
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? "Failed to add decks")
  }
  return { data: body.data }
}

export function useAddDecksToCollection(collectionId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (deckIds: string[]) =>
      addDecksToCollection(collectionId, deckIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collection(collectionId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.collections() })
    },
  })
}
