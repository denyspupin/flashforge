"use client"

import { motion } from "framer-motion"
import { Flame, Play } from "lucide-react"
import { cn } from "@/lib/utils"

type StudyProgressProps = {
  phase: "pass1" | "done"
  position: number
  total: number
  streak?: number
}

export function StudyProgress({
  phase,
  position,
  total,
  streak,
}: StudyProgressProps) {
  const isDone = phase === "done"
  const percent = total === 0 ? 0 : Math.min(100, (position / total) * 100)

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono-tag uppercase tracking-wider",
              isDone
                ? "bg-forest/12 text-forest"
                : "bg-ember/12 text-ember"
            )}
          >
            <Play className="h-3 w-3" strokeWidth={2.25} />
            {isDone ? "Session complete" : "Studying"}
          </span>
          <span className="font-mono-tag text-ink/55">
            {String(position).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
        </div>
        {typeof streak === "number" && (
          <div className="flex items-center gap-1.5 font-mono-tag text-ink/55">
            <Flame
              className="h-3.5 w-3.5 text-ember"
              strokeWidth={2.25}
              fill="currentColor"
            />
            {streak} day{streak === 1 ? "" : "s"}
          </div>
        )}
      </div>
      <div className="relative h-1 w-full overflow-hidden rounded-full bg-ink/8">
        <motion.div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full",
            isDone ? "bg-forest" : "bg-ember"
          )}
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  )
}
