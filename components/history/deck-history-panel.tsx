"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { ChevronRight, History } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SessionRow } from "@/components/history/session-row"
import { HistoryRowSkeleton } from "@/components/history/history-skeleton"
import { queryKeys, fetchStudyHistory } from "@/hooks"

const PANEL_LIMIT = 3

type DeckHistoryPanelProps = {
  deckId: string
  from?: string
}

export function DeckHistoryPanel({ deckId, from = "/decks" }: DeckHistoryPanelProps) {
  const router = useRouter()
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.studyHistory({ deckId, limit: PANEL_LIMIT }),
    queryFn: () =>
      fetchStudyHistory({ deckId, limit: PANEL_LIMIT }),
  })

  if (error) {
    return null
  }

  const sessions = data?.items ?? []
  const total = data?.total ?? 0

  return (
    <section className="space-y-1">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {isLoading ? (
            <History className="text-muted-foreground h-4 w-4" />
          ) : (
            <History className="text-ember h-4 w-4" />
          )}
          <p className="font-mono-tag text-[10px] uppercase tracking-widest text-muted-foreground">
            Recent sessions
            {!isLoading && total > 0 ? (
              <span className="text-ink/40 ml-1.5">· {total}</span>
            ) : null}
          </p>
        </div>
        {!isLoading && total > 0 ? (
          <Button
            size="xs"
            variant="ghost"
            onClick={() => router.push(`/history?deckId=${deckId}`)}
            className="text-ink/70 hover:text-ink"
          >
            View all
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>

      <div className="divide-y divide-ink/6">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <HistoryRowSkeleton key={i} />
          ))
        ) : (
          sessions.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              compact
              onStudy={() =>
                router.push(
                  `/study?deckId=${session.deckId}&from=${encodeURIComponent(from)}`
                )
              }
            />
          ))
        )}
      </div>
    </section>
  )
}
