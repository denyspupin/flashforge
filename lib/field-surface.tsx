"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";
import { FIELD_SURFACE_BASE, fieldAppearance } from "./field-variants";

/**
 * FieldSurface — the wrapper-flavored field surface: the host `<div>` an enriched
 * control renders when the visible surface is a box *around* a borderless input
 * (Input's wrapped path, the date/time picker shells). The element-is-surface
 * path (bare Input, the Select and Combobox triggers) consumes `fieldVariants`
 * directly; this file is the same recipe re-expressed for a wrapper:
 *
 *   • focus is read off the inner input via `:has(input:focus)` /
 *     `:has(input:focus-visible)` (the wrapper itself is never focusable);
 *   • invalid/disabled/loading arrive as props and reflect to `data-*` (the
 *     wrapper can't carry `aria-invalid` — the inner input does);
 *   • `hasLeading`/`hasTrailing` reflect to `data-leading`/`data-trailing`,
 *     which trim the populated side's padding by the icon inset (the `--in-px`
 *     optical pad-trim idiom).
 *
 * The recipe is COMPOSED from `FIELD_SURFACE_BASE` + `fieldAppearance`, so the
 * surface colors exist once (in field-variants.ts) and bare vs wrapped cannot
 * drift; only the wrapper bridge selectors are added here. The host also owns
 * focus-forward-on-padding-mousedown (clicking empty padding or a decorative
 * icon focuses the field; a real button/link inside a slot wins), and keeps the
 * child tree stable so the inner input never remounts when adornments toggle.
 */

// Wrapper bridge: the base's pseudo-state styles are no-ops on a div, so the
// same states are re-targeted at :has(input:…) and data-* here. background-color
// is in the transition list so a soft fill fades smoothly on focus.
const FIELD_SURFACE_WRAPPER = cn(
  "group/field flex cursor-text items-center transition-[color,background-color,border-color,box-shadow] motion-reduce:transition-none",
  "ps-[var(--in-ps,var(--in-px))] pe-[var(--in-pe,var(--in-px))]",
  "data-[leading]:[--in-ps:calc(var(--in-px)_-_var(--garn-control-icon-inset))]",
  "data-[trailing]:[--in-pe:calc(var(--in-px)_-_var(--garn-control-icon-inset))]",
  "has-[input:focus]:border-foreground/40 has-[input:focus-visible]:outline-hidden has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-foreground/15",
  "data-[invalid]:border-danger data-[invalid]:has-[input:focus]:border-danger data-[invalid]:has-[input:focus-visible]:ring-danger/40",
  "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
);

// Same appearance values as the bare recipe (imported, not copied); each axis
// entry only adds the wrapper-selector twin of a bare pseudo-state.
export const fieldSurfaceVariants = cva(
  cn(FIELD_SURFACE_BASE, FIELD_SURFACE_WRAPPER),
  {
    variants: {
      appearance: {
        outline: cn(
          fieldAppearance.outline,
          "data-[invalid]:hover:border-danger"
        ),
        soft: cn(fieldAppearance.soft, "has-[input:focus]:bg-transparent"),
        ghost: fieldAppearance.ghost,
      },
      // Height/text/icon per rung match `fieldVariants`; padding routes through
      // the local `--in-px` (so the pad-trim above stays size-agnostic) and the
      // slot gap tracks the rung.
      size: {
        xs: "h-[var(--garn-control-h-xs)] gap-1 [--in-px:var(--garn-control-px-xs)] text-xs [&_svg]:size-3.5",
        sm: "h-[var(--garn-control-h-sm)] gap-1.5 [--in-px:var(--garn-control-px-sm)] text-xs [&_svg]:size-3.5",
        md: "h-[var(--garn-control-h-md)] gap-2 [--in-px:var(--garn-control-px-md)] text-sm [&_svg]:size-4",
        lg: "h-[var(--garn-control-h-lg)] gap-2 [--in-px:var(--garn-control-px-lg)] text-base [&_svg]:size-5",
        xl: "h-[var(--garn-control-h-xl)] gap-2.5 [--in-px:var(--garn-control-px-xl)] text-base [&_svg]:size-5",
      },
    },
    defaultVariants: { appearance: "outline", size: "md" },
  }
);

// The borderless inner input a FieldSurface hosts: the wrapper owns
// border/ring/padding/fill. `[font:inherit]` makes the control inherit the
// wrapper's text size (form controls don't inherit font by default). Themed
// caret/selection + suppressed native search-cancel match the bare path.
export const NAKED_INPUT =
  "h-full min-w-0 flex-1 border-0 bg-transparent p-0 [font:inherit] text-foreground caret-foreground outline-none selection:bg-brand-solid/20 placeholder:text-muted-foreground file:border-0 file:bg-transparent file:font-medium disabled:cursor-not-allowed [&::-webkit-search-cancel-button]:appearance-none";

// Shared look for in-field affordance buttons (clear / reveal / calendar / …).
export const AFFORDANCE_BTN =
  "inline-flex shrink-0 items-center justify-center rounded-full p-0.5 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none disabled:pointer-events-none";

export interface FieldSurfaceProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof fieldSurfaceVariants> {
  /** The root's `data-slot` (each consumer keeps its own vocabulary). */
  slot?: string;
  /** Bridged to `data-invalid` (the inner input carries the real aria-invalid). */
  invalid?: boolean;
  /** Bridged to `data-disabled` (+ the inner input's own disabled attribute). */
  disabled?: boolean;
  /** Bridged to `data-loading`. */
  loading?: boolean;
  /** A leading slot is populated — trims the start padding by the icon inset. */
  hasLeading?: boolean;
  /** A trailing zone is populated — trims the end padding by the icon inset. */
  hasTrailing?: boolean;
}

function FieldSurface({
  slot = "field-surface",
  appearance,
  size,
  invalid,
  disabled,
  loading,
  hasLeading,
  hasTrailing,
  className,
  onMouseDown,
  children,
  ...props
}: FieldSurfaceProps) {
  // Focus-forward: a mousedown on empty padding / a decorative icon focuses the
  // inner input instead of stealing focus to the div; clicking the input itself
  // (normal caret placement) or a real interactive child is left alone.
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    onMouseDown?.(e);
    if (e.defaultPrevented) return;
    const input = e.currentTarget.querySelector<HTMLElement>(
      "input:not([type=hidden]), textarea"
    );
    const target = e.target as HTMLElement;
    if (!input || target === input) return;
    if (target.closest("button, a, input, textarea, select, label, [tabindex]"))
      return;
    e.preventDefault();
    input.focus();
  };

  return (
    // Props spread FIRST so the computed surface attributes win — e.g. a Radix
    // `Anchor asChild` merge injects its own data-slot, which must not clobber
    // the consumer's (the `slot` prop is the override channel).
    <div
      {...props}
      data-slot={slot}
      data-appearance={appearance ?? "outline"}
      data-size={size ?? "md"}
      data-invalid={invalid ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      data-loading={loading ? "" : undefined}
      data-leading={hasLeading ? "" : undefined}
      data-trailing={hasTrailing ? "" : undefined}
      className={cn(fieldSurfaceVariants({ appearance, size }), className)}
      onMouseDown={handleMouseDown}
    >
      {children}
    </div>
  );
}

export { FieldSurface };
