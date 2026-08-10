"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { FIELD_SURFACE_BASE, fieldAppearance } from "@/lib/field-variants";
import { useIsomorphicLayoutEffect } from "@/lib/use-isomorphic-layout-effect";
import { useResizeObserver } from "@/lib/use-resize-observer";

// A textarea shares the field surface + appearance (border · focus ring ·
// aria-invalid · disabled · outline/soft/ghost) with Input and Select, composed
// from FIELD_SURFACE_BASE + fieldAppearance so it can't drift. Only the geometry
// differs: it isn't a fixed-height control, so it derives horizontal padding from
// the control-px tokens and a min-height from the control height (2 rows ≈ 2× a
// control), and flows content from the top (no items-center).
const textareaVariants = cva(cn(FIELD_SURFACE_BASE, "flex"), {
  variants: {
    appearance: fieldAppearance,
    size: {
      xs: "min-h-[calc(var(--garn-control-h-xs)*2)] px-[var(--garn-control-px-xs)] py-1 text-xs",
      sm: "min-h-[calc(var(--garn-control-h-sm)*2)] px-[var(--garn-control-px-sm)] py-1.5 text-xs",
      md: "min-h-[calc(var(--garn-control-h-md)*2)] px-[var(--garn-control-px-md)] py-2 text-sm",
      lg: "min-h-[calc(var(--garn-control-h-lg)*2)] px-[var(--garn-control-px-lg)] py-2.5 text-base",
      xl: "min-h-[calc(var(--garn-control-h-xl)*2)] px-[var(--garn-control-px-xl)] py-3 text-base",
    },
  },
  defaultVariants: { appearance: "outline", size: "md" },
});

export interface TextareaProps
  extends React.ComponentProps<"textarea">,
    VariantProps<typeof textareaVariants> {
  /**
   * Grow to fit content instead of scrolling — re-measured on input and on width
   * changes (wrapping shifts height). The `size` min-height stays the floor; set
   * a `max-height` class to cap it (it starts scrolling past the cap).
   * @default false
   */
  autoResize?: boolean;
}

/**
 * A multi-line text field sharing the input control surface, with optional auto-resize to fit content.
 *
 * Documentation: https://garn.ohuba.com/components/textarea
 */
function Textarea({
  className,
  size,
  appearance,
  autoResize,
  ref,
  onInput,
  value,
  ...props
}: TextareaProps) {
  const innerRef = React.useRef<HTMLTextAreaElement>(null);

  // Merge our measuring ref with any ref the consumer passed.
  const setRefs = React.useCallback(
    (node: HTMLTextAreaElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.RefObject<HTMLTextAreaElement | null>).current = node;
    },
    [ref]
  );

  const fitHeight = React.useCallback(() => {
    const el = innerRef.current;
    if (!el || !autoResize) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [autoResize]);

  // Re-fit on mount and whenever the (controlled) value changes — before paint
  // (no flash), SSR-safe.
  useIsomorphicLayoutEffect(() => {
    fitHeight();
  }, [fitHeight, value]);

  // Re-fit when the width changes (rewrapping alters height) — guarded so the
  // height we set doesn't feed back into the observer as a resize loop.
  const prevWidth = React.useRef(-1);
  useResizeObserver(innerRef, (entry) => {
    if (!autoResize) return;
    const w = entry.contentRect.width;
    if (w === prevWidth.current) return;
    prevWidth.current = w;
    fitHeight();
  });

  return (
    <textarea
      ref={setRefs}
      className={cn(
        textareaVariants({ appearance, size, className }),
        autoResize && "resize-none overflow-hidden"
      )}
      data-slot="textarea"
      data-size={size ?? "md"}
      data-appearance={appearance ?? "outline"}
      value={value}
      onInput={(e) => {
        fitHeight();
        onInput?.(e);
      }}
      {...props}
    />
  );
}

export { Textarea, textareaVariants };
