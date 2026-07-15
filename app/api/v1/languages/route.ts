import { NextResponse } from "next/server"
import { isNull } from "drizzle-orm"
import { db } from "@/lib/db/client"
import { languages } from "@/lib/db/schema"
import { successResponse } from "@/lib/api/response"
import { enrichLanguages } from "@/lib/languages/flags"
import { getActiveLanguages } from "@/lib/cache/languages"

export const dynamic = "force-dynamic"

export async function GET() {
  const data = await getActiveLanguages()
  return NextResponse.json(successResponse(data))
}
