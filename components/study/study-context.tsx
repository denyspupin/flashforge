"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import { useShallow } from "zustand/shallow"

import {
  selectCurrentCard,
  selectIsLast,
  selectProgress,
  useStudyStore,
  type StudyCard,
  type StudyPhase,
} from "@/stores/study-store"

export type StudyDeckInfo = {
  id: string
  title: string
  sourceLanguage: string
  targetLanguage: string
  sourceLanguageFlag?: string
  targetLanguageFlag?: string
}

type StudyState = {
  deck: StudyDeckInfo
  cards: StudyCard[]
  current: StudyCard | null
  index: number
  phase: StudyPhase
  flipped: boolean
  position: number
  total: number
  isLast: boolean
}

type StudyActions = {
  flip: () => void
  answer: (correct: boolean) => void
  reset: () => void
  handleBack: () => void
  handleExit: () => void
}

type StudyMeta = {
  sessionId: string
  initialStreak?: number
}

type StudyContextValue = {
  state: StudyState
  actions: StudyActions
  meta: StudyMeta
}

const StudyContext = createContext<StudyContextValue | null>(null)

export function useStudyContext(): StudyContextValue {
  const value = useContext(StudyContext)
  if (!value) {
    throw new Error("useStudyContext must be used within a StudyProvider")
  }
  return value
}

type StudyProviderProps = {
  sessionId: string
  deck: StudyDeckInfo
  cards: StudyCard[]
  initialStreak?: number
  exitHref: string
  children: ReactNode
}

export function StudyProvider({
  sessionId,
  deck,
  cards,
  initialStreak,
  exitHref,
  children,
}: StudyProviderProps) {
  const router = useRouter()
  const init = useStudyStore((s) => s.init)
  const reset = useStudyStore((s) => s.reset)
  const flip = useStudyStore((s) => s.flip)
  const answer = useStudyStore((s) => s.answer)
  const phase = useStudyStore((s) => s.phase)
  const flipped = useStudyStore((s) => s.flipped)
  const index = useStudyStore((s) => s.index)
  const current = useStudyStore(selectCurrentCard)
  const isLast = useStudyStore(selectIsLast)
  const { position, total } = useStudyStore(useShallow(selectProgress))

  useEffect(() => {
    init(sessionId, cards)
  }, [sessionId, cards, init])

  const handleExit = useCallback(() => {
    router.push(exitHref)
  }, [router, exitHref])

  const handleBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else {
      router.push(exitHref)
    }
  }, [router, exitHref])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const s = useStudyStore.getState()
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault()
        if (s.phase !== "done") s.flip()
      } else if (e.key === "1" || e.key.toLowerCase() === "f") {
        if (s.flipped) s.answer(false)
      } else if (e.key === "2" || e.key.toLowerCase() === "j") {
        if (s.flipped) s.answer(true)
      } else if (e.key === "Escape") {
        handleExit()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [handleExit])

  const value = useMemo<StudyContextValue>(
    () => ({
      state: {
        deck,
        cards,
        current,
        index,
        phase,
        flipped,
        position,
        total,
        isLast,
      },
      actions: { flip, answer, reset, handleBack, handleExit },
      meta: { sessionId, initialStreak },
    }),
    [
      deck,
      cards,
      current,
      index,
      phase,
      flipped,
      position,
      total,
      isLast,
      flip,
      answer,
      reset,
      handleBack,
      handleExit,
      sessionId,
      initialStreak,
    ],
  )

  return <StudyContext value={value}>{children}</StudyContext>
}

type StudySummaryState = "idle" | "loading" | "ready" | "error"

type StudySummaryContextValue<T> = {
  phase: StudySummaryState
  summary: T | null
  setSummary: (summary: T | null) => void
  setPhase: (phase: StudySummaryState) => void
}

const StudySummaryContext = createContext<StudySummaryContextValue<unknown> | null>(
  null,
)

export function useStudySummary<T = unknown>(): StudySummaryContextValue<T> {
  const ctx = useContext(StudySummaryContext)
  if (!ctx) {
    throw new Error(
      "useStudySummary must be used within a StudySummaryProvider",
    )
  }
  return ctx as StudySummaryContextValue<T>
}

export function StudySummaryProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<StudySummaryState>("idle")
  const [summary, setSummary] = useState<unknown>(null)

  const value = useMemo<StudySummaryContextValue<unknown>>(
    () => ({ phase, summary, setSummary, setPhase }),
    [phase, summary],
  )

  return <StudySummaryContext value={value}>{children}</StudySummaryContext>
}
