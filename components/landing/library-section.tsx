"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowUpRight, Heart, Users } from "lucide-react"
import { Reveal } from "./reveal"
import { cn } from "@/lib/utils"

type Deck = {
  title: string
  curator: string
  from: string
  to: string
  cards: number
  forks: number
  topic: string
  featured?: boolean
  hue: "ember" | "forest" | "honey" | "rust"
  preview: { front: string; back: string }[]
}

const DECKS: Deck[] = [
  {
    title: "Cafe Conversations",
    curator: "Lia M.",
    from: "English",
    to: "Spanish",
    cards: 48,
    forks: 312,
    topic: "Food",
    hue: "ember",
    featured: true,
    preview: [
      { front: "the check, please", back: "la cuenta, por favor" },
      { front: "for here or to go?", back: "¿para aquí o para llevar?" },
    ],
  },
  {
    title: "Slow German for Cooks",
    curator: "Markus R.",
    from: "English",
    to: "German",
    cards: 62,
    forks: 184,
    topic: "Travel",
    hue: "forest",
    preview: [
      { front: "kitchen", back: "die Küche" },
      { front: "to chop", back: "hacken" },
    ],
  },
  {
    title: "Tokyo Station, decoded",
    curator: "Aiko T.",
    from: "English",
    to: "Japanese",
    cards: 36,
    forks: 421,
    topic: "Travel",
    hue: "honey",
    preview: [
      { front: "north exit", back: "きたぐち" },
      { front: "platform", back: "のりば" },
    ],
  },
  {
    title: "Doctor, doucement",
    curator: "Camille B.",
    from: "English",
    to: "French",
    cards: 54,
    forks: 96,
    topic: "Doctor Visit",
    hue: "rust",
    preview: [
      { front: "it hurts here", back: "ça fait mal ici" },
      { front: "I'm allergic to…", back: "je suis allergique à…" },
    ],
  },
]

const HUE_BG: Record<Deck["hue"], string> = {
  ember: "from-ember/20 to-ember/5",
  forest: "from-forest/20 to-forest/5",
  honey: "from-honey/25 to-honey/5",
  rust: "from-rust/20 to-rust/5",
}

const HUE_BORDER: Record<Deck["hue"], string> = {
  ember: "border-ember/30",
  forest: "border-forest/25",
  honey: "border-honey/35",
  rust: "border-rust/25",
}

const HUE_CHIP: Record<Deck["hue"], string> = {
  ember: "bg-ember/15 text-ember",
  forest: "bg-forest/15 text-forest",
  honey: "bg-honey/20 text-rust",
  rust: "bg-rust/15 text-rust",
}

export function LibrarySection() {
  return (
    <section
      id="library"
      className="relative border-b border-ink/8 py-24 sm:py-32"
    >
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="mb-16 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <Reveal>
              <div className="font-mono-tag text-[10px] uppercase tracking-[0.3em] text-ember">
                — The library
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <h2
                className="mt-4 max-w-2xl font-display text-[clamp(2.2rem,4.5vw,3.6rem)] font-medium leading-[1] tracking-[-0.03em] text-ink"
                style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 60" }}
              >
                Borrow a deck.
                <br />
                <span
                  className="font-display-soft italic text-ink/80"
                  style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
                >
                  Make it yours.
                </span>
              </h2>
            </Reveal>
          </div>

          <Reveal delay={0.2}>
            <Link
              href="/explore"
              className="group inline-flex items-center gap-2 border-b border-ink/30 pb-1 text-sm text-ink/70 transition-colors hover:border-ink hover:text-ink"
            >
              Browse all 1,200+ decks
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </Reveal>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {DECKS.map((deck, i) => (
            <Reveal key={deck.title} delay={0.1 + i * 0.08}>
              <DeckCard deck={deck} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function DeckCard({ deck }: { deck: Deck }) {
  const reduce = useReducedMotion()
  return (
    <Link href="/explore" className="group block h-full">
      <article className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-ink/10 bg-paper transition-all duration-500 hover:-translate-y-1 hover:border-ink/20 hover:shadow-[0_30px_60px_-30px_rgba(0,0,0,0.25)]">
        <div className={cn("relative aspect-[4/3] overflow-hidden bg-gradient-to-br", HUE_BG[deck.hue], HUE_BORDER[deck.hue], "border-b")}>
          {deck.featured && (
            <div className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-paper px-2.5 py-1 font-mono-tag text-[10px] uppercase tracking-wider text-ink shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-ember" />
              Featured
            </div>
          )}

          <div className="absolute inset-0 p-5">
            <div className="flex h-full flex-col gap-2">
              {deck.preview.map((p, j) => (
                <motion.div
                  key={j}
                  initial={false}
                  animate={reduce ? {} : { y: 0 }}
                  whileHover={reduce ? {} : { y: -2 }}
                  className="rounded-lg border border-ink/10 bg-paper/95 p-2.5 shadow-sm"
                >
                  <p className="font-display text-sm font-medium leading-tight text-ink">
                    {p.front}
                  </p>
                  <p className="mt-0.5 text-xs text-ink/55">{p.back}</p>
                </motion.div>
              ))}
              <div className="flex-1 rounded-lg border border-dashed border-ink/15 bg-paper/40" />
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col p-5">
          <div className="mb-3 flex items-center justify-between">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                HUE_CHIP[deck.hue],
              )}
            >
              {deck.topic}
            </span>
            <span className="font-mono-tag text-[10px] uppercase tracking-wider text-ink/45">
              {deck.from} → {deck.to}
            </span>
          </div>

          <h3
            className="font-display text-xl font-medium leading-tight tracking-tight text-ink"
            style={{ fontVariationSettings: "'opsz' 60, 'SOFT' 40" }}
          >
            {deck.title}
          </h3>

          <div className="mt-4 flex items-center justify-between border-t border-ink/8 pt-3 text-xs text-ink/55">
            <span className="font-mono-tag">by {deck.curator}</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {deck.forks}
              </span>
              <span>·</span>
              <span>{deck.cards} cards</span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}
