import type { Metadata } from "next"
import { auth } from "@clerk/nextjs/server"

import { LandingFooter } from "@/components/landing/landing-footer"
import { SiteHeader } from "@/components/landing/site-header"
import { DashboardShell } from "@/components/layout/dashboard-chrome"

export const metadata: Metadata = {
  title: "Explore the library",
  description:
    "Browse public flashcard decks and collections across nine languages. Study as a guest, or fork one into your own account.",
  alternates: { canonical: "/explore" },
  openGraph: {
    title: "Explore the FlashForge library",
    description:
      "Browse public flashcard decks and collections across nine languages.",
    url: "/explore",
  },
}

export default async function ExploreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

  if (userId) {
    return (
      <DashboardShell bleed>{children}</DashboardShell>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <LandingFooter />
    </div>
  )
}
