import { DashboardShell } from "@/components/layout/dashboard-chrome"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardShell>{children}</DashboardShell>
}
