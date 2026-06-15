import { notFound } from "next/navigation"

import { AdminPromptDetailView } from "@/components/admin/admin-prompt-detail-view"
import { requireAdmin } from "@/lib/auth/user"

export default async function AdminPromptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [admin, { id }] = await Promise.all([requireAdmin(), params])

  if (!admin) {
    notFound()
  }

  return <AdminPromptDetailView key={id} promptId={id} />
}
