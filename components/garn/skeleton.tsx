import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A pulsing placeholder block that reserves a piece of layout while its real
 * content loads — size it with `className` (width/height/shape).
 *
 * Documentation: https://garn.ohuba.com/components/skeleton
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      data-slot="skeleton"
      {...props}
    />
  );
}
Skeleton.displayName = "Skeleton";

export { Skeleton };
