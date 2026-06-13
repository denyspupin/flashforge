import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { topics } from "@/lib/db/schema"
import { successResponse } from "@/lib/api/response"

export const revalidate = 3600

export async function GET() {
  const data = await db.select().from(topics)
  return NextResponse.json(successResponse(data))
}
