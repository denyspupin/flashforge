"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import {
  Layers,
  Globe,
  Trophy,
  Users,
  Zap,
  ArrowRight,
} from "lucide-react"

function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="px-6 pt-24 pb-32 sm:pt-32 sm:pb-40">
        <div className="mx-auto max-w-2xl text-center">
          <FadeIn>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Master vocabulary with flashcards
            </h1>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-muted-foreground">
              Create decks, study with focus, and track your progress. Build
              habits that stick with XP and daily streaks.
            </p>
          </FadeIn>
          <FadeIn delay={0.2}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link href="/register">
                <Button size="lg" className="h-11 px-6">
                  Start Learning
                </Button>
              </Link>
              <Link href="/explore">
                <Button size="lg" variant="outline" className="h-11 px-6">
                  Browse Decks
                </Button>
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Features */}
      <section className="border-t px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-12 sm:grid-cols-3">
            <FadeIn delay={0}>
              <div className="flex flex-col items-start">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                  <Layers className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-base font-semibold">
                  Build Your Decks
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Create flashcards for any language pair. Add cards one by one
                  or in bulk.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <div className="flex flex-col items-start">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                  <Zap className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-base font-semibold">
                  Study with Focus
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Flip, self-assess, and retry missed cards. One clean session
                  at a time.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.2}>
              <div className="flex flex-col items-start">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                  <Trophy className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-base font-semibold">
                  Track Progress
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Earn XP, maintain streaks, and watch your vocabulary grow day
                  by day.
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-5xl">
          <FadeIn>
            <h2 className="text-center text-2xl font-semibold tracking-tight">
              How it works
            </h2>
          </FadeIn>

          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Create or Choose",
                desc: "Build a deck from scratch or fork one from the community. Pick your language pair.",
                icon: Globe,
              },
              {
                step: "02",
                title: "Study Cards",
                desc: "Go through cards one by one. Reveal the back, mark pass or fail, retry misses.",
                icon: Layers,
              },
              {
                step: "03",
                title: "Track & Improve",
                desc: "Sessions are saved. Come back anytime. Build your streak and earn XP.",
                icon: Trophy,
              },
            ].map((item, i) => (
              <FadeIn key={item.step} delay={i * 0.1}>
                <div className="relative">
                  <span className="text-sm font-medium text-muted-foreground">
                    {item.step}
                  </span>
                  <h3 className="mt-4 text-base font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Community */}
      <section className="border-t px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-5xl">
          <div className="grid items-center gap-12 sm:grid-cols-2">
            <FadeIn>
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                  <Users className="h-5 w-5" />
                </div>
                <h2 className="mt-5 text-2xl font-semibold tracking-tight">
                  Learn from the community
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  Browse public decks created by other learners. Fork any deck
                  to your own library and customize it. Share your collections
                  and help others learn.
                </p>
                <div className="mt-8">
                  <Link href="/explore">
                    <Button variant="outline" className="h-10 px-5">
                      Explore Decks
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.15}>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { front: "apple", back: "manzana", lang: "Spanish" },
                  { front: "hello", back: "bonjour", lang: "French" },
                  { front: "water", back: "wasser", lang: "German" },
                  { front: "cat", back: "neko", lang: "Japanese" },
                ].map((card) => (
                  <div
                    key={card.front + card.lang}
                    className="flex flex-col justify-between rounded-lg border p-4"
                  >
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {card.lang}
                      </p>
                      <p className="mt-1 text-sm font-medium">{card.front}</p>
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">
                      {card.back}
                    </p>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t px-6 py-24 sm:py-32">
        <FadeIn>
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Ready to start learning?
            </h2>
            <p className="mt-4 text-sm text-muted-foreground">
              Create your first deck in seconds. No credit card required.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/register">
                <Button size="lg" className="h-11 px-6">
                  Get Started Free
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="h-11 px-6">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <span className="text-sm font-semibold">FlashForge</span>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/explore" className="hover:text-foreground">
              Explore
            </Link>
            <Link href="/login" className="hover:text-foreground">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-foreground">
              Get Started
            </Link>
          </nav>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  )
}
