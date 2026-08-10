/**
 * The garn concentric-inset rule for nesting a container inside a container: a
 * child sits inset by its host's **padding**, and its corner radius = the host's
 * radius − that padding, so the two curves run parallel. Plain containers +
 * padding — no margins, no pseudo-elements. Both values are CSS custom properties
 * set on the host, so any surface reuses the rule:
 *
 *   <div className={cn(insetHost, "bg-card [--inset-radius:var(--radius-xl)] [--inset-gap:var(--garn-pad-surface)]")}>
 *     <div className={cn(insetChild, "bg-muted")}>…</div>
 *   </div>
 *
 * Defaults are the card radius (`--radius-xl`) and the surface padding. A child
 * whose concentric radius would be negative just renders square (the browser
 * clamps a negative border-radius to 0), so oversized gaps are safe.
 */

/** The padded HOST: its own radius + the inset padding. Override `--inset-radius`
 * (its radius) and `--inset-gap` (the padding) on the same element to taste. */
export const insetHost =
  "rounded-[var(--inset-radius,var(--radius-xl))] p-[var(--inset-gap,var(--garn-pad-surface))]";

/** An inset CHILD: a radius concentric to its host (host radius − padding). */
export const insetChild =
  "rounded-[calc(var(--inset-radius,var(--radius-xl))-var(--inset-gap,var(--garn-pad-surface)))]";
