"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { BookOpen, Sparkles } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

type StartResponse = {
  data: {
    session: { id: string }
  }
}

async function startSession(deckId: string): Promise<StartResponse> {
  const res = await fetch("/api/v1/study", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deck_id: deckId }),
  })
  if (!res.ok) throw new Error("Failed to start session")
  return res.json()
}

export default function StudyIndexPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const deckId = searchParams.get("deckId")

  const startMutation = useMutation({
    mutationFn: (id: string) => startSession(id),
    onSuccess: (res) => {
      router.replace(`/study/${res.data.session.id}`)
    },
  })

  useEffect(() => {
    if (deckId && !startMutation.isPending && !startMutation.data) {
      startMutation.mutate(deckId)
    }
  }, [deckId, startMutation])

  if (deckId) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <motion.div
          className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-ember/12"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <Sparkles
            className="h-7 w-7 text-ember"
            strokeWidth={1.75}
          />
        </motion.div>
        <h1 className="font-display text-2xl font-medium text-ink">
          Lighting the forge…
        </h1>
        <p className="mt-2 text-ink/65">
          Preparing your cards and shuffling the deck.
        </p>
        {startMutation.isError && (
          <p className="mt-4 text-sm text-destructive">
            Couldn’t start the session. Try again from your deck.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center text-center">
      <motion.div
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-ember/12"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <BookOpen className="h-7 w-7 text-ember" strokeWidth={1.75} />
      </motion.div>
      <h1 className="font-display text-2xl font-medium text-ink">
        Pick a deck to study
      </h1>
      <p className="mt-2 text-ink/65">
        Open any of your decks and tap <span className="font-medium text-ink">Study</span> to
        begin a session.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/decks">
          <Button className="h-11 rounded-full bg-ink px-6 text-paper hover:bg-ink/90">
            Go to my decks
          </Button>
        </Link>
        <Link href="/explore">
          <Button
            variant="ghost"
            className="h-11 rounded-full px-5 text-ink/75 hover:bg-ink/5 hover:text-ink"
          >
            Explore community
          </Button>
        </Link>
      </div>
    </div>
  )
}
