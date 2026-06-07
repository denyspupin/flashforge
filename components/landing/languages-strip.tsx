"use client"

import { useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

const PAIRS = [
  { from: "English", to: "Spanish" },
  { from: "English", to: "German" },
  { from: "English", to: "French" },
  { from: "English", to: "Japanese" },
  { from: "English", to: "Italian" },
  { from: "English", to: "Portuguese" },
  { from: "English", to: "Russian" },
  { from: "English", to: "Chinese" },
  { from: "English", to: "Korean" },
  { from: "English", to: "Dutch" },
]

export function LanguagesStrip() {
  const reduce = useReducedMotion()
  const items = [...PAIRS, ...PAIRS]

  return (
    <section className="relative overflow-hidden border-b border-ink/8 py-12">
      <div className="mb-8 flex items-center justify-center gap-3">
        <span className="font-mono-tag text-[10px] uppercase tracking-[0.25em] text-ink/45">
          Crafted in
        </span>
        <span className="h-px w-12 bg-ink/15" />
        <span className="font-mono-tag text-[10px] uppercase tracking-[0.25em] text-ink/45">
          9 languages
        </span>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-paper to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-paper to-transparent" />

        <div
          className={cn(
            "flex w-max items-center gap-12 whitespace-nowrap",
            !reduce && "animate-[marquee_40s_linear_infinite]",
          )}
          style={{
            animation: reduce ? undefined : "marquee 50s linear infinite",
          }}
        >
          {items.map((pair, i) => (
            <div
              key={i}
              className="group flex items-center gap-4 font-display text-2xl tracking-tight text-ink/80 transition-colors hover:text-ink"
            >
              <span style={{ fontVariationSettings: "'opsz' 100, 'SOFT' 30" }}>
                {pair.from}
              </span>
              <span
                className="text-xl text-ember"
                style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
              >
                →
              </span>
              <span>{pair.to}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  )
}
