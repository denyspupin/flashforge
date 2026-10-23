"use client"

import { useEffect, useRef, useState, type Ref } from "react"
import { cn } from "@/lib/utils"

type ExpandableTextProps = {
  as?: "h1" | "p"
  text: string
  collapsedClassName: string
  className?: string
  moreLabel?: string
  lessLabel?: string
}

export function ExpandableText({
  as = "p",
  text,
  collapsedClassName,
  className,
  moreLabel = "More",
  lessLabel = "Less",
}: ExpandableTextProps) {
  const ref = useRef<HTMLElement | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [truncated, setTruncated] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || expanded) return
    const measure = () => {
      setTruncated(
        el.scrollHeight - el.clientHeight > 1 ||
          el.scrollWidth - el.clientWidth > 1
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [text, expanded])

  const showToggle = expanded || truncated
  const buttonLabel = expanded ? lessLabel : moreLabel
  const classes = cn("break-words", !expanded && collapsedClassName, className)

  return (
    <div>
      {as === "h1" ? (
        <h1
          ref={ref as Ref<HTMLHeadingElement>}
          className={classes}
        >
          {text}
        </h1>
      ) : (
        <p ref={ref as Ref<HTMLParagraphElement>} className={classes}>
          {text}
        </p>
      )}
      {showToggle && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-ember hover:text-ember/80 hover:underline text-sm font-medium"
          aria-expanded={expanded}
        >
          {buttonLabel}
        </button>
      )}
    </div>
  )
}
