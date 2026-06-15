import { notFound } from "next/navigation"

import { AdminDeckDetailView } from "@/components/admin/admin-deck-detail-view"
import { requireAdmin } from "@/lib/auth/user"

export default async function AdminDeckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [admin, { id }] = await Promise.all([requireAdmin(), params])

  if (!admin) {
    notFound()
  }

  return <AdminDeckDetailView deckId={id} />
}
