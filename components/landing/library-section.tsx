"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowUpRight, Users } from "lucide-react"
import { Badge } from "@/components/garn/badge"
import { Card, CardContent, CardMedia } from "@/components/garn/card"
import { Reveal } from "./reveal"

type Deck = {
  title: string
  curator: string
  from: string
  to: string
  cards: number
  forks: number
  topic: string
  featured?: boolean
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
    featured: false,
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
    preview: [
      { front: "it hurts here", back: "ça fait mal ici" },
      { front: "I'm allergic to…", back: "je suis allergique à…" },
    ],
  },
]

export function LibrarySection() {
  return (
    <section
      id="library"
      className="relative border-b border-border py-24 sm:py-32"
    >
      <div className="relative z-10 mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="mb-16 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <Reveal>
              <div className="font-mono text-[11px] font-medium uppercase tracking-[0.3em] text-brand-solid">
                — The library
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="mt-4 max-w-2xl text-[clamp(2.2rem,4.5vw,3.6rem)] font-semibold leading-[1] tracking-tight text-foreground">
                Borrow a deck.
                <br />
                Make it yours.
              </h2>
            </Reveal>
          </div>

          <Reveal delay={0.2}>
            <Link
              href="/explore"
              className="group inline-flex items-center gap-2 border-b border-border pb-1 text-sm text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
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
      <Card appearance="outline" interactive className="flex h-full flex-col">
        <CardMedia ratio={4 / 3} className="border-b border-border">
          {deck.featured && (
            <Badge
              tone="brand"
              appearance="soft"
              size="sm"
              shape="pill"
              className="absolute left-4 top-4 z-10"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-brand-solid" />
              Featured
            </Badge>
          )}

          <div className="absolute inset-0 p-5">
            <div className="flex h-full flex-col gap-2">
              {deck.preview.map((p, j) => (
                <motion.div
                  key={j}
                  initial={false}
                  animate={reduce ? {} : { y: 0 }}
                  whileHover={reduce ? {} : { y: -2 }}
                  className="rounded-lg border border-border bg-card p-2.5 shadow-sm"
                >
                  <p className="text-sm font-semibold leading-tight text-foreground">
                    {p.front}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{p.back}</p>
                </motion.div>
              ))}
              <div className="flex-1 rounded-lg border border-dashed border-border bg-card/40" />
            </div>
          </div>
        </CardMedia>

        <CardContent className="flex flex-1 flex-col">
          <div className="mb-3 flex items-center justify-between">
            <Badge tone="neutral" appearance="soft" size="sm" shape="pill">
              {deck.topic}
            </Badge>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {deck.from} → {deck.to}
            </span>
          </div>

          <h3 className="text-xl font-semibold leading-tight tracking-tight text-foreground">
            {deck.title}
          </h3>

          <div className="mt-4 flex items-center justify-between border-t border-border pt-3 font-mono text-xs text-muted-foreground">
            <span>by {deck.curator}</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {deck.forks}
              </span>
              <span>·</span>
              <span>{deck.cards} cards</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}