"use client"

import { FlameMark } from "./flame-mark"
import { Reveal } from "./reveal"

export function ManifestoSection() {
  return (
    <section className="relative overflow-hidden border-b border-ink/8 py-32 sm:py-44">
      <div className="pointer-events-none absolute inset-x-0 top-12 mx-auto h-px max-w-3xl bg-ink/8" />
      <div className="pointer-events-none absolute inset-x-0 bottom-12 mx-auto h-px max-w-3xl bg-ink/8" />

      <div className="relative mx-auto max-w-3xl px-6 text-center lg:px-10">
        <Reveal>
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-8 bg-ink/25" />
            <span className="font-mono-tag text-[10px] uppercase tracking-[0.3em] text-ember">
              An editorial
            </span>
            <span className="font-mono-tag text-[10px] uppercase tracking-[0.3em] text-ink/35">
              · Issue 01
            </span>
            <div className="h-px w-8 bg-ink/25" />
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="relative mt-14">
            <span
              aria-hidden
              className="pointer-events-none absolute -left-2 -top-20 select-none text-[10rem] leading-none text-ember/85 sm:-left-8 sm:-top-28 sm:text-[16rem]"
              style={{
                fontVariationSettings: "'opsz' 144, 'SOFT' 100",
                fontFamily: "var(--font-serif)",
              }}
            >
              &ldquo;
            </span>

            <blockquote
              className="relative font-display text-[clamp(1.5rem,3vw,2.3rem)] font-normal leading-[1.32] tracking-[-0.02em] text-balance text-ink"
              style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 60" }}
            >
              We don&rsquo;t believe in streaks that shame you, in
              notifications that beg, in algorithms that pick your next word
              for you. A vocabulary workshop is a quiet place. Show up, flip
              the card, find the word you were missing. Do that enough, and a
              language becomes yours.
            </blockquote>
          </div>
        </Reveal>

        <Reveal delay={0.3}>
          <div className="mt-12 flex items-center justify-center gap-3">
            <div className="h-px w-10 bg-ink/25" />
            <FlameMark className="h-3.5 w-3.5" withSparks={false} />
            <cite className="font-mono-tag not-italic text-[10px] uppercase tracking-[0.25em] text-ink/55">
              The FlashForge team
            </cite>
            <FlameMark className="h-3.5 w-3.5" withSparks={false} />
            <div className="h-px w-10 bg-ink/25" />
          </div>
        </Reveal>
      </div>
    </section>
  )
}
