import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { studySessions, users, cards } from "@/lib/db/schema"
import { eq, and, inArray, sql } from "drizzle-orm"
import { successResponse, errorResponse } from "@/lib/api/response"
import { requireCurrentUser } from "@/lib/auth/user"
import { z } from "zod"
import { XP_VALUES, STREAK_MULTIPLIERS } from "@/lib/constants"

export const dynamic = "force-dynamic"

const completeSchema = z.object({
  results: z.array(
    z.object({
      cardId: z.string().uuid(),
      correct: z.boolean(),
    })
  ),
})

function getStreakMultiplier(streak: number): number {
  let multiplier: number = STREAK_MULTIPLIERS[0].multiplier
  for (const tier of STREAK_MULTIPLIERS) {
    if (streak >= tier.days) {
      multiplier = tier.multiplier
    }
  }
  return multiplier
}

function isSameUTCDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  )
}

function isPreviousUTCDay(prev: Date, now: Date): boolean {
  const prevDay = new Date(
    Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth(), prev.getUTCDate())
  )
  const nowDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )
  const diffMs = nowDay.getTime() - prevDay.getTime()
  return diffMs === 86_400_000
}

function calculateNewStreak(
  currentStreak: number,
  lastUpdated: Date | null
): number {
  const now = new Date()
  if (!lastUpdated) return 1
  if (isSameUTCDay(lastUpdated, now)) return currentStreak
  if (isPreviousUTCDay(lastUpdated, now)) return currentStreak + 1
  return 1
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const user = await requireCurrentUser()

  if (!user) {
    return NextResponse.json(
      errorResponse("Authentication required", "UNAUTHORIZED"),
      { status: 401 }
    )
  }

  const sessionRows = await db
    .select()
    .from(studySessions)
    .where(
      and(
        eq(studySessions.id, sessionId),
        eq(studySessions.userId, user.id)
      )
    )

  if (!sessionRows.length) {
    return NextResponse.json(
      errorResponse("Session not found", "NOT_FOUND"),
      { status: 404 }
    )
  }

  const session = sessionRows[0]

  if (session.status === "completed") {
    return NextResponse.json(
      errorResponse("Session already completed", "CONFLICT"),
      { status: 409 }
    )
  }

  const body = await request.json()
  const parsed = completeSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      errorResponse("Invalid request body", "VALIDATION_ERROR"),
      { status: 400 }
    )
  }

  const { results } = parsed.data

  const cardsReviewed = results.length
  const correctIds: string[] = []
  const failedCardIds: string[] = []
  for (const r of results) {
    if (r.correct) correctIds.push(r.cardId)
    else failedCardIds.push(r.cardId)
  }
  const cardsCorrect = correctIds.length

  const newStreak = calculateNewStreak(user.streak, user.streakUpdatedAt)
  const multiplier = getStreakMultiplier(newStreak)

  const baseXp =
    cardsReviewed * XP_VALUES.CARD_REVIEWED +
    cardsCorrect * XP_VALUES.CARD_CORRECT +
    (cardsReviewed > 0 ? XP_VALUES.DECK_COMPLETE : 0) +
    (failedCardIds.length === 0 && cardsReviewed > 0 ? XP_VALUES.DECK_PERFECT : 0)

  const xpAwarded = Math.round(baseXp * multiplier)

  const now = new Date()

  const [updatedSession] = await db
    .update(studySessions)
    .set({
      status: "completed",
      completedAt: now,
      cardsReviewed,
      cardsCorrect,
      failedCardIds,
      xpAwarded,
      updatedAt: now,
    })
    .where(eq(studySessions.id, sessionId))
    .returning()

  const [updatedUser] = await db
    .update(users)
    .set({
      xp: user.xp + xpAwarded,
      streak: newStreak,
      streakUpdatedAt: now,
      updatedAt: now,
    })
    .where(eq(users.id, user.id))
    .returning()

  if (results.length > 0) {
    const reviewedIds = results.map((r) => r.cardId)
    await db
      .update(cards)
      .set({
        timesReviewed: sql`${cards.timesReviewed} + 1`,
        lastReviewedAt: now,
      })
      .where(inArray(cards.id, reviewedIds))
  }

  if (correctIds.length > 0) {
    await db
      .update(cards)
      .set({ timesCorrect: sql`${cards.timesCorrect} + 1` })
      .where(inArray(cards.id, correctIds))
  }

  return NextResponse.json(
    successResponse({
      session: updatedSession,
      xpAwarded,
      multiplier,
      newStreak,
      totalXp: updatedUser.xp,
    })
  )
}
