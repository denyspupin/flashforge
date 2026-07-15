import { redirect } from "next/navigation"
import { AdminShell } from "@/components/layout/admin-chrome"
import { requireAdmin } from "@/lib/auth/user"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const admin = await requireAdmin()

  if (!admin) {
    redirect("/dashboard")
  }

  return <AdminShell>{children}</AdminShell>
}
