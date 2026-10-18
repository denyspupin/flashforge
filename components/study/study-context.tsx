"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import { MAX_SESSION_DURATION_MS } from "@/lib/constants"

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
  getDurationMs: () => number
}

type StudyMeta = {
  sessionId: string
  initialStreak?: number
  initialDurationMs?: number
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

const FLUSH_INTERVAL_MS = 30_000

type StudyProviderProps = {
  sessionId: string
  deck: StudyDeckInfo
  cards: StudyCard[]
  initialStreak?: number
  initialDurationMs?: number
  exitHref: string
  children: ReactNode
}

export function StudyProvider({
  sessionId,
  deck,
  cards,
  initialStreak,
  initialDurationMs,
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

  const durationRef = useRef({
    base: initialDurationMs ?? 0,
    accumulated: 0,
    runStart: null as number | null,
  })

  const currentDurationMs = useCallback(() => {
    const d = durationRef.current
    const counted =
      d.base +
      d.accumulated +
      (d.runStart !== null &&
      typeof document !== "undefined" &&
      document.visibilityState === "visible"
        ? Date.now() - d.runStart
        : 0)
    return Math.round(Math.min(MAX_SESSION_DURATION_MS, Math.max(0, counted)))
  }, [])

  const pauseDuration = useCallback(() => {
    const d = durationRef.current
    if (d.runStart !== null) {
      d.accumulated += Math.max(0, Date.now() - d.runStart)
      d.runStart = null
    }
  }, [])

  const flushDuration = useCallback(
    (durationMs: number) => {
      void fetch(`/api/v1/study/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationMs }),
        keepalive: true,
      }).catch(() => {})
    },
    [sessionId]
  )

  const getDurationMs = useCallback(
    () => currentDurationMs(),
    [currentDurationMs]
  )

  const handleExit = useCallback(() => {
    flushDuration(currentDurationMs())
    router.push(exitHref)
  }, [router, exitHref, flushDuration, currentDurationMs])

  const handleBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else {
      router.push(exitHref)
    }
  }, [router, exitHref])

  useEffect(() => {
    if (document.visibilityState === "visible") {
      durationRef.current.runStart = Date.now()
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        pauseDuration()
        flushDuration(currentDurationMs())
      } else {
        durationRef.current.runStart = Date.now()
      }
    }

    const onPageHide = () => {
      pauseDuration()
      navigator.sendBeacon?.(
        `/api/v1/study/${sessionId}`,
        new Blob([JSON.stringify({ durationMs: currentDurationMs() })], {
          type: "application/json",
        })
      )
    }

    const interval = setInterval(() => {
      if (useStudyStore.getState().phase === "done") return
      flushDuration(currentDurationMs())
    }, FLUSH_INTERVAL_MS)

    document.addEventListener("visibilitychange", onVisibilityChange)
    window.addEventListener("pagehide", onPageHide)

    return () => {
      clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisibilityChange)
      window.removeEventListener("pagehide", onPageHide)
      pauseDuration()
    }
  }, [sessionId, pauseDuration, flushDuration, currentDurationMs])

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
      actions: { flip, answer, reset, handleBack, handleExit, getDurationMs },
      meta: { sessionId, initialStreak, initialDurationMs },
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
      getDurationMs,
      sessionId,
      initialStreak,
      initialDurationMs,
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
