import { UserButton } from "@clerk/nextjs"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BookOpen, LayoutDashboard, Library, Bell } from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b px-6 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            <span className="text-lg font-bold">FlashForge</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/decks">
              <Button variant="ghost" size="sm">
                <Library className="mr-2 h-4 w-4" />
                My Decks
              </Button>
            </Link>
            <Link href="/notifications">
              <Button variant="ghost" size="sm">
                <Bell className="mr-2 h-4 w-4" />
                Notifications
              </Button>
            </Link>
            <UserButton />
          </nav>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-6xl p-6">{children}</main>
    </div>
  )
}
