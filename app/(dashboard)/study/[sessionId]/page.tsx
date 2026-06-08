"use client"

import { useQuery } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import { motion } from "framer-motion"

import { StudyPlayer } from "@/components/study"

type StudyCard = {
  id: string
  deckId: string
  front: string
  back: string
}

type SessionData = {
  session: {
    id: string
    status: "active" | "completed" | "abandoned"
  }
  deck: {
    id: string
    title: string
    sourceLanguage: string
    targetLanguage: string
  }
  cards: StudyCard[]
}

type UserData = {
  data: {
    id: string
    streak: number
  }
}

async function fetchSession(id: string): Promise<{ data: SessionData }> {
  const res = await fetch(`/api/v1/study/${id}`)
  if (!res.ok) throw new Error("Failed to load session")
  return res.json()
}

async function fetchUser(): Promise<UserData> {
  const res = await fetch("/api/v1/users/me")
  if (!res.ok) throw new Error("Failed to load user")
  return res.json()
}

export default function StudySessionPage() {
  const params = useParams()
  const sessionId = params.sessionId as string

  const sessionQuery = useQuery({
    queryKey: ["study", sessionId],
    queryFn: () => fetchSession(sessionId),
  })

  const userQuery = useQuery({
    queryKey: ["user", "me"],
    queryFn: fetchUser,
  })

  if (sessionQuery.isLoading || userQuery.isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <div className="h-6 w-48 animate-pulse rounded bg-ink/8" />
        <div className="h-1.5 w-full animate-pulse rounded-full bg-ink/8" />
        <motion.div
          className="aspect-[5/6] w-full animate-pulse rounded-[2rem] bg-ink/8"
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
        <div className="h-14 w-full animate-pulse rounded-2xl bg-ink/8" />
      </div>
    )
  }

  if (sessionQuery.error || !sessionQuery.data) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="font-display text-2xl font-medium text-ink">
          Session not found
        </h1>
        <p className="mt-2 text-ink/65">
          We couldn’t load this study session. It may have expired or been
          removed.
        </p>
      </div>
    )
  }

  const { session, deck, cards } = sessionQuery.data.data
  const streak = userQuery.data?.data.streak ?? 0

  if (session.status !== "active") {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="font-display text-2xl font-medium text-ink">
          This session is closed
        </h1>
        <p className="mt-2 text-ink/65">
          This study session is {session.status}. Start a new one from your
          deck.
        </p>
      </div>
    )
  }

  return (
    <StudyPlayer
      sessionId={session.id}
      deck={deck}
      cards={cards}
      initialStreak={streak}
    />
  )
}
