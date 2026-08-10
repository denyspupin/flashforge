import { Badge } from "@/components/garn/badge"
import { cn } from "@/lib/utils"
import type { FlashcardContent } from "@/types/flashcard"

type FaceProps = {
  data: FlashcardContent
  className?: string
  size?: "default" | "lg"
}

const TEXT_SIZE: Record<NonNullable<FaceProps["size"]>, string> = {
  default: "text-[2.6rem] leading-[1.05] sm:text-[2.6rem]",
  lg: "text-[2.2rem] leading-[1.1] sm:text-[3rem] sm:leading-[1.05]",
}

export function CardFront({ data, className, size = "default" }: FaceProps) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col justify-between rounded-[2rem] border border-border bg-card p-6 shadow-surface-raised sm:p-8",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          {data.source && data.target && (
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {data.sourceFlag && (
                <span className="text-base leading-none" aria-hidden>
                  {data.sourceFlag}
                </span>
              )}
              <span>{data.source}</span>
              <span className="text-muted-foreground/50">→</span>
              {data.targetFlag && (
                <span className="text-base leading-none" aria-hidden>
                  {data.targetFlag}
                </span>
              )}
              <span>{data.target}</span>
            </div>
          )}
          {data.topic && (
            <div className="mt-1.5">
              <Badge tone="brand" appearance="soft" size="xs">
                {data.topic}
              </Badge>
            </div>
          )}
        </div>
        <div className="text-3xl font-semibold text-foreground/15">&ldquo;</div>
      </div>

      <div className="flex flex-1 items-center justify-center px-2">
        <h3
          className={cn(
            "text-balance text-center font-semibold tracking-tight text-foreground",
            TEXT_SIZE[size],
          )}
        >
          {data.front}
        </h3>
      </div>

      <div className="flex items-center justify-between font-mono text-xs uppercase tracking-wider text-muted-foreground">
        <span>Press reveal to see meaning</span>
        <div className="flex items-center gap-1">
          <span className="h-1 w-1 rounded-full bg-foreground/30" />
          <span className="h-1 w-1 rounded-full bg-foreground/30" />
          <span className="h-1 w-1 rounded-full bg-foreground/30" />
        </div>
      </div>
    </div>
  )
}

export function CardBack({ data, className, size = "default" }: FaceProps) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col justify-between rounded-[2rem] bg-foreground p-6 text-background shadow-surface-overlay sm:p-8",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          {data.target && (
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs font-medium uppercase tracking-wider text-background/70">
              {data.targetFlag && (
                <span className="text-base leading-none" aria-hidden>
                  {data.targetFlag}
                </span>
              )}
              <span>{data.target}</span>
              <span className="text-background/40">·</span>
              <span>Definition</span>
            </div>
          )}
          {data.topic && (
            <div className="mt-1.5">
              <Badge tone="brand" appearance="soft" size="xs">
                {data.topic}
              </Badge>
            </div>
          )}
        </div>
        <div className="text-3xl font-semibold text-background/20">&ldquo;</div>
      </div>

      <div className="flex flex-1 items-center justify-center px-2">
        <p
          className={cn(
            "text-balance text-center font-semibold tracking-tight text-background",
            TEXT_SIZE[size],
          )}
        >
          {data.back}
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-background/10 pt-4 font-mono text-xs uppercase tracking-wider text-background/55">
        <div className="flex items-center gap-1.5">
          {data.sourceFlag && (
            <span className="text-base leading-none" aria-hidden>
              {data.sourceFlag}
            </span>
          )}
          {data.source && <span>{data.source}</span>}
        </div>
        <span className="font-semibold normal-case italic tracking-tight">
          {data.front}
        </span>
      </div>
    </div>
  )
}