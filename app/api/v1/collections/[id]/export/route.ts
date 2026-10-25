import { NextResponse } from "next/server"
import { and, eq, isNull } from "drizzle-orm"

import { db } from "@/lib/db/client"
import { collections } from "@/lib/db/schema"
import { errorResponse } from "@/lib/api/response"
import { requireCurrentUser } from "@/lib/auth/user"
import { buildCollectionExportPayload } from "@/lib/export"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await requireCurrentUser()

  if (!user) {
    return NextResponse.json(
      errorResponse("Authentication required", "UNAUTHORIZED"),
      { status: 401 }
    )
  }

  const owned = await db
    .select({ id: collections.id, slug: collections.slug })
    .from(collections)
    .where(
      and(
        eq(collections.id, id),
        eq(collections.creatorId, user.id),
        isNull(collections.deletedAt)
      )
    )

  if (!owned.length) {
    return NextResponse.json(
      errorResponse("Collection not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  const payload = await buildCollectionExportPayload(id)
  if (!payload) {
    return NextResponse.json(
      errorResponse("Collection could not be exported", "INTERNAL_ERROR"),
      { status: 500 }
    )
  }

  const date = new Date().toISOString().slice(0, 10)
  const slug = owned[0].slug || "collection"
  const filename = `${slug}-${date}.json`

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
