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
  PlusCircle,
} from "lucide-react"
import { Reveal } from "./reveal"
import { cn } from "@/lib/utils"

type Topic = {
  name: string
  slug: string
  decks: number
  icon: React.ComponentType<{ className?: string }>
  accent: "brand" | "success" | "warning" | "danger" | "neutral"
}

const TOPICS: Topic[] = [
  { name: "Food", slug: "food", decks: 124, icon: Apple, accent: "brand" },
  { name: "Travel", slug: "travel", decks: 89, icon: Plane, accent: "warning" },
  { name: "Doctor Visit", slug: "doctor-visit", decks: 32, icon: Stethoscope, accent: "danger" },
  { name: "Work Meeting", slug: "work-meeting", decks: 67, icon: Briefcase, accent: "neutral" },
  { name: "Shopping", slug: "shopping", decks: 78, icon: ShoppingBag, accent: "brand" },
  { name: "Household", slug: "household", decks: 54, icon: Home, accent: "success" },
  { name: "Animals", slug: "animals", decks: 41, icon: PawPrint, accent: "warning" },
  { name: "+ 12 more", slug: "more", decks: 0, icon: PlusCircle, accent: "danger" },
]

const ACCENT_BG: Record<Topic["accent"], string> = {
  brand: "bg-brand-subtle text-brand-solid",
  success: "bg-success-subtle text-success-solid",
  warning: "bg-warning-subtle text-warning-solid",
  danger: "bg-danger-subtle text-danger-solid",
  neutral: "bg-secondary text-muted-foreground",
}

const ACCENT_HOVER: Record<Topic["accent"], string> = {
  brand: "group-hover:bg-brand-solid group-hover:text-brand-solid-foreground",
  success: "group-hover:bg-success-solid group-hover:text-success-solid-foreground",
  warning: "group-hover:bg-warning-solid group-hover:text-warning-solid-foreground",
  danger: "group-hover:bg-danger-solid group-hover:text-danger-solid-foreground",
  neutral: "group-hover:bg-foreground group-hover:text-background",
}

export function TopicsSection() {
  const reduce = useReducedMotion()
  return (
    <section
      id="topics"
      className="relative border-b border-border py-24 sm:py-32"
    >
      <div className="relative z-10 mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid items-end gap-10 sm:grid-cols-[1fr_auto]">
          <div>
            <Reveal>
              <div className="font-mono text-[11px] font-medium uppercase tracking-[0.3em] text-brand-solid">
                — Topics in the workshop
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="mt-4 max-w-2xl text-[clamp(2rem,4vw,3.2rem)] font-semibold leading-[1] tracking-tight text-foreground">
                Curated subjects, for any moment.
              </h2>
            </Reveal>
          </div>
          <Reveal delay={0.2}>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
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
                  className="group relative block overflow-hidden rounded-2xl border border-border bg-card/70 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-surface-raised"
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
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {topic.decks} decks
                      </span>
                    )}
                  </div>
                  <h3 className="mt-5 text-xl font-semibold leading-tight tracking-tight text-foreground">
                    {topic.name}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {topic.decks > 0
                      ? "Ready to study"
                      : "More subjects, all the time"}
                  </p>

                  <div className="absolute bottom-4 right-4 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="text-2xl font-semibold text-muted-foreground/60">
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