import { cn } from "@/lib/utils"
import type { FlashcardContent } from "@/types/flashcard"

type FaceProps = {
  data: FlashcardContent
  className?: string
}

export function CardFront({ data, className }: FaceProps) {
  return (
    <div
      className={cn(
        "ink-stamp flex h-full w-full flex-col justify-between rounded-[2rem] bg-paper p-8 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)]",
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
          className="text-balance text-center font-display text-[2.6rem] font-medium leading-[1.05] tracking-tight text-ink"
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

export function CardBack({ data, className }: FaceProps) {
  return (
    <div
      className={cn(
        "ink-stamp flex h-full w-full flex-col justify-between rounded-[2rem] bg-ink p-8 text-paper shadow-[0_30px_80px_-30px_rgba(0,0,0,0.4)]",
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
          className="text-pretty font-display text-[1.7rem] font-normal leading-[1.25] tracking-tight text-paper"
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
