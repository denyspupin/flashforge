"use client"

import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { useEffect, useState } from "react"
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

  useEffect(() => {
    if (reduce) return
    const cycle = setInterval(() => {
      setFlipped((f) => !f)
    }, 5500)
    return () => clearInterval(cycle)
  }, [reduce])

  useEffect(() => {
    if (reduce) return
    const advance = setInterval(() => {
      setIndex((i) => (i + 1) % CARDS.length)
    }, 12000)
    return () => clearInterval(advance)
  }, [reduce])

  return (
    <div className="relative w-full max-w-[460px]">
      <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-br from-honey/20 via-ember/10 to-rust/10 blur-2xl" />

      <div className="relative">
        <div
          className="perspective-1000 relative aspect-[5/6] w-full cursor-pointer"
          onClick={() => setFlipped((f) => !f)}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={`${index}-${flipped}`}
              initial={reduce ? false : { rotateY: flipped ? -180 : 180, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={reduce ? { opacity: 0 } : { rotateY: flipped ? 180 : -180, opacity: 0 }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              className="preserve-3d absolute inset-0"
            >
              {!flipped ? (
                <CardFront card={card} />
              ) : (
                <CardBack card={card} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <div className="flex gap-1.5">
            {CARDS.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setIndex(i)
                  setFlipped(false)
                }}
                className={cn(
                  "h-1 rounded-full transition-all",
                  i === index ? "w-8 bg-ink" : "w-1.5 bg-ink/20 hover:bg-ink/40",
                )}
                aria-label={`Go to card ${i + 1}`}
              />
            ))}
          </div>
          <button
            onClick={() => setFlipped((f) => !f)}
            className="font-mono-tag text-xs uppercase tracking-wider text-ink/55 transition-colors hover:text-ink"
          >
            {flipped ? "Show term" : "Reveal meaning"}
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
        <span className="font-mono-tag uppercase tracking-wider">Tap to reveal</span>
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
