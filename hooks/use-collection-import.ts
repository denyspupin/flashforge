"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/hooks/query-keys"
import type { CollectionImportRequest } from "@/lib/export-schema"

export type ImportCollectionResult = {
  collectionId: string
  decksCreated: number
  cardsCreated: number
}

async function importCollection(
  request: CollectionImportRequest
): Promise<{ data: ImportCollectionResult }> {
  const res = await fetch("/api/v1/collections/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null
    const message = body?.error?.message ?? "Failed to import collection"
    throw new Error(message)
  }
  return res.json()
}

export function useCollectionImport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: importCollection,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections() })
      if (result?.data?.collectionId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.collection(result.data.collectionId),
        })
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.decks() })
    },
  })
}
