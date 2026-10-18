"use client"

import { useQuery } from "@tanstack/react-query"

import { queryKeys } from "@/hooks/query-keys"
import type { ApiResponse } from "@/lib/api/response"
import type { FavoritesData } from "@/lib/queries/favorites"

export async function fetchFavorites(): Promise<FavoritesData | null> {
  const res = await fetch("/api/v1/favorites")
  if (res.status === 401) return null
  if (!res.ok) throw new Error("Failed to load favorites")
  const body: ApiResponse<FavoritesData> = await res.json()
  if (!body.data) return null
  return body.data
}

export function useFavoritesQuery() {
  return useQuery({
    queryKey: queryKeys.favorites(),
    queryFn: fetchFavorites,
  })
}
