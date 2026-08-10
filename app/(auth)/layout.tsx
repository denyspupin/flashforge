import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { Wordmark } from "@/components/layout/wordmark"

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()
  if (userId) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-svh flex-col items-center bg-background px-4 py-6 sm:py-10">
      <Link
        href="/"
        className="mb-6 mt-2 transition-opacity hover:opacity-80 sm:mb-10"
      >
        <Wordmark />
      </Link>

      <div className="flex w-full max-w-md flex-1 items-center justify-center pb-6">
        {children}
      </div>
    </div>
  )
}
