"use client"

import { motion, useReducedMotion } from "framer-motion"
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

const CARDS = [
  {
    front: "déjà vu",
    back: "the feeling that one has lived through the present moment before",
    source: "French",
    target: "English",
    topic: "Concepts",
  },
  {
    front: "gemütlichkeit",
    back: "a state of warmth, friendliness, and belonging",
    source: "German",
    target: "English",
    topic: "Feelings",
  },
  {
    front: "saudade",
    back: "a deep, melancholic longing for something or someone absent",
    source: "Portuguese",
    target: "English",
    topic: "Feelings",
  },
  {
    front: "hygge",
    back: "a quality of coziness and comfortable conviviality",
    source: "Danish",
    target: "English",
    topic: "Lifestyle",
  },
]

export function FlashcardPreview() {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const reduce = useReducedMotion()
  const card = CARDS[index]
  const isFirst = index === 0
  const isLast = index === CARDS.length - 1

  function goTo(i: number) {
    setIndex(i)
    setFlipped(false)
  }

  return (
    <div className="relative w-full max-w-[460px]">
      <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-br from-honey/20 via-ember/10 to-rust/10 blur-2xl" />

      <div className="relative">
        <div className="mb-4 flex items-center justify-between text-xs">
          <span className="font-mono-tag uppercase tracking-wider text-ink/45">
            {card.source} → {card.target}
          </span>
          <span className="font-mono-tag text-ink/55">
            {String(index + 1).padStart(2, "0")} / {String(CARDS.length).padStart(2, "0")}
          </span>
        </div>

        <div className="perspective-1000 relative aspect-[5/6] w-full">
          <motion.div
            className="preserve-3d relative h-full w-full"
            initial={false}
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={
              reduce
                ? { duration: 0 }
                : { duration: 0.9, ease: [0.16, 1, 0.3, 1] }
            }
          >
            <div className="backface-hidden absolute inset-0">
              <CardFront card={card} />
            </div>
            <div
              className="backface-hidden absolute inset-0"
              style={{ transform: "rotateY(180deg)" }}
            >
              <CardBack card={card} />
            </div>
          </motion.div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => goTo((index - 1 + CARDS.length) % CARDS.length)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink/55 transition-colors hover:bg-ink/5 hover:text-ink"
              aria-label="Previous card"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => goTo((index + 1) % CARDS.length)}
              disabled={isLast}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-ink/55 transition-colors hover:bg-ink/5 hover:text-ink",
                isLast && "opacity-30 hover:bg-transparent hover:text-ink/55",
              )}
              aria-label="Next card"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <span className="ml-2 font-mono-tag text-[10px] uppercase tracking-wider text-ink/45">
              {isFirst ? "Try the first" : isLast ? "Last card" : `${CARDS.length - index - 1} to go`}
            </span>
          </div>

          <button
            onClick={() => setFlipped((f) => !f)}
            className={cn(
              "group inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-mono-tag text-[11px] uppercase tracking-wider transition-all",
              flipped
                ? "border-ink/15 bg-paper text-ink/65 hover:border-ink/30 hover:text-ink"
                : "border-ink bg-ink text-paper hover:bg-ink/85",
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

function CardFront({
  card,
}: {
  card: (typeof CARDS)[number]
}) {
  return (
    <div className="ink-stamp flex h-full w-full flex-col justify-between rounded-[2rem] bg-paper p-8 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)]">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono-tag text-[10px] uppercase tracking-widest text-ink/45">
            {card.source} → {card.target}
          </div>
          <div className="mt-1 font-mono-tag text-[10px] uppercase tracking-widest text-ember">
            {card.topic}
          </div>
        </div>
        <div className="font-display text-3xl text-ink/15">&ldquo;</div>
      </div>

      <div className="flex flex-1 items-center justify-center px-2">
        <h3
          className="text-balance text-center font-display text-[2.6rem] font-medium leading-[1.05] tracking-tight text-ink"
          style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 60" }}
        >
          {card.front}
        </h3>
      </div>

      <div className="flex items-center justify-between text-xs text-ink/45">
        <span className="font-mono-tag uppercase tracking-wider">Press reveal to see meaning</span>
        <div className="flex items-center gap-1">
          <span className="h-1 w-1 rounded-full bg-ink/30" />
          <span className="h-1 w-1 rounded-full bg-ink/30" />
          <span className="h-1 w-1 rounded-full bg-ink/30" />
        </div>
      </div>
    </div>
  )
}

function CardBack({
  card,
}: {
  card: (typeof CARDS)[number]
}) {
  return (
    <div className="ink-stamp flex h-full w-full flex-col justify-between rounded-[2rem] bg-ink p-8 text-paper shadow-[0_30px_80px_-30px_rgba(0,0,0,0.4)]">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono-tag text-[10px] uppercase tracking-widest text-paper/55">
            Definition · {card.target}
          </div>
          <div className="mt-1 font-mono-tag text-[10px] uppercase tracking-widest text-honey">
            {card.topic}
          </div>
        </div>
        <div className="font-display text-3xl text-paper/20">&ldquo;</div>
      </div>

      <div className="flex flex-1 items-center">
        <p className="text-pretty font-display text-[1.7rem] font-normal leading-[1.25] tracking-tight text-paper" style={{ fontVariationSettings: "'opsz' 100, 'SOFT' 50" }}>
          {card.back}
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-paper/10 pt-4 text-xs text-paper/55">
        <span className="font-mono-tag uppercase tracking-wider">{card.source}</span>
        <span
          className="font-display-soft italic"
          style={{ fontVariationSettings: "'opsz' 30, 'SOFT' 100" }}
        >
          {card.front}
        </span>
      </div>
    </div>
  )
}
