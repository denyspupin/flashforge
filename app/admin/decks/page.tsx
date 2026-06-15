import { Suspense } from "react"

import { AdminDecksView } from "@/components/admin/admin-decks-view"

export default function AdminDecksPage() {
  return (
    <Suspense fallback={null}>
      <AdminDecksView />
    </Suspense>
  )
}
