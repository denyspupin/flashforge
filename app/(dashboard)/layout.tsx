import { DashboardAppShell } from "@/components/layout/app-shell"
import { Toaster } from "@/components/garn/sonner"
import { OnboardingGate } from "@/components/onboarding"
import { getCurrentUser } from "@/lib/auth/user"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  return (
    <DashboardAppShell>
      {children}
      {user && !user.onboardedAt && <OnboardingGate onboarded={false} />}
      <Toaster />
    </DashboardAppShell>
  )
}
