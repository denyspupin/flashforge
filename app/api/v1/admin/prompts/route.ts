import { and, eq, isNull, sql } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"

import { errorResponse, successResponse } from "@/lib/api/response"
import { requireAdmin } from "@/lib/auth/user"
import { PROMPT_TEMPLATES } from "@/lib/constants"
import { db } from "@/lib/db/client"
import { promptTemplates } from "@/lib/db/schema"
import {
  getNextPromptVersion,
  listAdminPrompts,
} from "@/lib/queries/admin-prompts"

export const dynamic = "force-dynamic"

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(
    /^[a-z0-9-]+$/,
    "Slug must be lowercase letters, digits, or hyphens",
  )

const createSchema = z.object({
  slug: slugSchema,
  body: z
    .string()
    .min(1)
    .max(PROMPT_TEMPLATES.MAX_BODY_LENGTH),
  description: z
    .string()
    .trim()
    .max(PROMPT_TEMPLATES.MAX_DESCRIPTION_LENGTH)
    .optional()
    .nullable(),
  changelog: z.string().trim().max(2000).optional().nullable(),
  activate: z.boolean().optional().default(false),
})

export async function GET(request: Request) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json(errorResponse("Forbidden", "FORBIDDEN"), {
      status: 403,
    })
  }

  const { searchParams } = new URL(request.url)
  const slug = searchParams.get("slug") ?? undefined
  const includeDeleted = searchParams.get("includeDeleted") === "true"

  const items = await listAdminPrompts({ slug, includeDeleted })
  return NextResponse.json(successResponse(items))
}

export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json(errorResponse("Forbidden", "FORBIDDEN"), {
      status: 403,
    })
  }

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      errorResponse("Invalid request body", "VALIDATION_ERROR"),
      { status: 400 },
    )
  }

  const version = await getNextPromptVersion(parsed.data.slug)

  try {
    const [created] = await db
      .insert(promptTemplates)
      .values({
        slug: parsed.data.slug,
        version,
        body: parsed.data.body,
        description: parsed.data.description ?? null,
        changelog: parsed.data.changelog ?? null,
        isActive: false,
        createdById: admin.id,
      })
      .returning()

    if (!created) {
      return NextResponse.json(
        errorResponse("Failed to create prompt", "INTERNAL_ERROR"),
        { status: 500 },
      )
    }

    if (parsed.data.activate) {
      await db
        .update(promptTemplates)
        .set({ isActive: false, updatedAt: sql`now()` })
        .where(
          and(
            eq(promptTemplates.slug, parsed.data.slug),
            isNull(promptTemplates.deletedAt),
          ),
        )
      await db
        .update(promptTemplates)
        .set({ isActive: true, updatedAt: sql`now()` })
        .where(eq(promptTemplates.id, created.id))
      created.isActive = true
    }

    return NextResponse.json(successResponse(created), { status: 201 })
  } catch (err) {
    if (
      err instanceof Error &&
      err.message.includes("prompt_templates_slug_version_idx")
    ) {
      return NextResponse.json(
        errorResponse(
          "A version with this number already exists for this slug",
          "CONFLICT",
        ),
        { status: 409 },
      )
    }
    throw err
  }
}
