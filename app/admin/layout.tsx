import { redirect } from "next/navigation"
import { AdminAppShell } from "@/components/layout/admin-app-shell"
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

  return <AdminAppShell>{children}</AdminAppShell>
}
