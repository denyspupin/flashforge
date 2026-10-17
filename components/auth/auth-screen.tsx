"use client"

import Link from "next/link"
import { SignIn, SignUp } from "@clerk/nextjs"
import { Compass } from "lucide-react"

import { Wordmark } from "@/components/layout/wordmark"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { clerkAppearance } from "@/lib/clerk/appearance"

type AuthScreenTab = "sign-in" | "create-account"

const AUTH_TABS: { value: AuthScreenTab; label: string }[] = [
  { value: "sign-in", label: "Sign in" },
  { value: "create-account", label: "Create account" },
]

const screenAppearance = {
  ...clerkAppearance,
  elements: {
    rootBox: { width: "100%" },
    card: {
      backgroundColor: "transparent",
      boxShadow: "none",
      borderRadius: "0",
      padding: "0",
      margin: "0",
    },
    cardBox: {
      width: "100%",
      maxWidth: "none",
      overflow: "visible",
      backgroundColor: "transparent",
      boxShadow: "none",
      borderRadius: "0",
    },
    footer: {
      backgroundImage: "none",
      boxShadow: "none",
      border: "none",
      backgroundColor: "transparent",
    },
  },
} as const

export function AuthScreen({
  initialTab = "sign-in",
  redirectTo,
}: {
  initialTab?: AuthScreenTab
  redirectTo?: string
}) {
  const fallbackRedirectUrl = redirectTo || "/dashboard"
  const forceRedirectUrl = redirectTo

  return (
    <div className="relative flex min-h-svh items-stretch">
      <aside className="relative hidden w-[44%] flex-col overflow-hidden bg-ink p-10 text-paper lg:flex xl:p-16">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="ember-glow absolute -left-36 top-6 h-[480px] w-[480px] rounded-full blur-3xl" />
          <div
            className="absolute -right-28 bottom-[-100px] h-[340px] w-[340px] rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle, hsl(var(--honey) / 0.16), transparent 70%)",
            }}
          />
        </div>

        <Wordmark className="relative z-10 self-start text-[1.4rem] text-paper" />

        <div className="relative z-10 flex flex-1 items-center">
          <div className="max-w-md">
            <p className="font-mono-tag text-[11px] uppercase tracking-[0.28em] text-ember">
              Vocabulary workshop
            </p>
            <h1
              className="mt-5 font-display text-[clamp(2.6rem,4.4vw,4.3rem)] font-medium leading-[1.02] tracking-[-0.04em] text-paper"
              style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 50" }}
            >
              Forge your fluency, one flash{" "}
              <span className="relative inline-block">
                <span className="relative z-10">at a time.</span>
                <span
                  aria-hidden
                  className="absolute -bottom-1 left-0 right-0 h-[0.16em] rounded-full bg-ember/70"
                />
              </span>
            </h1>
            <p className="mt-7 max-w-sm text-[15px] leading-relaxed text-paper/65">
              Build decks your way, study them with focus, and let a streak of
              small sessions compound into something remarkable.
            </p>
          </div>
        </div>
      </aside>

      <main className="paper-warm relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-14 sm:px-8">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="ember-glow absolute -right-24 -top-20 h-[300px] w-[300px] rounded-full blur-3xl opacity-80" />
          <div
            className="absolute -left-24 bottom-[-40px] h-[260px] w-[260px] rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle, hsl(var(--honey) / 0.14), transparent 70%)",
            }}
          />
        </div>

        <Link
          href="/"
          className="relative z-10 mb-10 transition-opacity hover:opacity-80 lg:hidden"
        >
          <Wordmark className="text-[1.3rem]" />
        </Link>

        <div className="relative z-10 w-full max-w-[27rem]">
          <Tabs defaultValue={initialTab} className="gap-0">
            <TabsList className="mb-4 w-full">
              {AUTH_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="flex-1">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="sign-in">
              <SignIn
                routing="hash"
                fallbackRedirectUrl={fallbackRedirectUrl}
                forceRedirectUrl={forceRedirectUrl}
                appearance={screenAppearance}
              />
            </TabsContent>

            <TabsContent value="create-account">
              <SignUp
                routing="hash"
                fallbackRedirectUrl={fallbackRedirectUrl}
                forceRedirectUrl={forceRedirectUrl}
                appearance={screenAppearance}
              />
            </TabsContent>
          </Tabs>

          <div className="mt-5 flex items-center justify-center gap-1.5 text-[13px] text-ink/55">
            <span>Just browsing?</span>
            <Link
              href="/explore"
              className="group inline-flex items-center gap-1.5 rounded-md font-medium text-ink/80 transition-colors hover:text-ink"
            >
              <Compass className="h-3.5 w-3.5 text-ember" />
              Explore the library
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
