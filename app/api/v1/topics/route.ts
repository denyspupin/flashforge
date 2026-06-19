import { NextResponse } from "next/server"
import { isNull } from "drizzle-orm"
import { db } from "@/lib/db/client"
import { topics } from "@/lib/db/schema"
import { successResponse } from "@/lib/api/response"

export const dynamic = "force-dynamic"

export async function GET() {
  const data = await db.select().from(topics).where(isNull(topics.deletedAt))
  return NextResponse.json(successResponse(data))
}
