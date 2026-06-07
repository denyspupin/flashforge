import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { users } from "@/lib/db/schema"
import { successResponse } from "@/lib/api/response"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const payload = await request.json()
  const { type, data } = payload

  if (type === "user.created") {
    await db.insert(users).values({
      clerkId: data.id,
      name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || null,
      avatarUrl: data.image_url,
    })
  }

  return NextResponse.json(successResponse({ received: true }))
}
