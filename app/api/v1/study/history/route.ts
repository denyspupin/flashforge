import { NextResponse } from "next/server"
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/lib/db/client"
import { decks, languages, studySessions } from "@/lib/db/schema"
import { errorResponse, successResponse } from "@/lib/api/response"
import { requireCurrentUser } from "@/lib/auth/user"
import { PAGINATION } from "@/lib/constants"
import { getLanguageFlag } from "@/lib/languages/flags"
import type { StudySession } from "@/types"

export const dynamic = "force-dynamic"

const historyQuerySchema = z.object({
  deckId: z.string().uuid().optional(),
  sort: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().positive().default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(PAGINATION.MAX_LIMIT)
    .default(PAGINATION.DEFAULT_LIMIT),
})

export type HistoryQueryInput = z.input<typeof historyQuerySchema>

export type HistorySessionDeck = {
  id: string
  title: string
  slug: string
  sourceLanguage: string
  targetLanguage: string
  sourceLanguageFlag: string
  targetLanguageFlag: string
}

export type HistorySession = Pick<
  StudySession,
  | "id"
  | "deckId"
  | "startedAt"
  | "completedAt"
  | "cardsReviewed"
  | "cardsCorrect"
  | "failedCardIds"
> & {
  xpAwarded: number
  deck: HistorySessionDeck
}

export type HistoryResult = {
  items: HistorySession[]
  total: number
  page: number
  limit: number
  sort: "asc" | "desc"
}

function normalizeFailedCardIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string")
  }
  return []
}

export async function GET(request: Request) {
  const user = await requireCurrentUser()

  if (!user) {
    return NextResponse.json(
      errorResponse("Authentication required", "UNAUTHORIZED"),
      { status: 401 }
    )
  }

  const url = new URL(request.url)
  const parsedQuery = historyQuerySchema.safeParse(
    Object.fromEntries(url.searchParams),
  )

  if (!parsedQuery.success) {
    return NextResponse.json(
      errorResponse("Invalid query parameters", "VALIDATION_ERROR"),
      { status: 400 },
    )
  }

  const { deckId, sort, page, limit } = parsedQuery.data
  const offset = (page - 1) * limit
  const orderByFn = sort === "asc" ? asc : desc

  const where = and(
    eq(studySessions.userId, user.id),
    eq(studySessions.status, "completed"),
    deckId ? eq(studySessions.deckId, deckId) : undefined,
  )

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: studySessions.id,
        deckId: studySessions.deckId,
        startedAt: studySessions.startedAt,
        completedAt: studySessions.completedAt,
        cardsReviewed: studySessions.cardsReviewed,
        cardsCorrect: studySessions.cardsCorrect,
        failedCardIds: studySessions.failedCardIds,
        xpAwarded: studySessions.xpAwarded,
        deckTitle: decks.title,
        deckSlug: decks.slug,
        sourceLanguageId: decks.sourceLanguageId,
        targetLanguageId: decks.targetLanguageId,
      })
      .from(studySessions)
      .innerJoin(decks, eq(decks.id, studySessions.deckId))
      .where(and(where, isNull(decks.deletedAt)))
      .orderBy(
        orderByFn(
          sql`coalesce(${studySessions.completedAt}, ${studySessions.startedAt})`,
        ),
        orderByFn(studySessions.startedAt),
      )
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(studySessions)
      .innerJoin(decks, eq(decks.id, studySessions.deckId))
      .where(and(where, isNull(decks.deletedAt))),
  ])

  const languageIds = Array.from(
    new Set(rows.flatMap((r) => [r.sourceLanguageId, r.targetLanguageId])),
  )

  const languageRows = languageIds.length
    ? await db
        .select()
        .from(languages)
        .where(
          and(inArray(languages.id, languageIds), isNull(languages.deletedAt)),
        )
    : []

  const languagesById = new Map(
    languageRows.map((l) => [l.id, { name: l.name, code: l.code }]),
  )

  const items: HistorySession[] = rows.map((row) => {
    const sourceLang = languagesById.get(row.sourceLanguageId)
    const targetLang = languagesById.get(row.targetLanguageId)
    return {
      id: row.id,
      deckId: row.deckId,
      startedAt: row.startedAt.toISOString(),
      completedAt: row.completedAt ? row.completedAt.toISOString() : null,
      cardsReviewed: row.cardsReviewed,
      cardsCorrect: row.cardsCorrect,
      failedCardIds: normalizeFailedCardIds(row.failedCardIds),
      xpAwarded: row.xpAwarded,
      deck: {
        id: row.deckId,
        title: row.deckTitle,
        slug: row.deckSlug,
        sourceLanguage: sourceLang?.name ?? "",
        targetLanguage: targetLang?.name ?? "",
        sourceLanguageFlag: getLanguageFlag(sourceLang?.code),
        targetLanguageFlag: getLanguageFlag(targetLang?.code),
      },
    }
  })

  return NextResponse.json(
    successResponse<HistoryResult>({
      items,
      total: totalRow[0]?.count ?? 0,
      page,
      limit,
      sort,
    }),
  )
}

