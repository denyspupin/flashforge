import { cva } from "class-variance-authority";

import { cn } from "./utils";

/**
 * The shared field surface — one source of truth for the control look every form
 * field renders: border, control height + horizontal padding (the
 * `--garn-control-*` tokens), hover, focus-visible ring, `aria-invalid`, and
 * disabled, on the `appearance` (outline · soft · ghost) × `size` (xs–xl) axes.
 *
 * Input (bare path), the Select trigger, and future single-line triggers consume
 * `fieldVariants` directly. Textarea — a height-flexible control, not a fixed-row
 * one — composes the geometry-independent `FIELD_SURFACE_BASE` + `fieldAppearance`
 * with its own min-height/padding geometry, so the surface + fill can't drift even
 * though the box shape differs. Extracted per building-components/styling.mdx
 * ("extract repeated patterns") to end the Input↔Select↔Textarea drift.
 */

// Geometry-independent surface: the `border` WIDTH is always present (its COLOR
// comes from the appearance) so the focus outline never shifts layout; no drop
// shadow. Focus grows the edge to foreground/40 (by click or keyboard); keyboard
// focus adds the neutral ring the wall requires; invalid swaps edge + ring to
// danger. Text niceties (themed caret/selection, file-button reset, suppressed
// native search-cancel ✕) are pseudo-targeted, so they're no-ops on a Select
// trigger button or a Textarea.
export const FIELD_SURFACE_BASE =
  "w-full rounded-md border transition-colors caret-foreground selection:bg-brand-solid/20 file:border-0 file:bg-transparent file:font-medium placeholder:text-muted-foreground focus:border-foreground/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-foreground/15 aria-invalid:border-danger aria-invalid:focus:border-danger aria-invalid:focus-visible:ring-danger/40 disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-search-cancel-button]:appearance-none";

// The appearance (fill) axis — identical across every field control. Kept
// orthogonal to invalid/danger, which is a *state* layered on any appearance.
export const fieldAppearance = {
  // bordered, transparent fill — the edge darkens on hover/focus.
  outline:
    "border-foreground/15 bg-transparent hover:border-foreground/25 aria-invalid:hover:border-danger",
  // subtle neutral fill, no visible edge — on focus the fill clears and the full
  // outline appears (it becomes the outline appearance).
  soft: "border-transparent bg-foreground/5 hover:bg-foreground/[0.08] focus:bg-transparent",
  // seamless — no fill, no edge until focus; a faint fill on hover hints it is
  // editable (inline / table-cell fields).
  ghost: "border-transparent bg-transparent hover:bg-foreground/5",
} as const;

// Single-line control surface (Input bare path, Select trigger, future triggers):
// fixed height + horizontal padding + text size + icon size from the control
// tokens, so every field tracks the size scale and the active density mode.
export const fieldVariants = cva(cn(FIELD_SURFACE_BASE, "flex items-center"), {
  variants: {
    appearance: fieldAppearance,
    size: {
      xs: "h-[var(--garn-control-h-xs)] px-[var(--garn-control-px-xs)] text-xs file:text-xs [&_svg]:size-3.5",
      sm: "h-[var(--garn-control-h-sm)] px-[var(--garn-control-px-sm)] text-xs file:text-xs [&_svg]:size-3.5",
      md: "h-[var(--garn-control-h-md)] px-[var(--garn-control-px-md)] text-sm file:text-sm [&_svg]:size-4",
      lg: "h-[var(--garn-control-h-lg)] px-[var(--garn-control-px-lg)] text-base file:text-base [&_svg]:size-5",
      xl: "h-[var(--garn-control-h-xl)] px-[var(--garn-control-px-xl)] text-base file:text-base [&_svg]:size-5",
    },
  },
  defaultVariants: { appearance: "outline", size: "md" },
});
