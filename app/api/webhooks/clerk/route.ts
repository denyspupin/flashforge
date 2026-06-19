import { NextResponse } from "next/server"
import { Webhook } from "svix"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db/client"
import { users } from "@/lib/db/schema"
import { successResponse, errorResponse } from "@/lib/api/response"

export const dynamic = "force-dynamic"

const VALID_ROLES = new Set(["user", "curator", "admin"])

interface ClerkUserData {
  id: string
  first_name?: string | null
  last_name?: string | null
  image_url?: string | null
  public_metadata?: { role?: unknown }
}

interface ClerkWebhookEvent {
  type: string
  data: ClerkUserData
}

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
  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json(
      errorResponse("Webhook secret not configured", "INTERNAL_ERROR"),
      { status: 500 }
    )
  }

  const svixId = request.headers.get("svix-id")
  const svixTimestamp = request.headers.get("svix-timestamp")
  const svixSignature = request.headers.get("svix-signature")

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      errorResponse("Missing Svix signature headers", "VALIDATION_ERROR"),
      { status: 400 }
    )
  }

  const body = await request.text()

  let event: ClerkWebhookEvent
  try {
    event = new Webhook(secret).verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent
  } catch {
    return NextResponse.json(
      errorResponse("Invalid webhook signature", "VALIDATION_ERROR"),
      { status: 400 }
    )
  }

  const { type, data } = event
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
