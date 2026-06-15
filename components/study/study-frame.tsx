"use client"

import { ArrowLeft, X } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { CardFront, CardBack, FlipCard } from "@/components/card"
import { StudyProgress } from "@/components/study/study-progress"
import { StudyControls } from "@/components/study/study-controls"
import { useStudyContext } from "@/components/study/study-context"

export function StudyFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 sm:gap-8 lg:max-w-3xl">
      {children}
    </div>
  )
}

export function StudyHeader() {
  const {
    state: { deck },
    actions: { handleBack, handleExit },
  } = useStudyContext()

  return (
    <div className="flex items-center justify-between">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          aria-label="Go back"
          className="h-11 w-11 sm:h-9 sm:w-9 shrink-0 text-ink/60 hover:bg-ink/5 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="truncate font-display text-base font-medium tracking-tight text-ink sm:text-lg">
          {deck.title}
        </h1>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleExit}
        className="text-ink/60 hover:bg-ink/5 hover:text-ink"
      >
        <X className="mr-1.5 h-4 w-4" />
        <span className="hidden sm:inline">Exit</span>
      </Button>
    </div>
  )
}

export function StudyProgressBar({ withStreak = false }: { withStreak?: boolean }) {
  const {
    state: { phase, position, total },
    meta: { initialStreak },
  } = useStudyContext()

  return (
    <StudyProgress
      phase={phase}
      position={position}
      total={total}
      {...(withStreak && initialStreak !== undefined ? { streak: initialStreak } : {})}
    />
  )
}

export function StudyCardArea() {
  const {
    state: { current, flipped, deck },
    actions: { flip },
  } = useStudyContext()

  if (!current) return null

  const cardData = {
    front: current.front,
    back: current.back,
    source: deck.sourceLanguage,
    target: deck.targetLanguage,
    sourceFlag: deck.sourceLanguageFlag,
    targetFlag: deck.targetLanguageFlag,
  }

  return (
    <div className="relative">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="perspective-1000 mx-auto aspect-[5/6] w-full max-w-[420px] sm:max-w-[480px] lg:max-w-[560px]"
        >
          <FlipCard
            flipped={flipped}
            onFlip={flip}
            front={<CardFront data={cardData} size="lg" />}
            back={<CardBack data={cardData} size="lg" />}
            className="h-full"
          />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export function StudyActionControls() {
  const {
    state: { flipped, isLast, phase },
    actions: { flip, answer },
  } = useStudyContext()

  return (
    <StudyControls
      flipped={flipped}
      onFlip={flip}
      onAnswer={answer}
      isLast={isLast}
      phase={phase}
    />
  )
}

export function StudyHint() {
  return (
    <div className="hidden items-center justify-center gap-3 font-mono-tag text-[10px] uppercase tracking-widest text-ink/40 sm:flex">
      <span>Space to flip</span>
      <span className="h-1 w-1 rounded-full bg-ink/20" />
      <span>1 fail · 2 pass</span>
    </div>
  )
}
