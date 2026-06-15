import { NextResponse } from "next/server"

import { errorResponse, successResponse } from "@/lib/api/response"
import { requireCurrentUser } from "@/lib/auth/user"
import { PROMPT_TEMPLATES } from "@/lib/constants"
import { getActivePrompt } from "@/lib/queries/admin-prompts"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const user = await requireCurrentUser()
  if (!user) {
    return NextResponse.json(
      errorResponse("Unauthorized", "UNAUTHORIZED"),
      { status: 401 },
    )
  }

  const { searchParams } = new URL(request.url)
  const slug =
    searchParams.get("slug") ?? PROMPT_TEMPLATES.DECK_GENERATION_SLUG

  const prompt = await getActivePrompt(slug)
  if (!prompt) {
    return NextResponse.json(
      errorResponse("No active prompt for this slug", "NOT_FOUND"),
      { status: 404 },
    )
  }
  return NextResponse.json(successResponse(prompt))
}
