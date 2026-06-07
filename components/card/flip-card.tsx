"use client"

import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

type FlipCardProps = {
  flipped: boolean
  onFlip?: () => void
  front: React.ReactNode
  back: React.ReactNode
  className?: string
  ariaLabel?: string
}

export function FlipCard({
  flipped,
  onFlip,
  front,
  back,
  className,
  ariaLabel,
}: FlipCardProps) {
  const reduce = useReducedMotion()
  const interactive = Boolean(onFlip)

  const card = (
    <motion.div
      className="preserve-3d relative h-full w-full"
      initial={false}
      animate={{ rotateY: flipped ? 180 : 0 }}
      transition={
        reduce ? { duration: 0 } : { duration: 0.9, ease: [0.16, 1, 0.3, 1] }
      }
    >
      <div className="backface-hidden absolute inset-0">{front}</div>
      <div
        className="backface-hidden absolute inset-0"
        style={{ transform: "rotateY(180deg)" }}
      >
        {back}
      </div>
    </motion.div>
  )

  return (
    <div className={cn("perspective-1000 relative w-full", className)}>
      {interactive ? (
        <button
          type="button"
          onClick={onFlip}
          aria-label={ariaLabel ?? (flipped ? "Show term" : "Reveal meaning")}
          aria-pressed={flipped}
          className="block h-full w-full cursor-pointer text-left"
        >
          {card}
        </button>
      ) : (
        card
      )}
    </div>
  )
}
