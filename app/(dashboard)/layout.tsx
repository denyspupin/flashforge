import { DashboardShell } from "@/components/layout/dashboard-chrome"
import { OnboardingGate } from "@/components/onboarding"
import { getCurrentUser } from "@/lib/auth/user"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  return (
    <DashboardShell>
      {children}
      {user && !user.onboardedAt && <OnboardingGate onboarded={false} />}
    </DashboardShell>
  )
}
