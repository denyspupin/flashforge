"use client"

import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react"
import { useState } from "react"
import { CardFront, CardBack, FlipCard } from "@/components/card"
import { cn } from "@/lib/utils"

const SAMPLE_CARDS = [
  {
    front: "déjà vu",
    back: "the feeling that one has lived through the present moment before",
    source: "French",
    target: "English",
    sourceFlag: "🇫🇷",
    targetFlag: "🇬🇧",
    topic: "Concepts",
  },
  {
    front: "gemütlichkeit",
    back: "a state of warmth, friendliness, and belonging",
    source: "German",
    target: "English",
    sourceFlag: "🇩🇪",
    targetFlag: "🇬🇧",
    topic: "Feelings",
  },
  {
    front: "saudade",
    back: "a deep, melancholic longing for something or someone absent",
    source: "Portuguese",
    target: "English",
    sourceFlag: "🇧🇷",
    targetFlag: "🇬🇧",
    topic: "Feelings",
  },
  {
    front: "hygge",
    back: "a quality of coziness and comfortable conviviality",
    source: "Danish",
    target: "English",
    sourceFlag: "🇩🇰",
    targetFlag: "🇬🇧",
    topic: "Lifestyle",
  },
] as const

export function FlashcardPreview() {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const card = SAMPLE_CARDS[index]
  const isFirst = index === 0
  const isLast = index === SAMPLE_CARDS.length - 1

  function goTo(i: number) {
    setIndex(i)
    setFlipped(false)
  }

  return (
    <div className="relative w-full max-w-[460px]">
      <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-foreground/5 blur-2xl" />

      <div className="relative">
        <div className="mb-4 flex items-center justify-between font-mono text-xs uppercase tracking-wider text-muted-foreground">
          <span>
            {card.source} → {card.target}
          </span>
          <span>
            {String(index + 1).padStart(2, "0")} /{" "}
            {String(SAMPLE_CARDS.length).padStart(2, "0")}
          </span>
        </div>

        <FlipCard
          flipped={flipped}
          front={<CardFront data={card} />}
          back={<CardBack data={card} />}
          className="aspect-[5/6]"
        />

        <div className="mt-5 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => goTo((index - 1 + SAMPLE_CARDS.length) % SAMPLE_CARDS.length)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-state-hover hover:text-foreground"
              aria-label="Previous card"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => goTo((index + 1) % SAMPLE_CARDS.length)}
              disabled={isLast}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-state-hover hover:text-foreground",
                isLast && "opacity-30 hover:bg-transparent hover:text-muted-foreground",
              )}
              aria-label="Next card"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {isFirst
                ? "Try the first"
                : isLast
                  ? "Last card"
                  : `${SAMPLE_CARDS.length - index - 1} to go`}
            </span>
          </div>

          <button
            onClick={() => setFlipped((f) => !f)}
            className={cn(
              "group inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-all",
              flipped
                ? "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                : "border-foreground bg-foreground text-background hover:bg-foreground/85",
            )}
          >
            {flipped ? (
              <>
                <RotateCcw className="h-3 w-3" />
                Show term
              </>
            ) : (
              <>
                Reveal meaning
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}