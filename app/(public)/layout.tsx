import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"

import { SiteHeader } from "@/components/landing/site-header"

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()
  if (userId) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
    </div>
  )
}
