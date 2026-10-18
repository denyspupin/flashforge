"use client"

import { useQuery } from "@tanstack/react-query"

import { queryKeys } from "@/hooks/query-keys"
import type { ApiResponse } from "@/lib/api/response"
import type { FollowsData } from "@/lib/queries/follows"

export async function fetchFollows(): Promise<FollowsData | null> {
  const res = await fetch("/api/v1/follows")
  if (res.status === 401) return null
  if (!res.ok) throw new Error("Failed to load follows")
  const body: ApiResponse<FollowsData> = await res.json()
  if (!body.data) return null
  return body.data
}

export function useFollowsQuery() {
  return useQuery({
    queryKey: queryKeys.follows(),
    queryFn: fetchFollows,
  })
}
