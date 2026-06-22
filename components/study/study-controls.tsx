"use client"

import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"

type StudyControlsProps = {
  flipped: boolean
  onFlip: () => void
  onAnswer: (correct: boolean) => void
  isLast: boolean
}

export function StudyControls({
  flipped,
  onFlip,
  onAnswer,
  isLast,
}: StudyControlsProps) {
  if (!flipped) {
    return (
      <div className="flex w-full items-center justify-center">
        <Button
          onClick={onFlip}
          size="lg"
          className="h-12 sm:h-12 rounded-full bg-ink px-8 sm:px-8 text-[15px] text-paper shadow-[0_8px_30px_-12px_rgba(0,0,0,0.5)] transition-all hover:bg-ink/90"
        >
          Reveal answer
        </Button>
      </div>
    )
  }

  const nextLabel = isLast ? "Finish session" : "Next card"

  return (
    <div className="grid w-full grid-cols-2 gap-3">
      <Button
        onClick={() => onAnswer(false)}
        size="lg"
        variant="outline"
        className="h-14 sm:h-14 rounded-2xl border-2 border-destruct/40 bg-paper text-[15px] text-ink hover:border-destructive hover:bg-destructive/5 hover:text-destructive"
      >
        <X className="mr-2 h-4 w-4" strokeWidth={2.5} />
        Missed it
      </Button>
      <Button
        onClick={() => onAnswer(true)}
        size="lg"
        className="h-14 sm:h-14 rounded-2xl bg-forest text-[15px] text-paper hover:bg-forest/90"
      >
        <Check className="mr-2 h-4 w-4" strokeWidth={2.5} />
        {nextLabel}
      </Button>
    </div>
  )
}
