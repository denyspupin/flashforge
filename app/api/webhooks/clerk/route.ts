import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db/client"
import { users } from "@/lib/db/schema"
import { successResponse } from "@/lib/api/response"

export const dynamic = "force-dynamic"

const VALID_ROLES = new Set(["user", "curator", "admin"])

function readRole(metadata: unknown): "user" | "curator" | "admin" {
  if (!metadata || typeof metadata !== "object") return "user"
  const role = (metadata as { role?: unknown }).role
  if (typeof role === "string" && VALID_ROLES.has(role)) {
    return role as "user" | "curator" | "admin"
  }
  return "user"
}

function readName(firstName: unknown, lastName: unknown): string | null {
  const f = typeof firstName === "string" ? firstName : ""
  const l = typeof lastName === "string" ? lastName : ""
  const combined = `${f} ${l}`.trim()
  return combined || null
}

function readImageUrl(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}

export async function POST(request: Request) {
  const payload = await request.json()
  const { type, data } = payload

  if (!data || typeof data.id !== "string") {
    return NextResponse.json(successResponse({ received: true }))
  }

  const clerkId = data.id
  const name = readName(data.first_name, data.last_name)
  const avatarUrl = readImageUrl(data.image_url)
  const role = readRole(data.public_metadata)

  if (type === "user.created") {
    await db
      .insert(users)
      .values({ clerkId, name, avatarUrl, role })
      .onConflictDoNothing({ target: users.clerkId })
  } else if (type === "user.updated") {
    await db
      .update(users)
      .set({ name, avatarUrl, role, updatedAt: new Date() })
      .where(eq(users.clerkId, clerkId))
  } else if (type === "user.deleted") {
    await db.delete(users).where(eq(users.clerkId, clerkId))
  }

  return NextResponse.json(successResponse({ received: true }))
}
