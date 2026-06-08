import { UserButton } from "@clerk/nextjs"
import Link from "next/link"
import { LayoutDashboard, Library, Bell } from "lucide-react"
import { AppHeader } from "@/components/layout/app-header"
import { Button } from "@/components/ui/button"

function DashboardNav() {
  return (
    <nav className="flex items-center gap-1">
      <Link href="/dashboard">
        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-3 text-ink/80 hover:text-ink"
        >
          <LayoutDashboard className="mr-1.5 h-4 w-4" />
          Dashboard
        </Button>
      </Link>
      <Link href="/decks">
        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-3 text-ink/80 hover:text-ink"
        >
          <Library className="mr-1.5 h-4 w-4" />
          My Decks
        </Button>
      </Link>
      <Link href="/notifications">
        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-3 text-ink/80 hover:text-ink"
        >
          <Bell className="mr-1.5 h-4 w-4" />
          Notifications
        </Button>
      </Link>
    </nav>
  )
}

function DashboardActions() {
  return (
    <UserButton
      appearance={{
        elements: {
          avatarBox: "h-8 w-8",
        },
      }}
    />
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader nav={<DashboardNav />} actions={<DashboardActions />} />
      <main className="flex-1 mx-auto w-full max-w-6xl p-6">{children}</main>
    </div>
  )
}
