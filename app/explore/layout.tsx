import { auth } from "@clerk/nextjs/server"

import { LandingFooter } from "@/components/landing/landing-footer"
import { SiteHeader } from "@/components/landing/site-header"
import { DashboardHeader } from "@/components/layout/dashboard-chrome"

export default async function ExploreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

  if (userId) {
    return (
      <div className="min-h-screen flex flex-col">
        <DashboardHeader />
        <div className="flex-1">{children}</div>
      </div>
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
