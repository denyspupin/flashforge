import { notFound } from "next/navigation"

import { AdminCollectionDetailView } from "@/components/admin/admin-collection-detail-view"
import { requireAdmin } from "@/lib/auth/user"

export default async function AdminCollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [admin, { id }] = await Promise.all([requireAdmin(), params])

  if (!admin) {
    notFound()
  }

  return <AdminCollectionDetailView collectionId={id} />
}
