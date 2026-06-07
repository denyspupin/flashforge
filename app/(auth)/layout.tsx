import Link from "next/link"
import { BookOpen } from "lucide-react"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <BookOpen className="h-6 w-6" />
        <span className="text-xl font-bold">FlashForge</span>
      </Link>
      {children}
    </div>
  )
}
