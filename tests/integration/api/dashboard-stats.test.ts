import { afterAll, beforeAll, describe, expect, test, vi } from "vitest"

import { setupTestPool, teardownTestPool, withTx } from "../../setup/db"
import { mockClerk } from "../../setup/clerk"
import { callRoute } from "../../setup/route-call"
import {
  seedDeck,
  seedLanguage,
  seedSession,
  seedUser,
} from "../../setup/fixtures"
import { GET as getDashboard } from "@/app/api/v1/dashboard/route"

type StatsPayload = {
  stats: {
    hasSessions: boolean
    week: {
      cardsReviewed: number
      cardsCorrect: number
      accuracy: number | null
      durationMs: number
      sessions: number
    }
    daily: Array<{
      day: string
      cardsReviewed: number
      cardsCorrect: number
      sessions: number
      durationMs: number
    }>
  }
}

async function seedDeckWithLanguage(db: Parameters<typeof seedDeck>[0]) {
  const source = await seedLanguage(db, "en")
  const target = await seedLanguage(db, "es")
  return { source, target }
}

function dayKey(day: string, stats: StatsPayload): number {
  return stats.stats.daily.findIndex((entry) => entry.day === day)
}

describe("dashboard stats", () => {
  beforeAll(async () => {
    await setupTestPool()
  })
  afterAll(async () => {
    await teardownTestPool()
  })

  test("weekly tiles and daily buckets aggregate completed sessions only", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-15T12:00:00Z"))

    await withTx(async (db) => {
      const user = await seedUser(db, {})
      const { source, target } = await seedDeckWithLanguage(db)
      const deck = await seedDeck(db, {
        title: "Stats Deck",
        creatorId: user.id,
        sourceLanguageId: source.id,
        targetLanguageId: target.id,
      })

      await seedSession(db, {
        userId: user.id,
        deckId: deck.id,
        status: "completed",
        startedAt: new Date("2026-06-15T09:00:00Z"),
        completedAt: new Date("2026-06-15T10:00:00Z"),
        cardsReviewed: 5,
        cardsCorrect: 5,
        durationMs: 120_000,
      })
      await seedSession(db, {
        userId: user.id,
        deckId: deck.id,
        status: "completed",
        startedAt: new Date("2026-06-13T09:00:00Z"),
        completedAt: new Date("2026-06-13T10:00:00Z"),
        cardsReviewed: 10,
        cardsCorrect: 8,
        durationMs: 300_000,
      })
      await seedSession(db, {
        userId: user.id,
        deckId: deck.id,
        status: "completed",
        startedAt: new Date("2026-05-06T09:00:00Z"),
        completedAt: new Date("2026-05-06T10:00:00Z"),
        cardsReviewed: 100,
        cardsCorrect: 10,
        durationMs: 600_000,
      })
      await seedSession(db, {
        userId: user.id,
        deckId: deck.id,
        status: "abandoned",
        startedAt: new Date("2026-06-15T08:00:00Z"),
        cardsReviewed: 50,
        cardsCorrect: 50,
        durationMs: 500_000,
      })

      mockClerk({ clerkId: user.clerkId })
      const res = await callRoute(getDashboard, { method: "GET" })
      expect(res.status).toBe(200)

      const data = res.data as StatsPayload
      const { week, daily } = data.stats

      expect(data.stats.hasSessions).toBe(true)
      expect(week.cardsReviewed).toBe(15)
      expect(week.cardsCorrect).toBe(13)
      expect(week.accuracy).toBe(87)
      expect(week.durationMs).toBe(420_000)
      expect(week.sessions).toBe(2)

      expect(daily).toHaveLength(7)
      const today = dayKey("2026-06-15", data)
      expect(daily[6].day).toBe("2026-06-15")
      expect(today).toBe(6)
      expect(daily[today].cardsReviewed).toBe(5)
      expect(daily[today].sessions).toBe(1)
      expect(daily[today].durationMs).toBe(120_000)

      const twoDaysAgo = dayKey("2026-06-13", data)
      expect(twoDaysAgo).toBe(4)
      expect(daily[twoDaysAgo].cardsReviewed).toBe(10)
      expect(daily[twoDaysAgo].cardsCorrect).toBe(8)

      const yesterday = dayKey("2026-06-14", data)
      expect(yesterday).toBe(5)
      expect(daily[yesterday]).toEqual({
        day: "2026-06-14",
        cardsReviewed: 0,
        cardsCorrect: 0,
        sessions: 0,
        durationMs: 0,
      })
    })
  })

  test("stats only include the current user's sessions", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-15T12:00:00Z"))

    await withTx(async (db) => {
      const user = await seedUser(db, {})
      const stranger = await seedUser(db, {})
      const { source, target } = await seedDeckWithLanguage(db)
      const deck = await seedDeck(db, {
        title: "Shared Deck",
        creatorId: user.id,
        sourceLanguageId: source.id,
        targetLanguageId: target.id,
      })

      await seedSession(db, {
        userId: user.id,
        deckId: deck.id,
        status: "completed",
        startedAt: new Date("2026-06-15T09:00:00Z"),
        completedAt: new Date("2026-06-15T10:00:00Z"),
        cardsReviewed: 3,
        cardsCorrect: 3,
        durationMs: 90_000,
      })
      await seedSession(db, {
        userId: stranger.id,
        deckId: deck.id,
        status: "completed",
        startedAt: new Date("2026-06-15T09:00:00Z"),
        completedAt: new Date("2026-06-15T11:00:00Z"),
        cardsReviewed: 50,
        cardsCorrect: 50,
        durationMs: 900_000,
      })

      mockClerk({ clerkId: user.clerkId })
      const res = await callRoute(getDashboard, { method: "GET" })
      expect(res.status).toBe(200)

      const data = res.data as StatsPayload
      expect(data.stats.week).toMatchObject({
        cardsReviewed: 3,
        cardsCorrect: 3,
        accuracy: 100,
        durationMs: 90_000,
        sessions: 1,
      })
    })
  })

  test("user without completed sessions reports empty stats", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-15T12:00:00Z"))

    await withTx(async (db) => {
      const user = await seedUser(db, {})
      const { source, target } = await seedDeckWithLanguage(db)
      const deck = await seedDeck(db, {
        title: "Empty Stats",
        creatorId: user.id,
        sourceLanguageId: source.id,
        targetLanguageId: target.id,
      })
      await seedSession(db, {
        userId: user.id,
        deckId: deck.id,
        status: "active",
        startedAt: new Date("2026-06-15T09:00:00Z"),
        cardsReviewed: 12,
        cardsCorrect: 12,
        durationMs: 120_000,
      })

      mockClerk({ clerkId: user.clerkId })
      const res = await callRoute(getDashboard, { method: "GET" })
      expect(res.status).toBe(200)

      const data = res.data as StatsPayload
      expect(data.stats.hasSessions).toBe(false)
      expect(data.stats.week).toEqual({
        cardsReviewed: 0,
        cardsCorrect: 0,
        accuracy: null,
        durationMs: 0,
        sessions: 0,
      })
      expect(data.stats.daily.every((entry) => entry.cardsReviewed === 0)).toBe(
        true,
      )
    })
  })
})
