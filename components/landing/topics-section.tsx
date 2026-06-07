"use client"

import { useReducedMotion } from "framer-motion"
import {
  Apple,
  Plane,
  Stethoscope,
  Briefcase,
  ShoppingBag,
  Home,
  PawPrint,
  Sparkles,
} from "lucide-react"
import { Reveal } from "./reveal"
import { cn } from "@/lib/utils"

type Topic = {
  name: string
  slug: string
  decks: number
  icon: React.ComponentType<{ className?: string }>
  accent: "ember" | "forest" | "honey" | "rust" | "ink"
}

const TOPICS: Topic[] = [
  { name: "Food", slug: "food", decks: 124, icon: Apple, accent: "ember" },
  { name: "Travel", slug: "travel", decks: 89, icon: Plane, accent: "honey" },
  { name: "Doctor Visit", slug: "doctor-visit", decks: 32, icon: Stethoscope, accent: "rust" },
  { name: "Work Meeting", slug: "work-meeting", decks: 67, icon: Briefcase, accent: "ink" },
  { name: "Shopping", slug: "shopping", decks: 78, icon: ShoppingBag, accent: "ember" },
  { name: "Household", slug: "household", decks: 54, icon: Home, accent: "forest" },
  { name: "Animals", slug: "animals", decks: 41, icon: PawPrint, accent: "honey" },
  { name: "+ 12 more", slug: "more", decks: 0, icon: Sparkles, accent: "rust" },
]

const ACCENT_BG: Record<Topic["accent"], string> = {
  ember: "bg-ember/10 text-ember",
  forest: "bg-forest/15 text-forest",
  honey: "bg-honey/25 text-rust",
  rust: "bg-rust/15 text-rust",
  ink: "bg-ink/8 text-ink/70",
}

const ACCENT_HOVER: Record<Topic["accent"], string> = {
  ember: "group-hover:bg-ember group-hover:text-paper",
  forest: "group-hover:bg-forest group-hover:text-paper",
  honey: "group-hover:bg-honey group-hover:text-ink",
  rust: "group-hover:bg-rust group-hover:text-paper",
  ink: "group-hover:bg-ink group-hover:text-paper",
}

export function TopicsSection() {
  const reduce = useReducedMotion()
  return (
    <section
      id="topics"
      className="paper-warm relative border-b border-ink/8 py-24 sm:py-32"
    >
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid items-end gap-10 sm:grid-cols-[1fr_auto]">
          <div>
            <Reveal>
              <div className="font-mono-tag text-[10px] uppercase tracking-[0.3em] text-ember">
                — Topics in the workshop
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <h2
                className="mt-4 max-w-2xl font-display text-[clamp(2rem,4vw,3.2rem)] font-medium leading-[1] tracking-[-0.03em] text-ink"
                style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 60" }}
              >
                Curated subjects,{" "}
                <span
                  className="font-display-soft italic"
                  style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
                >
                  for any
                </span>{" "}
                moment.
              </h2>
            </Reveal>
          </div>
          <Reveal delay={0.2}>
            <p className="max-w-sm text-sm leading-relaxed text-ink/60">
              Pick a starting place. Every topic is a doorway — build it out
              in any direction the language takes you.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TOPICS.map((topic, i) => {
            const Icon = topic.icon
            return (
              <Reveal key={topic.slug} delay={0.05 + i * 0.05}>
                <a
                  href={`/explore?topic=${topic.slug}`}
                  className="group relative block overflow-hidden rounded-2xl border border-ink/10 bg-paper/70 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-[0_20px_40px_-20px_rgba(0,0,0,0.2)]"
                >
                  <div className="flex items-start justify-between">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-300",
                        ACCENT_BG[topic.accent],
                        ACCENT_HOVER[topic.accent],
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    {topic.decks > 0 && (
                      <span className="font-mono-tag text-[10px] uppercase tracking-wider text-ink/45">
                        {topic.decks} decks
                      </span>
                    )}
                  </div>
                  <h3
                    className="mt-5 font-display text-xl font-medium leading-tight tracking-tight text-ink"
                    style={{ fontVariationSettings: "'opsz' 60, 'SOFT' 40" }}
                  >
                    {topic.name}
                  </h3>
                  <p className="mt-1 text-xs text-ink/55">
                    {topic.decks > 0
                      ? "Ready to study"
                      : "More subjects, all the time"}
                  </p>

                  <div className="absolute bottom-4 right-4 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="font-display-soft text-2xl text-ink/40" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}>
                      →
                    </span>
                  </div>
                </a>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
