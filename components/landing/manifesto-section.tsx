"use client"

import { Reveal } from "./reveal"

export function ManifestoSection() {
  return (
    <section className="relative overflow-hidden border-b border-ink/8 py-28 sm:py-40">
      <div className="relative mx-auto max-w-3xl px-6 text-center lg:px-10">
        <Reveal>
          <div className="font-mono-tag text-[10px] uppercase tracking-[0.3em] text-ember">
            — A note from the workshop
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <blockquote
            className="mt-8 font-display text-[clamp(1.6rem,3.4vw,2.6rem)] font-normal leading-[1.25] tracking-[-0.02em] text-ink"
            style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 60" }}
          >
            <span
              className="text-ember"
              style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
            >
              &ldquo;
            </span>
            We don&rsquo;t believe in streaks that shame you, in notifications
            that beg, in algorithms that pick your next word for you. A
            vocabulary workshop is a quiet place. Show up, flip the card, find
            the word you were missing. Do that enough, and a language becomes
            yours.
            <span
              className="text-ember"
              style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
            >
              &rdquo;
            </span>
          </blockquote>
        </Reveal>

        <Reveal delay={0.3}>
          <div className="mt-10 flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-ink/20" />
            <cite className="font-mono-tag not-italic text-[11px] uppercase tracking-widest text-ink/55">
              The FlashForge team
            </cite>
            <div className="h-px w-12 bg-ink/20" />
          </div>
        </Reveal>
      </div>
    </section>
  )
}
