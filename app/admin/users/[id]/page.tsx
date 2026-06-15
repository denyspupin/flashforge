import { notFound } from "next/navigation"

import { AdminUserDetailView } from "@/components/admin/admin-user-detail-view"
import { requireAdmin } from "@/lib/auth/user"

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [admin, { id }] = await Promise.all([requireAdmin(), params])

  if (!admin) {
    notFound()
  }

  return <AdminUserDetailView userId={id} currentAdminId={admin.id} />
}
