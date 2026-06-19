import { Suspense } from "react"

import { AdminCollectionsView } from "@/components/admin/admin-collections-view"

export default function AdminCollectionsPage() {
  return (
    <Suspense fallback={null}>
      <AdminCollectionsView />
    </Suspense>
  )
}
