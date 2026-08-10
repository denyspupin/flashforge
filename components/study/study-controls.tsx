"use client"

import { Check, X } from "lucide-react"
import { Button } from "@/components/garn/button"
import { Kbd } from "@/components/garn/kbd"

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
          className="h-14 rounded-full px-8 text-[15px] shadow-[0_8px_30px_-12px_rgba(0,0,0,0.5)]"
        >
          Reveal answer
          <span className="ml-2.5 hidden pointer-fine:inline-flex">
            <Kbd className="border-background/20 bg-background/10 text-background/85">Space</Kbd>
          </span>
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
        tone="danger"
        className="h-14 rounded-full text-[15px]"
      >
        <X className="mr-2 h-4 w-4" strokeWidth={2.5} />
        Missed it
        <span className="ml-2.5 hidden pointer-fine:inline-flex">
          <Kbd className="border-background/20 bg-background/10 text-background/85">1</Kbd>
        </span>
      </Button>
      <Button
        onClick={() => onAnswer(true)}
        size="lg"
        tone="success"
        className="h-14 rounded-full text-[15px]"
      >
        <Check className="mr-2 h-4 w-4" strokeWidth={2.5} />
        {nextLabel}
        <span className="ml-2.5 hidden pointer-fine:inline-flex">
          <Kbd className="border-background/20 bg-background/10 text-background/85">2</Kbd>
        </span>
      </Button>
    </div>
  )
}
