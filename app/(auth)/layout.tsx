import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()
  if (userId) {
    redirect("/dashboard")
  }

  return <div className="min-h-svh">{children}</div>
}
