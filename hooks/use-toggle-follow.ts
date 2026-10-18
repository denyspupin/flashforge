"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/hooks/query-keys"
import { toast } from "@/stores"

export type ToggleFollowInput = {
  deckId?: string
  collectionId?: string
}

export type ToggleFollowResult = {
  following: boolean
}

async function toggleFollow(
  input: ToggleFollowInput
): Promise<ToggleFollowResult> {
  const res = await fetch("/api/v1/follows", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  const body = (await res.json().catch(() => null)) as
    | { data?: ToggleFollowResult; error?: { message?: string } }
    | null
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? "Failed to update follows")
  }
  return body.data
}

export function useToggleFollow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: toggleFollow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.follows() })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() })
    },
    onError: (error) => {
      toast.error("Couldn't update follows", error.message)
    },
  })
}
