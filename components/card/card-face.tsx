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
        "ink-stamp flex h-full w-full flex-col justify-between rounded-[2rem] bg-card p-6 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.3),0_2px_4px_-1px_rgba(0,0,0,0.1)] sm:p-8",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          {data.source && data.target && (
            <div className="flex flex-wrap items-center gap-1.5 font-mono-tag text-sm font-medium uppercase tracking-wider text-ink/70">
              {data.sourceFlag && (
                <span className="text-base leading-none" aria-hidden>
                  {data.sourceFlag}
                </span>
              )}
              <span>{data.source}</span>
              <span className="text-ink/30">→</span>
              {data.targetFlag && (
                <span className="text-base leading-none" aria-hidden>
                  {data.targetFlag}
                </span>
              )}
              <span>{data.target}</span>
            </div>
          )}
          {data.topic && (
            <div className="mt-1 font-mono-tag text-[10px] uppercase tracking-widest text-ember">
              {data.topic}
            </div>
          )}
        </div>
        <div className="font-display text-3xl text-ink/15">&ldquo;</div>
      </div>

      <div className="flex flex-1 items-center justify-center px-2">
        <h3
          className={cn(
            "text-balance text-center font-display font-medium tracking-tight text-ink",
            TEXT_SIZE[size],
          )}
          style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 60" }}
        >
          {data.front}
        </h3>
      </div>

      <div className="flex items-center justify-between text-xs text-ink/45">
        <span className="font-mono-tag uppercase tracking-wider">
          Press reveal to see meaning
        </span>
        <div className="flex items-center gap-1">
          <span className="h-1 w-1 rounded-full bg-ink/30" />
          <span className="h-1 w-1 rounded-full bg-ink/30" />
          <span className="h-1 w-1 rounded-full bg-ink/30" />
        </div>
      </div>
    </div>
  )
}

export function CardBack({ data, className, size = "default" }: FaceProps) {
  return (
    <div
      className={cn(
        "ink-stamp flex h-full w-full flex-col justify-between rounded-[2rem] bg-ink p-6 text-paper shadow-[0_30px_80px_-30px_rgba(0,0,0,0.4)] sm:p-8",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          {data.target && (
            <div className="flex flex-wrap items-center gap-1.5 font-mono-tag text-sm font-medium uppercase tracking-wider text-paper/70">
              {data.targetFlag && (
                <span className="text-base leading-none" aria-hidden>
                  {data.targetFlag}
                </span>
              )}
              <span>{data.target}</span>
              <span className="text-paper/40">·</span>
              <span>Definition</span>
            </div>
          )}
          {data.topic && (
            <div className="mt-1 font-mono-tag text-[10px] uppercase tracking-widest text-honey">
              {data.topic}
            </div>
          )}
        </div>
        <div className="font-display text-3xl text-paper/20">&ldquo;</div>
      </div>

      <div className="flex flex-1 items-center justify-center px-2">
        <p
          className={cn(
            "text-balance text-center font-display font-medium tracking-tight text-paper",
            TEXT_SIZE[size],
          )}
          style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 60" }}
        >
          {data.back}
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-paper/10 pt-4 text-sm text-paper/55">
        <div className="flex items-center gap-1.5 font-mono-tag uppercase tracking-wider">
          {data.sourceFlag && (
            <span className="text-base leading-none" aria-hidden>
              {data.sourceFlag}
            </span>
          )}
          {data.source && <span>{data.source}</span>}
        </div>
        <span
          className="font-display-soft italic"
          style={{ fontVariationSettings: "'opsz' 30, 'SOFT' 100" }}
        >
          {data.front}
        </span>
      </div>
    </div>
  )
}
