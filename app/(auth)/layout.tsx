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
    <div className="paper-warm relative flex min-h-svh flex-col items-center overflow-hidden px-4 py-6 sm:py-10">
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="ember-glow absolute -left-40 top-12 h-[420px] w-[420px] rounded-full blur-3xl" />
        <div
          className="absolute -right-24 top-2/3 h-[300px] w-[300px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--honey) / 0.18), transparent 70%)",
          }}
        />
      </div>

      <Link
        href="/"
        className="relative z-10 mb-6 mt-2 transition-opacity hover:opacity-80 sm:mb-10"
      >
        <Wordmark />
      </Link>

      <div className="relative z-10 flex w-full max-w-md flex-1 items-center justify-center pb-6">
        {children}
      </div>
    </div>
  )
}
