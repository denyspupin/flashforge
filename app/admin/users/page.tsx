import { Suspense } from "react"

import { AdminUsersView } from "@/components/admin/admin-users-view"

export default function AdminUsersPage() {
  return (
    <Suspense fallback={null}>
      <AdminUsersView />
    </Suspense>
  )
}
