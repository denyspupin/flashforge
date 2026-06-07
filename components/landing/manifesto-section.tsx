"use client"

import { Reveal } from "./reveal"

export function ManifestoSection() {
  return (
    <section className="relative border-b border-ink/8 py-32 sm:py-44">
      <div className="mx-auto max-w-2xl px-6 text-center lg:px-10">
        <Reveal>
          <div className="font-mono-tag text-[10px] uppercase tracking-[0.3em] text-ink/45">
            An editorial
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <blockquote
            className="mt-10 font-display text-[clamp(1.5rem,2.8vw,2.1rem)] font-normal leading-[1.4] tracking-[-0.02em] text-balance text-ink"
            style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 60" }}
          >
            <span className="text-ember/80">&ldquo;</span>
            We don&rsquo;t believe in streaks that shame you, in notifications
            that beg, in algorithms that pick your next word for you. A
            vocabulary workshop is a quiet place. Show up, flip the card, find
            the word you were missing. Do that enough, and a language becomes
            yours.
            <span className="text-ember/80">&rdquo;</span>
          </blockquote>
        </Reveal>

        <Reveal delay={0.3}>
          <div className="mt-10 inline-flex items-center gap-3">
            <div className="h-px w-8 bg-ink/20" />
            <span className="font-mono-tag text-[10px] uppercase tracking-[0.25em] text-ink/45">
              The FlashForge team
            </span>
            <div className="h-px w-8 bg-ink/20" />
          </div>
        </Reveal>
      </div>
    </section>
  )
}
