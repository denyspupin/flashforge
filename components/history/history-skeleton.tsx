import { Skeleton } from "@/components/ui/skeleton"

export function HistoryFiltersSkeleton() {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Skeleton className="h-7 w-full sm:max-w-xs" />
      <Skeleton className="h-7 w-56" />
    </div>
  )
}

export function HistoryRowSkeleton() {
  return (
    <div className="ring-foreground/10 rounded-xl bg-card p-4 ring-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-5 w-20" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-16" />
      </div>
    </div>
  )
}

export function HistorySkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <HistoryFiltersSkeleton />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <HistoryRowSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
