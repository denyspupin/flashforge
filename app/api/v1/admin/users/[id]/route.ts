import { NextResponse } from "next/server"
import { z } from "zod"
import { eq, sql } from "drizzle-orm"

import { errorResponse, successResponse } from "@/lib/api/response"
import { requireAdmin } from "@/lib/auth/user"
import { db } from "@/lib/db/client"
import { users } from "@/lib/db/schema"
import { getAdminUser } from "@/lib/queries/admin-users"

export const dynamic = "force-dynamic"

const updateSchema = z.object({
  role: z.enum(["user", "curator", "admin"]).optional(),
  isBanned: z.boolean().optional(),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json(errorResponse("Forbidden", "FORBIDDEN"), {
      status: 403,
    })
  }

  const { id } = await params
  const user = await getAdminUser(id)
  if (!user) {
    return NextResponse.json(errorResponse("User not found", "NOT_FOUND"), {
      status: 404,
    })
  }
  return NextResponse.json(successResponse(user))
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json(errorResponse("Forbidden", "FORBIDDEN"), {
      status: 403,
    })
  }

  const { id } = await params
  const body = await request.json()
  const parsed = updateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      errorResponse("Invalid request body", "VALIDATION_ERROR"),
      { status: 400 },
    )
  }

  if (parsed.data.role === undefined && parsed.data.isBanned === undefined) {
    return NextResponse.json(
      errorResponse("No fields to update", "VALIDATION_ERROR"),
      { status: 400 },
    )
  }

  if (id === admin.id && parsed.data.role && parsed.data.role !== "admin") {
    return NextResponse.json(
      errorResponse("You cannot demote your own admin account", "VALIDATION_ERROR"),
      { status: 400 },
    )
  }

  const update: Record<string, unknown> = { updatedAt: sql`now()` }
  if (parsed.data.role !== undefined) update.role = parsed.data.role
  if (parsed.data.isBanned !== undefined) update.isBanned = parsed.data.isBanned

  const [updated] = await db
    .update(users)
    .set(update)
    .where(eq(users.id, id))
    .returning({ id: users.id })

  if (!updated) {
    return NextResponse.json(errorResponse("User not found", "NOT_FOUND"), {
      status: 404,
    })
  }

  const detail = await getAdminUser(id)
  return NextResponse.json(successResponse(detail))
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json(errorResponse("Forbidden", "FORBIDDEN"), {
      status: 403,
    })
  }

  const { id } = await params

  if (id === admin.id) {
    return NextResponse.json(
      errorResponse("You cannot delete your own account", "VALIDATION_ERROR"),
      { status: 400 },
    )
  }

  const [updated] = await db
    .update(users)
    .set({ deletedAt: sql`now()`, updatedAt: sql`now()` })
    .where(eq(users.id, id))
    .returning({ id: users.id })

  if (!updated) {
    return NextResponse.json(errorResponse("User not found", "NOT_FOUND"), {
      status: 404,
    })
  }

  return NextResponse.json(successResponse({ id, deletedAt: new Date().toISOString() }))
}
