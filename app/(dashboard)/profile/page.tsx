import { Suspense } from "react"

import { ProfileView } from "@/components/profile/profile-view"
import { ProfileSkeleton } from "@/components/profile/profile-skeleton"

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileView />
    </Suspense>
  )
}
