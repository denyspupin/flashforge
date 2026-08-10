import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// The outer padding and the gaps between media / header / content are AIR (they
// scale with [data-density] via the --garn-pad/gap tokens); the media tile,
// title, and body text are IDENTITY (fixed geometry / type, sized in code).
/**
 * A centred empty-state surface — media, a title/description, and an optional
 * action — for a zero-results view, a first-run screen, or a cleared list.
 *
 * Documentation: https://garn.ohuba.com/components/empty
 */
function Empty({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-[var(--garn-gap-stack)] text-balance rounded-xl p-[var(--garn-pad-surface)] text-center",
        className
      )}
      data-slot="empty"
      {...props}
    />
  );
}

/** Stacks the media, title, and description at the top of the empty state. */
function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex max-w-sm flex-col items-center gap-[var(--garn-gap-field)] text-center",
        className
      )}
      data-slot="empty-header"
      {...props}
    />
  );
}

// `icon` gives a tonal rounded tile (for a single lucide icon); `default` is a
// bare slot for custom illustrations or an Avatar. Tile and icon geometry are
// identity (fixed, density-immune).
/** Class recipe for the empty-state media holder across the `default` / `icon` variants. */
const emptyMediaVariants = cva(
  "flex shrink-0 items-center justify-center [&_svg]:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-transparent [&_svg]:size-8",
        icon: "size-12 rounded-xl bg-muted text-foreground [&_svg]:size-6",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export type EmptyMediaProps = React.ComponentProps<"div"> &
  VariantProps<typeof emptyMediaVariants>;

/** The media holder — a tonal rounded tile (`variant="icon"`) or a bare slot for an illustration. */
function EmptyMedia({ className, variant, ...props }: EmptyMediaProps) {
  return (
    <div
      className={cn(emptyMediaVariants({ variant }), className)}
      data-variant={variant ?? "default"}
      data-slot="empty-media"
      {...props}
    />
  );
}

/** The empty state's headline. */
function EmptyTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("text-lg font-semibold tracking-tight", className)}
      data-slot="empty-title"
      {...props}
    />
  );
}

/** Supporting text under the title. */
function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "text-sm leading-relaxed text-muted-foreground",
        className
      )}
      data-slot="empty-description"
      {...props}
    />
  );
}

/** A slot below the header for actions — a button, a link, or a short form. */
function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex w-full max-w-sm flex-col items-center gap-[var(--garn-gap-field)] text-balance text-sm",
        className
      )}
      data-slot="empty-content"
      {...props}
    />
  );
}

export {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  emptyMediaVariants,
};
