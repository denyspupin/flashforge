import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// A keycap is typeset text, so its geometry is IDENTITY — fixed by the
// `size` prop and density-immune (like Label's text scale). `appearance` is the
// fill treatment (doctrine: fill is never named `variant`) — flat, borderless
// chips: `default` carries a subtle muted fill, `ghost` is transparent for
// quieter inline hints.
const kbdVariants = cva(
  "inline-flex w-fit select-none items-center justify-center gap-1 rounded-xs font-medium text-muted-foreground [&_svg]:shrink-0 [&_svg]:size-3",
  {
    variants: {
      appearance: {
        default: "bg-muted",
        ghost: "bg-transparent",
      },
      size: {
        sm: "h-5 min-w-5 px-1 text-xs", // 20px cap
        md: "h-6 min-w-6 px-1.5 text-xs", // 24px cap
        lg: "h-7 min-w-7 px-2 text-sm", // 28px cap
      },
    },
    defaultVariants: {
      appearance: "default",
      size: "md",
    },
  }
);

export type KbdProps = React.ComponentProps<"kbd"> &
  VariantProps<typeof kbdVariants>;

/**
 * A keyboard key cap — renders a `<kbd>` styling a single key or chord hint.
 *
 * Documentation: https://garn.ohuba.com/components/kbd
 */
function Kbd({ className, appearance, size, ...props }: KbdProps) {
  return (
    <kbd
      className={cn(kbdVariants({ appearance, size }), className)}
      data-slot="kbd"
      data-appearance={appearance ?? "default"}
      data-size={size ?? "md"}
      {...props}
    />
  );
}

/** Lays out a sequence of keys (⌘ + K, or "g then i") — the "+" / "then" separators are passed as children so consumers control phrasing. */
function KbdGroup({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center gap-1 text-xs text-muted-foreground",
        className
      )}
      data-slot="kbd-group"
      {...props}
    />
  );
}

export { Kbd, KbdGroup, kbdVariants };
