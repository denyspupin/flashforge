"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { ChevronRight, History } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import { SessionRow } from "@/components/history/session-row"
import { HistoryRowSkeleton } from "@/components/history/history-skeleton"
import { queryKeys, fetchStudyHistory } from "@/hooks"

const PANEL_LIMIT = 3

type DeckHistoryPanelProps = {
  deckId: string
}

export function DeckHistoryPanel({ deckId }: DeckHistoryPanelProps) {
  const router = useRouter()
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.studyHistory({ deckId, limit: PANEL_LIMIT }),
    queryFn: () =>
      fetchStudyHistory({ deckId, limit: PANEL_LIMIT }),
  })

  if (error) {
    return null
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 px-4 pb-2">
          <div className="flex items-center gap-2">
            <History className="text-muted-foreground h-4 w-4" />
            <p className="font-mono-tag text-[10px] uppercase tracking-widest text-muted-foreground">
              Recent sessions
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 px-4 pt-0">
          {Array.from({ length: 2 }).map((_, i) => (
            <HistoryRowSkeleton key={i} />
          ))}
        </CardContent>
      </Card>
    )
  }

  const sessions = data?.items ?? []
  const total = data?.total ?? 0

  if (total === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 px-4 pb-2">
        <div className="flex items-center gap-2">
          <History className="text-ember h-4 w-4" />
          <p className="font-mono-tag text-[10px] uppercase tracking-widest text-muted-foreground">
            Recent sessions
            <span className="text-ink/40 ml-1.5">· {total}</span>
          </p>
        </div>
        <Button
          size="xs"
          variant="ghost"
          onClick={() => router.push(`/history?deckId=${deckId}`)}
          className="text-ink/70 hover:text-ink"
        >
          View all
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 px-4 pt-0">
        {sessions.map((session) => (
          <SessionRow
            key={session.id}
            session={session}
            compact
            onStudy={() => router.push(`/study?deckId=${session.deckId}`)}
          />
        ))}
      </CardContent>
    </Card>
  )
}
