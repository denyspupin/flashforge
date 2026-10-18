import { and, eq, gte, sql } from "drizzle-orm"

import { db } from "@/lib/db/client"
import { studySessions } from "@/lib/db/schema"

export const STATS_WINDOW_DAYS = 7

export type StatsWindow = {
  cardsReviewed: number
  cardsCorrect: number
  accuracy: number | null
  durationMs: number
  sessions: number
}

export type StatsDaily = {
  day: string
  cardsReviewed: number
  cardsCorrect: number
  sessions: number
  durationMs: number
}

export type UserStatsSnapshot = {
  hasSessions: boolean
  week: StatsWindow
  daily: StatsDaily[]
}

const ZERO_WINDOW: StatsWindow = {
  cardsReviewed: 0,
  cardsCorrect: 0,
  accuracy: null,
  durationMs: 0,
  sessions: 0,
}

function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function shiftUtcDay(day: string, delta: number): string {
  const date = new Date(`${day}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + delta)
  return utcDayKey(date)
}

function emptyDay(day: string): StatsDaily {
  return {
    day,
    cardsReviewed: 0,
    cardsCorrect: 0,
    sessions: 0,
    durationMs: 0,
  }
}

export async function loadUserStatsSnapshot(
  userId: string,
): Promise<UserStatsSnapshot> {
  const todayKey = utcDayKey(new Date())
  const windowStartKey = shiftUtcDay(todayKey, -(STATS_WINDOW_DAYS - 1))
  const windowStart = new Date(`${windowStartKey}T00:00:00.000Z`)

  const completedWhere = and(
    eq(studySessions.userId, userId),
    eq(studySessions.status, "completed"),
  )

  const [bucketRows, totalRows] = await Promise.all([
    db
      .select({
        day: sql<string>`to_char(${studySessions.completedAt} at time zone 'UTC', 'YYYY-MM-DD')`,
        cardsReviewed: sql<number>`coalesce(sum(${studySessions.cardsReviewed}), 0)::int`,
        cardsCorrect: sql<number>`coalesce(sum(${studySessions.cardsCorrect}), 0)::int`,
        sessions: sql<number>`count(*)::int`,
        durationMs: sql<number>`coalesce(sum(${studySessions.durationMs}), 0)::int`,
      })
      .from(studySessions)
      .where(
        and(
          completedWhere,
          gte(studySessions.completedAt, windowStart),
        ),
      )
      .groupBy(
        sql`to_char(${studySessions.completedAt} at time zone 'UTC', 'YYYY-MM-DD')`,
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(studySessions)
      .where(completedWhere),
  ])

  const byDay = new Map(bucketRows.map((row) => [row.day, row]))

  const daily: StatsDaily[] = []
  for (let i = 0; i < STATS_WINDOW_DAYS; i++) {
    const day = shiftUtcDay(windowStartKey, i)
    const row = byDay.get(day)
    daily.push(
      row
        ? {
            day,
            cardsReviewed: row.cardsReviewed,
            cardsCorrect: row.cardsCorrect,
            sessions: row.sessions,
            durationMs: row.durationMs,
          }
        : emptyDay(day),
    )
  }

  const weekRows = daily.slice(-7)
  const week = weekRows.reduce<StatsWindow>(
    (acc, row) => ({
      cardsReviewed: acc.cardsReviewed + row.cardsReviewed,
      cardsCorrect: acc.cardsCorrect + row.cardsCorrect,
      accuracy: acc.accuracy,
      durationMs: acc.durationMs + row.durationMs,
      sessions: acc.sessions + row.sessions,
    }),
    { ...ZERO_WINDOW },
  )
  week.accuracy =
    week.cardsReviewed > 0
      ? Math.round((week.cardsCorrect / week.cardsReviewed) * 100)
      : null

  return {
    hasSessions: (totalRows[0]?.count ?? 0) > 0,
    week,
    daily,
  }
}
