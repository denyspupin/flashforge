import { auth } from "@clerk/nextjs/server"

import { SiteHeader } from "@/components/landing/site-header"
import { DashboardHeader } from "@/components/layout/dashboard-chrome"
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav"

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
        <div className="flex-1 pb-safe">{children}</div>
        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      {children}
    </div>
  )
}
