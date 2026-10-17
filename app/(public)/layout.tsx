import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()
  if (userId) {
    redirect("/dashboard")
  }

  return <div className="flex min-h-svh flex-col">{children}</div>
}
