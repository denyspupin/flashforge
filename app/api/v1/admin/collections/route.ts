import { NextResponse } from "next/server"
import { z } from "zod"

import { errorResponse, successResponse } from "@/lib/api/response"
import { requireAdmin } from "@/lib/auth/user"
import {
  listAdminCollections,
  type AdminCollectionListFilters,
} from "@/lib/queries/admin-collections"

export const dynamic = "force-dynamic"

const querySchema = z.object({
  q: z.string().trim().max(256).optional(),
  creatorId: z.string().uuid().optional(),
  deleted: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
})

export async function GET(request: Request) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json(errorResponse("Forbidden", "FORBIDDEN"), {
      status: 403,
    })
  }

  const url = new URL(request.url)
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))

  if (!parsed.success) {
    return NextResponse.json(
      errorResponse("Invalid query parameters", "VALIDATION_ERROR"),
      { status: 400 },
    )
  }

  const filters: AdminCollectionListFilters = parsed.data
  const result = await listAdminCollections(filters)
  return NextResponse.json(successResponse(result))
}
