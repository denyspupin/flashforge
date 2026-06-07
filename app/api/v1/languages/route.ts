import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { languages } from "@/lib/db/schema"
import { successResponse } from "@/lib/api/response"

export const dynamic = "force-dynamic"

export async function GET() {
  const data = await db.select().from(languages)
  return NextResponse.json(successResponse(data))
}
