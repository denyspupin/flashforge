import { NextResponse } from "next/server"
import { isNull } from "drizzle-orm"
import { db } from "@/lib/db/client"
import { languages } from "@/lib/db/schema"
import { successResponse } from "@/lib/api/response"
import { enrichLanguages } from "@/lib/languages/flags"

export const dynamic = "force-dynamic"

export async function GET() {
  const data = await db
    .select()
    .from(languages)
    .where(isNull(languages.deletedAt))
  return NextResponse.json(successResponse(enrichLanguages(data)))
}
