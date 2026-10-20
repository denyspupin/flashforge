"use client"

import { useMemo, useState } from "react"
import { ChevronRight } from "lucide-react"
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { UserStatsSnapshot } from "@/lib/queries/stats"

type ChartDatum = {
  day: string
  label: string
  cardsReviewed: number
  cardsCorrect: number
  cardsMissed: number
  accuracy: number | null
  durationMs: number
}

function shortDayLabel(day: string): string {
  const [year, month, date] = day.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, date)).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", timeZone: "UTC" },
  )
}

function dayNumber(day: string): string {
  return String(Number(day.slice(8, 10)))
}

function monthShort(day: string): string {
  const [year, month] = day.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
  })
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60_000)
  if (totalMinutes === 0) return "0m"
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload?: ChartDatum }>
}) {
  const datum = payload?.[0]?.payload
  if (!active || !datum) return null

  return (
    <div className="bg-paper ring-foreground/10 rounded-lg px-3 py-2 shadow-lg ring-1">
      <p className="font-mono-tag text-[10px] uppercase tracking-widest text-muted-foreground">
        {shortDayLabel(datum.day)}
      </p>
      <p className="mt-0.5 font-medium">
        {datum.cardsReviewed} {datum.cardsReviewed === 1 ? "card" : "cards"}{" "}
        reviewed
      </p>
      <p className="text-muted-foreground">
        {datum.accuracy !== null ? `${datum.accuracy}% accuracy` : "No reviews"}
      </p>
    </div>
  )
}

function LegendItem({
  marker,
  label,
}: {
  marker: React.ReactNode
  label: string
}) {
  return (
    <span className="text-muted-foreground flex items-center gap-1.5 font-mono-tag text-[10px] uppercase tracking-widest">
      {marker}
      {label}
    </span>
  )
}

export function StatsCard({ stats }: { stats: UserStatsSnapshot }) {
  const [open, setOpen] = useState(false)
  const chartData = useMemo<ChartDatum[]>(() => {
    return stats.daily.map((row, index) => {
      const prev = index > 0 ? stats.daily[index - 1] : null
      const monthChanged = !prev || prev.day.slice(5, 7) !== row.day.slice(5, 7)
      return {
        day: row.day,
        label: monthChanged
          ? `${monthShort(row.day)} ${dayNumber(row.day)}`
          : dayNumber(row.day),
        cardsReviewed: row.cardsReviewed,
        cardsCorrect: row.cardsCorrect,
        cardsMissed: row.cardsReviewed - row.cardsCorrect,
        accuracy:
          row.cardsReviewed > 0
            ? Math.round((row.cardsCorrect / row.cardsReviewed) * 100)
            : null,
        durationMs: row.durationMs,
      }
    })
  }, [stats])

  if (!stats.hasSessions || stats.week.cardsReviewed === 0) return null

  const { week } = stats

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-1 text-left"
      >
        <span>
          <span className="font-mono-tag text-[10px] uppercase tracking-widest text-muted-foreground block">
            Study stats
          </span>
          <span className="font-heading text-base font-medium leading-snug">
            Progress this week
          </span>
        </span>
        <ChevronRight
          aria-hidden
          className={cn(
            "text-muted-foreground h-4 w-4 shrink-0 transition-transform",
            open && "rotate-90",
          )}
        />
      </button>

      {open ? (
      <CardContent className="space-y-5">
        <div className="grid grid-cols-3 divide-x divide-ink/6">
          <div className="pr-4">
            <p className="font-mono-tag text-[10px] uppercase tracking-widest text-muted-foreground">
              Cards this week
            </p>
            <p className="font-display mt-1.5 text-2xl font-medium tracking-tight">
              {week.cardsReviewed.toLocaleString()}
            </p>
          </div>
          <div className="px-4">
            <p className="font-mono-tag text-[10px] uppercase tracking-widest text-muted-foreground">
              Accuracy
            </p>
            <p className="font-display mt-1.5 text-2xl font-medium tracking-tight">
              {week.accuracy !== null ? `${week.accuracy}%` : "—"}
            </p>
          </div>
          <div className="pl-4">
            <p className="font-mono-tag text-[10px] uppercase tracking-widest text-muted-foreground">
              Time studied
            </p>
            <p className="font-display mt-1.5 text-2xl font-medium tracking-tight">
              {formatDuration(week.durationMs)}
            </p>
          </div>
        </div>

        <div className="text-muted-foreground bg-ink/4 ring-foreground/10 h-44 w-full rounded-lg p-2 ring-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
              barCategoryGap="35%"
            >
              <XAxis
                dataKey="label"
                interval={0}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "currentColor" }}
                tickMargin={6}
              />
              <YAxis
                yAxisId="cards"
                width={24}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                tick={{ fontSize: 10, fill: "currentColor" }}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "transparent" }} />
              <Bar
                yAxisId="cards"
                dataKey="cardsCorrect"
                stackId="day"
                className="fill-ember"
                maxBarSize={40}
              />
              <Bar
                yAxisId="cards"
                dataKey="cardsMissed"
                stackId="day"
                className="fill-ember/25"
                radius={[3, 3, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center gap-5">
          <LegendItem
            marker={<span className="bg-ember inline-block h-2 w-2 rounded-[2px]" />}
            label="Correct"
          />
          <LegendItem
            marker={
              <span className="bg-ember/25 inline-block h-2 w-2 rounded-[2px]" />
            }
            label="Missed"
          />
        </div>
      </CardContent>
      ) : null}
    </Card>
  )
}
