import { cn } from "@/lib/utils"
import type { FlashcardContent } from "@/types/flashcard"

type FaceProps = {
  data: FlashcardContent
  className?: string
  size?: "default" | "lg"
}

const TERM_SIZE: Record<NonNullable<FaceProps["size"]>, string> = {
  default: "text-[2.6rem] leading-[1.05] sm:text-[2.6rem]",
  lg: "text-[2.4rem] leading-[1.05] sm:text-[3.4rem] sm:leading-[1.02]",
}

const DEFINITION_SIZE: Record<NonNullable<FaceProps["size"]>, string> = {
  default: "text-[1.7rem] leading-[1.25]",
  lg: "text-[1.5rem] leading-[1.25] sm:text-[2.1rem] sm:leading-[1.2]",
}

export function CardFront({ data, className, size = "default" }: FaceProps) {
  return (
    <div
      className={cn(
        "ink-stamp flex h-full w-full flex-col justify-between rounded-[2rem] bg-paper p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] sm:p-8",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          {data.source && data.target && (
            <div className="font-mono-tag text-[10px] uppercase tracking-widest text-ink/45">
              {data.source} → {data.target}
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
            TERM_SIZE[size],
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
            <div className="font-mono-tag text-[10px] uppercase tracking-widest text-paper/55">
              Definition · {data.target}
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

      <div className="flex flex-1 items-center">
        <p
          className={cn(
            "text-pretty font-display font-normal tracking-tight text-paper",
            DEFINITION_SIZE[size],
          )}
          style={{ fontVariationSettings: "'opsz' 100, 'SOFT' 50" }}
        >
          {data.back}
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-paper/10 pt-4 text-xs text-paper/55">
        {data.source && (
          <span className="font-mono-tag uppercase tracking-wider">
            {data.source}
          </span>
        )}
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
