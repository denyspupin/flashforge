import { NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { z } from "zod"
import { eq, sql } from "drizzle-orm"
import { db } from "@/lib/db/client"
import { users, languages } from "@/lib/db/schema"
import { successResponse, errorResponse } from "@/lib/api/response"
import { requireCurrentUser } from "@/lib/auth/user"
import { THEME_OPTIONS } from "@/lib/constants"
import { THEME_COOKIE, THEME_COOKIE_MAX_AGE } from "@/lib/theme"

export const dynamic = "force-dynamic"

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(256).nullable().optional(),
  nativeLanguageId: z.string().uuid().nullable().optional(),
  theme: z.enum(THEME_OPTIONS).optional(),
  avatarUrl: z
    .string()
    .trim()
    .max(2048)
    .refine(
      (v) => v === "" || /^https?:\/\//i.test(v),
      "Avatar URL must be an http(s) URL",
    )
    .nullable()
    .optional()
    .transform((v) => (v === "" ? null : v)),
})

export async function GET() {
  const user = await requireCurrentUser()

  if (!user) {
    return NextResponse.json(
      errorResponse("Authentication required", "UNAUTHORIZED"),
      { status: 401 }
    )
  }

  return NextResponse.json(successResponse(user))
}

export async function PATCH(request: Request) {
  const user = await requireCurrentUser()

  if (!user) {
    return NextResponse.json(
      errorResponse("Authentication required", "UNAUTHORIZED"),
      { status: 401 }
    )
  }

  const body = await request.json()
  const parsed = updateProfileSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      errorResponse("Invalid request body", "VALIDATION_ERROR"),
      { status: 400 }
    )
  }

  if (parsed.data.nativeLanguageId) {
    const language = await db
      .select({ id: languages.id })
      .from(languages)
      .where(eq(languages.id, parsed.data.nativeLanguageId))
      .limit(1)

    if (!language.length) {
      return NextResponse.json(
        errorResponse("Language not found", "NOT_FOUND"),
        { status: 404 }
      )
    }
  }

  const updateData: Record<string, unknown> = {
    updatedAt: sql`now()`,
  }

  if (parsed.data.name !== undefined) {
    updateData.name = parsed.data.name
  }
  if (parsed.data.nativeLanguageId !== undefined) {
    updateData.nativeLanguageId = parsed.data.nativeLanguageId
  }
  if (parsed.data.theme !== undefined) {
    updateData.theme = parsed.data.theme
  }
  if (parsed.data.avatarUrl !== undefined) {
    if (parsed.data.avatarUrl === null) {
      const clerkUser = await currentUser()
      updateData.avatarUrl = clerkUser?.imageUrl ?? null
    } else {
      updateData.avatarUrl = parsed.data.avatarUrl
    }
  }

  const [updated] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, user.id))
    .returning()

  const response = NextResponse.json(successResponse(updated))

  if (parsed.data.theme !== undefined) {
    response.cookies.set({
      name: THEME_COOKIE,
      value: parsed.data.theme,
      maxAge: THEME_COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
      httpOnly: false,
    })
  }

  return response
}
