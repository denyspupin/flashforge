import type { Metadata } from "next"

import { HeroSection } from "@/components/landing/hero-section"
import { ProcessSection } from "@/components/landing/process-section"
import { TopicsSection } from "@/components/landing/topics-section"
import { LibrarySection } from "@/components/landing/library-section"
import { GamificationSection } from "@/components/landing/gamification-section"
import { CtaSection } from "@/components/landing/cta-section"
import { LandingFooter } from "@/components/landing/landing-footer"

export const metadata: Metadata = {
  alternates: { canonical: "/" },
}

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <ProcessSection />
      <TopicsSection />
      <LibrarySection />
      <GamificationSection />
      <CtaSection />
      <LandingFooter />
    </>
  )
}
