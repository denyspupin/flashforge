"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import {
  Sparkles,
  Layers,
  GraduationCap,
  Rocket,
  Loader2,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { OnboardingStep } from "./onboarding-step"
import { OnboardingProgress } from "./onboarding-progress"
import { useOnboardingStore } from "@/stores/onboarding-store"
import { ONBOARDING } from "@/lib/constants"
import { queryKeys } from "@/hooks/query-keys"

type StepContent = {
  icon: LucideIcon
  title: string
  description: string
}

const STEPS: StepContent[] = [
  {
    icon: Sparkles,
    title: "Welcome to FlashForge",
    description:
      "Learn vocabulary with flashcards. Build decks, study smart, and track your progress.",
  },
  {
    icon: Layers,
    title: "Create & manage flashcard decks",
    description:
      "Build your own decks, import from files, or fork from the community library.",
  },
  {
    icon: GraduationCap,
    title: "Study sessions that stick",
    description:
      "Flip cards, self-grade your answers, and practice with spaced repetition.",
  },
  {
    icon: Rocket,
    title: "You\u2019re all set",
    description: "Start exploring, create your first deck, or jump into the community.",
  },
]

const TOTAL_STEPS = ONBOARDING.STEPS.length

export function OnboardingDialog() {
  const reduce = useReducedMotion()
  const queryClient = useQueryClient()
  const { stepIndex, isOpen, next, prev, skip, complete } =
    useOnboardingStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isFirst = stepIndex === 0
  const isLast = stepIndex === TOTAL_STEPS - 1
  const step = STEPS[stepIndex]

  const handleMarkOnboarded = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/v1/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboarded: true }),
      })
      if (!res.ok) {
        setError("Something went wrong. Please try again.")
        return
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.me() })
      complete()
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkip = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/v1/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboarded: true }),
      })
      if (!res.ok) {
        setError("Something went wrong. Please try again.")
        return
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.me() })
      skip()
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const transition = reduce
    ? { duration: 0 }
    : { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">
            {step.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {step.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-[220px] items-center justify-center px-2 py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={stepIndex}
              initial={{ opacity: 0, x: reduce ? 0 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: reduce ? 0 : -20 }}
              transition={transition}
              className="w-full"
            >
              <OnboardingStep
                icon={step.icon}
                title={step.title}
                description={step.description}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        <OnboardingProgress current={stepIndex} total={TOTAL_STEPS} />

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-center text-xs text-destructive"
          >
            {error}
          </p>
        ) : null}

        <DialogFooter>
          {!isFirst && !isLast ? (
            <Button
              variant="ghost"
              onClick={prev}
              disabled={isSubmitting}
            >
              Back
            </Button>
          ) : null}
          <div className="flex flex-1 items-center justify-end gap-2">
            {!isLast ? (
              <Button
                variant="ghost"
                onClick={handleSkip}
                disabled={isSubmitting}
              >
                Skip
              </Button>
            ) : null}
            {isLast ? (
              <Button onClick={handleMarkOnboarded} disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Get started
              </Button>
            ) : (
              <Button onClick={next} disabled={isSubmitting}>
                {isFirst ? "Next" : "Next"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
