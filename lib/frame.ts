import { cn } from "./utils";

/**
 * The garn "framed surface" signature — a thin frosted strip around an inner
 * container. The host is the OUTER frame (a semi-transparent white fill that lets
 * the backdrop show through, frosted via backdrop-blur, with a soft ambient
 * shadow); a `::before` draws the INNER container — a 3px strip in, with a light
 * adaptive hairline — sitting behind the content. The gap between the two is the
 * frosted strip. All values are semantic tokens, so it flips in dark mode and
 * degrades to a solid surface where `backdrop-filter` is unsupported (e.g.
 * forced-colors). Shared so every framed surface (Card `glass`, Dialog, …) reads
 * identically and is tuned in one place.
 *
 * Usage: spread `frameSurface` + `frameFill` onto an elevated surface. The host
 * must establish a positioned context for the `::before` — `relative` for an
 * in-flow surface (e.g. Card), already covered by `fixed` on an overlay (e.g.
 * Dialog). Content renders in normal flow, above the `::before` (which sits at
 * z-index -10). `isolate` scopes that negative layer to the host.
 */
export const frameSurface = cn(
  "isolate border backdrop-blur-xl shadow-surface-overlay",
  "before:pointer-events-none before:absolute before:inset-[var(--garn-space-3)] before:-z-10 before:rounded-[inherit] before:border before:border-border before:bg-card"
);

/**
 * The outer frame's fill + edge. The fill is a semi-transparent white whose
 * opacity is the `--garn-frame-strip-alpha` token, so a surface over a dim backdrop
 * (Dialog / overlays) can raise it locally — `[--garn-frame-strip-alpha:75%]` —
 * to keep the strip light instead of muddy, without forking the recipe. The outer
 * edge is a barely-there hairline in the same white, 5% more solid than the strip
 * (so it tracks the strip automatically) — a faint glass rim that defines the
 * frame against the backdrop. The inner container's own hairline lives in
 * {@link frameSurface}. Kept separate from `frameSurface` so a host with a `tone`
 * axis can gate it behind the neutral cell (avoiding a background-utility collision
 * with tone fills). Hosts without a tone axis just spread it alongside.
 */
export const frameFill =
  "bg-[color-mix(in_srgb,var(--garn-surface-overlay)_var(--garn-frame-strip-alpha),transparent)] border-[color-mix(in_srgb,var(--garn-surface-overlay)_calc(var(--garn-frame-strip-alpha)+5%),transparent)]";

/**
 * The opaque counterpart to {@link frameSurface}: a plain raised panel — hairline
 * border, solid `bg-popover` fill, overlay shadow. This is the right surface for
 * an anchored popup (Select, Combobox, MultiSelect, DatePicker, …), which floats
 * over unscrimmed page content where the frosted glass has no dim backdrop to
 * frost against. Glass is reserved for surfaces shown over a scrim (Dialog and
 * friends), and stays an opt-in on the anchored popups.
 */
export const solidSurface = "border bg-popover shadow-md";
