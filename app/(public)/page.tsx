import { HeroSection } from "@/components/landing/hero-section"
import { ManifestoSection } from "@/components/landing/manifesto-section"
import { ProcessSection } from "@/components/landing/process-section"
import { TopicsSection } from "@/components/landing/topics-section"
import { LibrarySection } from "@/components/landing/library-section"
import { GamificationSection } from "@/components/landing/gamification-section"
import { CtaSection } from "@/components/landing/cta-section"
import { LandingFooter } from "@/components/landing/landing-footer"

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <ManifestoSection />
      <ProcessSection />
      <TopicsSection />
      <LibrarySection />
      <GamificationSection />
      <CtaSection />
      <LandingFooter />
    </>
  )
}
