"use client";

// #region imports — dependencies
import * as React from "react";
import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { useAnnounce } from "@/lib/use-announce";
import { useIsomorphicLayoutEffect } from "@/lib/use-isomorphic-layout-effect";
// #endregion imports

// #region variants — fill × tone × size matrix
const buttonVariants = cva(
  // Base: layout + motion + focus ring + disabled. `relative` anchors the loading
  // spinner overlay. Sizing (height, padding, text, icon scale) lives in `size`
  // and is driven by the locked --garn-control-* tokens so every control snaps to
  // the same 24/28/32/40/44 grid. The [&_svg] rules size any icon — in the label,
  // a slot, or the spinner — to the active rung.
  // Horizontal padding is applied as LOGICAL ps/pe reading a per-instance
  // --btn-px (set by each text size; absent on icon sizes → falls back to
  // --garn-space-0, i.e. square). Splitting the two sides lets the component
  // override one side's var (--btn-ps / --btn-pe) for the optical icon trim
  // without ever colliding with a `px-*` shorthand.
  // Focus ring is COLOR-ALIGNED and HUGS the button: a 3px ring (no offset) in
  // the variant's own fill (--btn-fill, set by every filled variant; falls back
  // to the brand ring for the rest), darkened 18% so even amber clears the 3:1
  // non-text contrast. Forced-colors (Windows HCM): box-shadows are dropped
  // there, so outline-hidden leaves a transparent outline the OS makes visible
  // for focus, and forced-colors:border gives every button a real edge;
  // disabled → GrayText.
  // PRESS: the button does NOT move. No sink, no squash — pressing is reported
  // by color alone (each fill's `active:` darken). A control that shifts under
  // the cursor costs more than the feel is worth: it drags on every click, it
  // tears the seam in an attached cluster, and it reads as instability rather
  // than tactility. `transform` stays in the transition list so a consumer who
  // does want to move one still gets a curve.
  "relative inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md font-medium ps-[var(--btn-ps,var(--btn-px,var(--garn-space-0)))] pe-[var(--btn-pe,var(--btn-px,var(--garn-space-0)))] transition-[color,background-color,border-color,box-shadow,transform] focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 forced-colors:border disabled:forced-colors:text-[GrayText] disabled:forced-colors:border-[GrayText] [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      // FILL / EMPHASIS axis. Per the variant doctrine, `variant` normally names a
      // kind/structural axis — Button is the ONE named exception: its `variant` is
      // the action-emphasis axis (fill treatment), and color intent lives on the
      // orthogonal `tone` axis below. Each value here defines the NEUTRAL-tone look;
      // `tone` recolors default/soft/outline/ghost via compoundVariants.
      //
      // FILLED fills (default) share a darken-on-hover derived from --btn-fill
      // (color-mix) — the conventional "press = darker" feel. active darkens further.
      variant: {
        // default = SOLID. Every solid wears a subtle 1px INNER borderline — an
        // inset shadow in a darker mix of its own fill (--btn-edge) that defines
        // the button's edge without adding size or clashing with the focus ring
        // (inset shadow and ring compose). Hover/active darken toward the edge
        // color, so the fill "settles into" its own rim as you press. The
        // near-black neutral needs stronger mixes than the tonal solids for the
        // same perceived step; the same formula flips with the inverted neutral
        // in dark mode, so the light fill there darkens identically.
        default:
          "bg-neutral-solid text-neutral-solid-foreground [--btn-fill:var(--garn-neutral-solid)] ring-1 ring-inset ring-black/20 hover:bg-[color-mix(in_srgb,var(--btn-fill),black_20%)] active:bg-[color-mix(in_srgb,var(--btn-fill),black_32%)]",
        // soft = a tinted surface for a low-emphasis action. At tone=neutral this is
        // the neutral second-tier fill (the former `secondary`); a tone recolors it.
        // Hover/active DARKEN the tint (color-mix toward black), matching the filled
        // "press = darker" feel rather than fading it lighter via transparency.
        soft:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_srgb,var(--garn-secondary),black_6%)] active:bg-[color-mix(in_srgb,var(--garn-secondary),black_12%)]",
        // outline keeps its airy look. Neutral hover/active use the relative state
        // layers (bg-state-*) so they read on a tinted section, not just a white
        // page; the tonal outline/ghost cells below keep their own tone-relative
        // hover:bg-<tone>/N and win the twMerge.
        outline:
          "border border-input bg-background hover:bg-state-hover active:bg-state-active",
        ghost: "hover:bg-state-hover active:bg-state-active",
        // link renders as inline text; tone-inert (always the brand link color).
        link: "text-brand underline-offset-4 hover:underline",
      },
      // TONE axis (color intent) — the shared vocabulary. `neutral` is carried by
      // the variant base above; the other tones recolor each fill in compoundVariants,
      // and set --btn-fill so the focus ring + solid hover/active mix match the tone.
      tone: {
        neutral: "",
        brand: "",
        danger: "",
        success: "",
        warning: "",
      },
      // Heights/paddings consume the Tier-2 control tokens (never raw px),
      // so they track both the size scale and the active density mode.
      // Each TEXT rung also mirrors its height into --btn-h, which is what the
      // `description` layout falls back to for min-height once the fixed `h-*`
      // is released (see the description handling in Button).
      size: {
        xs: "h-[var(--garn-control-h-xs)] [--btn-h:var(--garn-control-h-xs)] gap-1 rounded-sm [--btn-px:var(--garn-control-px-xs)] text-xs [&_svg]:size-3.5",
        sm: "h-[var(--garn-control-h-sm)] [--btn-h:var(--garn-control-h-sm)] gap-1.5 [--btn-px:var(--garn-control-px-sm)] text-xs [&_svg]:size-4",
        md: "h-[var(--garn-control-h-md)] [--btn-h:var(--garn-control-h-md)] gap-2 [--btn-px:var(--garn-control-px-md)] text-sm [&_svg]:size-4",
        lg: "h-[var(--garn-control-h-lg)] [--btn-h:var(--garn-control-h-lg)] gap-2 [--btn-px:var(--garn-control-px-lg)] text-sm [&_svg]:size-5",
        xl: "h-[var(--garn-control-h-xl)] [--btn-h:var(--garn-control-h-xl)] gap-2.5 [--btn-px:var(--garn-control-px-xl)] text-base [&_svg]:size-5",
        "icon-xs": "size-[var(--garn-control-h-xs)] rounded-sm [&_svg]:size-3.5",
        "icon-sm": "size-[var(--garn-control-h-sm)] [&_svg]:size-4",
        icon: "size-[var(--garn-control-h-md)] [&_svg]:size-4",
        "icon-lg": "size-[var(--garn-control-h-lg)] [&_svg]:size-5",
        "icon-xl": "size-[var(--garn-control-h-xl)] [&_svg]:size-5",
      },
      // CONTENT ALIGNMENT — only observable once the button is wider than its
      // content (`fullWidth`, a grid cell, a menu-like row). `between` pushes the
      // leading/trailing slots to the edges, which is the nav-row / disclosure
      // look; `start` left-aligns the whole run.
      justify: {
        center: "justify-center",
        start: "justify-start",
        between: "justify-between",
      },
      // Fills the inline axis of its container instead of hugging its content.
      // `shrink-0` from the base would otherwise keep it at content width inside
      // a flex parent, so it is released here.
      fullWidth: {
        true: "w-full shrink",
        false: "",
      },
    },
    // tone × fill matrix. One cell per (tone, variant) for the four color-bearing
    // fills; `default`(solid) only recolors + darkens toward black on hover.
    // outline/ghost tint the border/label + hover wash.
    // secondary + link take no tone (inert). twMerge (via cn at the call site) lets
    // each cell override the neutral base, and dedupes the two --btn-fill declarations.
    compoundVariants: [
      // ── brand ───────────────────────────────────────────────────────────────
      {
        tone: "brand",
        variant: "default",
        class:
          "bg-brand-solid text-brand-solid-foreground [--btn-fill:var(--garn-brand-solid)] ring-1 ring-inset ring-black/15 hover:bg-[color-mix(in_srgb,var(--btn-fill),black_8%)] active:bg-[color-mix(in_srgb,var(--btn-fill),black_16%)]",
      },
      {
        tone: "brand",
        variant: "soft",
        class:
          "bg-brand-subtle text-brand-subtle-foreground [--btn-fill:var(--garn-brand-solid)] hover:bg-[color-mix(in_srgb,var(--garn-brand-subtle),black_6%)] active:bg-[color-mix(in_srgb,var(--garn-brand-subtle),black_12%)]",
      },
      {
        tone: "brand",
        variant: "outline",
        class:
          "border-brand/40 text-brand [--btn-fill:var(--garn-brand-solid)] hover:bg-brand-solid/10 hover:text-brand active:bg-brand-solid/15",
      },
      {
        tone: "brand",
        variant: "ghost",
        class:
          "text-brand [--btn-fill:var(--garn-brand-solid)] hover:bg-brand-solid/10 hover:text-brand active:bg-brand-solid/15",
      },
      // ── danger ──────────────────────────────────────────────────────────────
      {
        tone: "danger",
        variant: "default",
        class:
          "bg-danger-solid text-danger-solid-foreground [--btn-fill:var(--garn-danger-solid)] ring-1 ring-inset ring-black/15 hover:bg-[color-mix(in_srgb,var(--btn-fill),black_8%)] active:bg-[color-mix(in_srgb,var(--btn-fill),black_16%)]",
      },
      {
        tone: "danger",
        variant: "soft",
        class:
          "bg-danger-subtle text-danger-foreground [--btn-fill:var(--garn-danger-solid)] hover:bg-[color-mix(in_srgb,var(--garn-danger-subtle),black_6%)] active:bg-[color-mix(in_srgb,var(--garn-danger-subtle),black_12%)]",
      },
      {
        tone: "danger",
        variant: "outline",
        class:
          "border-danger-solid/40 text-danger-solid [--btn-fill:var(--garn-danger-solid)] hover:bg-danger-solid/10 hover:text-danger-solid active:bg-danger-solid/15",
      },
      {
        tone: "danger",
        variant: "ghost",
        class:
          "text-danger-solid [--btn-fill:var(--garn-danger-solid)] hover:bg-danger-solid/10 hover:text-danger-solid active:bg-danger-solid/15",
      },
      // ── success ─────────────────────────────────────────────────────────────
      {
        tone: "success",
        variant: "default",
        class:
          "bg-success-solid text-success-solid-foreground [--btn-fill:var(--garn-success-solid)] ring-1 ring-inset ring-black/15 hover:bg-[color-mix(in_srgb,var(--btn-fill),black_8%)] active:bg-[color-mix(in_srgb,var(--btn-fill),black_16%)]",
      },
      {
        tone: "success",
        variant: "soft",
        class:
          "bg-success-subtle text-success-foreground [--btn-fill:var(--garn-success-solid)] hover:bg-[color-mix(in_srgb,var(--garn-success-subtle),black_6%)] active:bg-[color-mix(in_srgb,var(--garn-success-subtle),black_12%)]",
      },
      {
        tone: "success",
        variant: "outline",
        class:
          "border-success/40 text-success-foreground [--btn-fill:var(--garn-success-solid)] hover:bg-success/10 hover:text-success-foreground active:bg-success/15",
      },
      {
        tone: "success",
        variant: "ghost",
        class:
          "text-success-foreground [--btn-fill:var(--garn-success-solid)] hover:bg-success/10 hover:text-success-foreground active:bg-success/15",
      },
      // ── warning ─────────────────────────────────────────────────────────────
      {
        tone: "warning",
        variant: "default",
        class:
          "bg-warning-solid text-warning-solid-foreground [--btn-fill:var(--garn-warning-solid)] ring-1 ring-inset ring-black/15 hover:bg-[color-mix(in_srgb,var(--btn-fill),black_8%)] active:bg-[color-mix(in_srgb,var(--btn-fill),black_16%)]",
      },
      {
        tone: "warning",
        variant: "soft",
        class:
          "bg-warning-subtle text-warning-foreground [--btn-fill:var(--garn-warning-solid)] hover:bg-[color-mix(in_srgb,var(--garn-warning-subtle),black_6%)] active:bg-[color-mix(in_srgb,var(--garn-warning-subtle),black_12%)]",
      },
      {
        tone: "warning",
        variant: "outline",
        class:
          "border-warning/40 text-warning-foreground [--btn-fill:var(--garn-warning-solid)] hover:bg-warning/10 hover:text-warning-foreground active:bg-warning/15",
      },
      {
        tone: "warning",
        variant: "ghost",
        class:
          "text-warning-foreground [--btn-fill:var(--garn-warning-solid)] hover:bg-warning/10 hover:text-warning-foreground active:bg-warning/15",
      },
    ],
    defaultVariants: {
      variant: "default",
      tone: "neutral",
      size: "md",
      justify: "center",
      fullWidth: false,
    },
  }
);
// #endregion variants

// #region types — public surface
export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;
export type ButtonTone = NonNullable<VariantProps<typeof buttonVariants>["tone"]>;
export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>;

/**
 * The async lifecycle of the action the button triggers. A superset of
 * `loading` (which stays as sugar for `state="loading"`), so a button can also
 * report how the work *ended* instead of silently snapping back to rest.
 */
export type ButtonState = "idle" | "loading" | "success" | "error";

/** The subset of Button props a `SplitButton` ancestor can supply as defaults. */
export interface ButtonDefaults {
  variant?: ButtonVariant;
  tone?: ButtonTone;
  size?: ButtonSize;
  disabled?: boolean;
}

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  /**
   * Render as the single child element (via Radix `Slot`) instead of a native
   * `<button>` — for wrapping a link or a menu trigger while keeping the styling.
   * @default false
   */
  asChild?: boolean;
  /**
   * Content placed before the label — an icon, badge, counter, kbd hint, etc.
   * Fixed width (never shrinks); only the label truncates.
   */
  leading?: React.ReactNode;
  /**
   * Content placed after the label — an icon, badge, kbd hint, etc.
   * Fixed width (never shrinks); only the label truncates.
   */
  trailing?: React.ReactNode;
  /**
   * Shows a spinner and makes the button inert while keeping it FOCUSABLE
   * (`aria-disabled` + an internal activation guard, never native `disabled` —
   * that would drop focus to `<body>` mid-flight). Also sets `aria-busy` and
   * announces to the shared live region. Sugar for `state="loading"`.
   *
   * Width is preserved — the resting content is hidden in place and the spinner
   * is centered over it, so there's no layout shift.
   * @default false
   */
  loading?: boolean;
  /**
   * Optional label shown while `loading` (e.g. "Saving…"). When provided the
   * spinner sits inline before this text instead of overlaying the content.
   */
  loadingText?: React.ReactNode;
  /**
   * Full async lifecycle, for actions that should resolve visibly rather than
   * just stop spinning: `success` / `error` swap the spinner for a check or
   * cross that draws in, and announce completion. Controlled — pair it with
   * `onStateChange` to have the resolution clear itself.
   */
  state?: ButtonState;
  /**
   * Called when the button asks for a different `state` — today only to request
   * `"idle"`, once a `success`/`error` resolution has been on screen long
   * enough to read. Wire it to the same setter that drives `state` and the
   * reset chore disappears:
   *
   * ```tsx
   * <Button state={state} onStateChange={setState} onClick={run}>Publish</Button>
   * ```
   *
   * Leave it off and the resolution holds until you clear it yourself. The
   * button never changes `state` on its own — it only asks, so the value stays
   * yours.
   */
  onStateChange?: (state: ButtonState) => void;
  /**
   * Secondary, de-emphasized line under the label — the compound-button shape
   * used for dense choice UIs and onboarding CTAs. Stacks the label into a
   * column and lets the button grow taller than its size rung. Requires a
   * label; not valid on the icon-only sizes.
   *
   * It renders as ordinary content, so it JOINS the accessible name after the
   * label ("Share publicly, Anyone with the link can view") — which is the
   * point: the choice a compound button offers is both lines, and a screen
   * reader user picking between them needs both. Keep it to a short phrase;
   * pass `aria-label` if the spoken name should stay the bare verb.
   */
  description?: React.ReactNode;
}
// #endregion types

// #region context — SplitButton defaults
/**
 * Lets a wrapper (today: `SplitButton`) hand shared styling + `disabled` down to
 * every Button beneath it, so a split button's two halves can't drift apart
 * without the consumer repeating four props on each. A prop set directly on a
 * Button always wins over the context value.
 *
 * Provided by `button-group.tsx`; consumed here so Button stays the single
 * owner of the props it resolves. Exported deliberately — a consumer building
 * their own attached cluster needs the same lever, and there is no provider
 * component to hand them instead.
 */
const SplitButtonContext = React.createContext<ButtonDefaults | null>(null);

// How the `description` line earns its de-emphasis, per fill. A solid carries
// its own contrast-checked `*-solid-foreground`; dimming that with alpha eats
// straight into the ratio, and at text-xs there is none to spare — so on solids
// the secondary line is de-emphasized by SIZE AND WEIGHT alone. The airy fills
// sit on the page surface, where `muted-foreground` is the contrast-checked
// semantic answer. Literal classes in a literal map, never assembled.
const DESCRIPTION_EMPHASIS: Record<string, string> = {
  default: "",
  soft: "text-muted-foreground",
  outline: "text-muted-foreground",
  ghost: "text-muted-foreground",
  link: "text-muted-foreground",
};

/** The icon-only rung matching each text rung — see `resolveSize`. */
const ICON_RUNG: Record<string, ButtonSize> = {
  xs: "icon-xs",
  sm: "icon-sm",
  md: "icon",
  lg: "icon-lg",
  xl: "icon-xl",
};
// #endregion context

// #region model — pending pacing + content probes
// Spinner pacing. A request that resolves inside the show-delay never flashes a
// spinner; once one is on screen it stays for the min-visible window so a
// fast-but-not-instant request doesn't blink. Both mirror the motion ramp
// (--garn-motion-fast = 200ms, --garn-motion-base = 300ms) — a JS timer can't
// read a CSS var without a mounted element, so they are duplicated here and
// must be kept in step with those tokens.
const SPINNER_SHOW_DELAY_MS = 200;
const SPINNER_MIN_VISIBLE_MS = 300;

// How long a success/error glyph stays up before the button asks to go back to
// idle (opt-in — only when `onStateChange` is wired). A dwell, not a transition,
// so it takes no motion token: long enough to notice and read, short enough
// that a repeat action isn't waiting on it. Matches the clipboard-copy reset.
const RESOLUTION_HOLD_MS = 1200;

/**
 * Debounces a pending flag into a *visible* one: true only after the work has
 * run past the show-delay, and then held for at least the min-visible window.
 * The pending prop stays the source of truth — this only paces its presentation.
 */
function useDelayedPending(pending: boolean): boolean {
  const [visible, setVisible] = React.useState(false);
  const shownAtRef = React.useRef(0);

  React.useEffect(() => {
    if (pending) {
      // Already showing (e.g. pending flickered off and back inside the
      // min-visible window) — nothing to schedule, and the cleanup below has
      // already cancelled the pending hide.
      if (visible) return;
      const timer = setTimeout(() => {
        shownAtRef.current = Date.now();
        setVisible(true);
      }, SPINNER_SHOW_DELAY_MS);
      return () => clearTimeout(timer);
    }

    if (!visible) return;
    const remaining = SPINNER_MIN_VISIBLE_MS - (Date.now() - shownAtRef.current);
    if (remaining <= 0) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(false), remaining);
    return () => clearTimeout(timer);
  }, [pending, visible]);

  return visible;
}

// Best-effort accessible-name probe (dev only) + announcement source. Walks the
// node tree collecting strings so sr-only labels (e.g.
// <span className="sr-only">…</span>) count as a name and don't trip the
// icon-only warning.
function textOf(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join(" ");
  if (React.isValidElement(node)) {
    return textOf((node.props as { children?: React.ReactNode }).children);
  }
  return "";
}

function hasTextContent(node: React.ReactNode): boolean {
  return textOf(node).trim().length > 0;
}

/**
 * Pick the rung to inherit from a `SplitButton` ancestor. An icon-only child
 * (a chevron half, say) needs the SQUARE rung of the same height, not the text
 * rung — otherwise it inherits `md` and renders as a wide, text-padded button.
 */
function resolveSize(ctxSize: ButtonSize, iconOnly: boolean): ButtonSize {
  if (!iconOnly) return ctxSize;
  return ICON_RUNG[ctxSize] ?? ctxSize;
}
// #endregion model

// #region parts — spinner + status glyphs
// Self-owned spinner: a bare <svg> that inherits the button's text color
// (currentColor) and is sized by the size variant's [&_svg] rule, so it matches
// the icon scale of whatever rung it lands on. A faint full ring gives it body
// while a ~270° arc with a transparent→opaque gradient and a rounded head reads
// as a tapering "comet" trail as it rotates. animate-spin is a Tailwind built-in
// and is collapsed by the library-wide prefers-reduced-motion guard. The
// gradient id is per-instance (useId) so concurrent spinners don't collide.
function ButtonSpinner({ className }: { className?: string }) {
  const gradientId = React.useId();
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      role="presentation"
      aria-hidden="true"
      className={cn(
        "animate-spin [animation-duration:var(--garn-motion-spin)]",
        className
      )}
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="12"
          y1="2.5"
          x2="3"
          y2="18"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="currentColor" stopOpacity="0" />
          <stop offset="1" stopColor="currentColor" />
        </linearGradient>
      </defs>
      <circle
        cx="12"
        cy="12"
        r="8.75"
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeWidth="2.5"
      />
      <path
        d="M12 3.25a8.75 8.75 0 1 1-8.75 8.75"
        stroke={`url(#${gradientId})`}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Resolution glyph for state="success" / "error". Each stroke declares
// pathLength=1 + a unit dash so `animate-draw-in` can trace it with one shared
// keyframe regardless of the glyph's real length. The animation is
// motion-safe-gated AND its keyframe fills `both`, so the reduced-motion
// audience gets the finished glyph with no trace — never a half-drawn mark.
// Decorative: the state change is carried to AT by the live region, not here.
function ButtonStatusIcon({ status }: { status: "success" | "error" }) {
  const strokes =
    status === "success" ? ["M4.5 12.75 9.75 18 19.5 6.75"] : ["M6 6 18 18", "M18 6 6 18"];
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      role="presentation"
      aria-hidden="true"
      className="motion-safe:animate-draw-in"
    >
      {strokes.map((d) => (
        <path
          key={d}
          d={d}
          pathLength={1}
          strokeDasharray={1}
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
// #endregion parts

// #region root — Button
/**
 * The primary action control — renders a `<button>` (or the child element via
 * `asChild`) across the fill × tone × size matrix, with optional leading/trailing
 * slots, an async lifecycle (`loading` / `state`), and a compound `description` line.
 *
 * Documentation: https://garn.ohuba.com/components/button
 */
function Button({
  className,
  variant,
  tone,
  size,
  justify,
  fullWidth,
  asChild = false,
  leading,
  trailing,
  loading = false,
  loadingText,
  state,
  onStateChange,
  description,
  disabled,
  onClick,
  onKeyDown,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  const announce = useAnnounce();

  // Defaults from a SplitButton ancestor. For the styling axes, own props always
  // win — `??` only fills the holes. `disabled` is the exception; see below.
  const defaults = React.use(SplitButtonContext);
  const resolvedVariant = variant ?? defaults?.variant;
  const resolvedTone = tone ?? defaults?.tone;
  // `disabled` is the one axis that ORs rather than falls through: a half can be
  // more disabled than its wrapper, never less — the same containment
  // `fieldset[disabled]` has. It also has to be, in practice: a half wrapped in
  // a menu trigger receives an explicit `disabled={false}` from the primitive,
  // which under `??` would silently re-enable it under a disabled wrapper.
  const resolvedDisabled = disabled || defaults?.disabled;

  // `loading` is sugar; `state` is the full axis. One resolved value drives the
  // visuals, the ARIA, and the announcement so the two can never disagree.
  const resolvedState: ButtonState = state ?? (loading ? "loading" : "idle");
  const pending = resolvedState === "loading";
  const status =
    resolvedState === "success" || resolvedState === "error"
      ? resolvedState
      : null;
  const spinnerVisible = useDelayedPending(pending);

  // Button is the library's most-rendered component, so the tree walk runs once
  // (for the label) and the leading/trailing walks only where their answer is
  // actually consumed — inheriting a rung from a SplitButton ancestor.
  const labelText = textOf(children).trim();
  const inheritedSize = size == null ? defaults?.size : undefined;
  const iconOnlyContent =
    inheritedSize != null &&
    !labelText &&
    !hasTextContent(leading) &&
    !hasTextContent(trailing);
  const resolvedSize =
    size ??
    (inheritedSize ? resolveSize(inheritedSize, iconOnlyContent) : undefined);

  // Two status presentations:
  // · overlay — glyph centered over hidden content (no reflow). Default for the
  //             real <button>; needs to hide siblings, so not used for Slot.
  // · inline  — glyph replaces the leading slot, content stays in flow. Used
  //             when a loadingText is given, or with asChild (can't hide a
  //             consumer-owned element).
  // The presentation is decided by the SHAPE of the button (does it own its
  // children? is there a loading label?), not by whether a glyph is on screen
  // yet — the delay-phase spinner below has to know where it will land.
  //
  // Only the OVERLAY path pre-mounts its spinner through the show-delay, and
  // that asymmetry is deliberate. An overlay is absolutely positioned, so a
  // hidden one costs no layout and can simply fade in. The inline spinner takes
  // real space in the leading slot: pre-mounting it would either evict the
  // caller's leading icon for 200ms or widen the button immediately — a jump on
  // EVERY click, including the fast ones the delay exists to leave untouched.
  // So inline mounts on reveal, in step with the label swap it arrives with.
  const inlinePresentation = loadingText != null || asChild;

  // WHICH glyph, resolved as one value so the JSX below can keep a single
  // element slot (see the render). The spinner outranks a resolution while it
  // is still serving its min-visible window: without that, work that finishes
  // just past the show-delay would flash spinner→check in a frame — the exact
  // blink the min-visible constant exists to prevent. Work that finishes INSIDE
  // the delay never spun at all, so its check appears at once.
  const glyphKind: "spinner" | "success" | "error" | null =
    pending || spinnerVisible ? "spinner" : status;
  // …and whether it is on screen yet. During the show-delay the spinner is
  // mounted but faded out, so it is already turning when it fades in.
  const glyphVisible = glyphKind != null && (glyphKind !== "spinner" || spinnerVisible);

  const inlineStatus = glyphVisible && inlinePresentation;
  const overlayGlyph = glyphKind != null && !inlinePresentation;

  const statusGlyph =
    glyphKind === "success" || glyphKind === "error" ? (
      <ButtonStatusIcon status={glyphKind} />
    ) : (
      <ButtonSpinner />
    );

  const effectiveLeading = inlineStatus ? statusGlyph : leading;
  const effectiveLabel =
    spinnerVisible && loadingText != null ? loadingText : children;
  const showTrailing = trailing != null && !inlineStatus;
  const hide = glyphVisible && !inlinePresentation ? "invisible" : undefined;

  // Only a plain string/number label is wrapped in the truncating span — that
  // span is a block-level flex item, and preflight's `svg { display: block }`
  // would push a child <svg> onto its own line above the text. Rich children
  // (the canonical `<Icon />Label`) render as direct flex siblings of the
  // button instead, so the size variant's `gap-*` spaces them and `[&_svg]` sizes
  // the icon inline — matching Badge's `hasStringLabel` handling. Mirror the
  // overlay-hide on the icon-bearing children so a status overlay still hides
  // the resting content with no reflow.
  const hasStringLabel =
    typeof effectiveLabel === "string" || typeof effectiveLabel === "number";

  // Optical balance: a slot carries its glyph's own internal whitespace, so we
  // trim padding on whichever side holds one — by overriding that side's
  // padding var with `control-px − icon-inset` (both tokens, density-aware +
  // identity). Text sizes only; icon-only sizes are square and stay centered.
  const sizeStr = typeof resolvedSize === "string" ? resolvedSize : "md";
  const isTextSize = !sizeStr.startsWith("icon");
  const opticalTrim = cn(
    isTextSize &&
      effectiveLeading != null &&
      "[--btn-ps:calc(var(--btn-px)_-_var(--garn-control-icon-inset))]",
    isTextSize &&
      showTrailing &&
      "[--btn-pe:calc(var(--btn-px)_-_var(--garn-control-icon-inset))]"
  );

  // A description makes the button taller than its rung: release the fixed
  // height (twMerge collapses the size variant's `h-*`), keep the rung as a
  // FLOOR via the --btn-h mirror, and pad vertically so the two lines breathe.
  const hasDescription = description != null;
  const descriptionLayout = hasDescription
    ? "h-auto min-h-[var(--btn-h,var(--garn-control-h-md))] py-[var(--garn-space-8)]"
    : undefined;

  if (process.env.NODE_ENV !== "production") {
    const iconOnlySize = sizeStr.startsWith("icon");
    const hasName =
      props["aria-label"] != null ||
      props["aria-labelledby"] != null ||
      props.title != null ||
      hasTextContent(children) ||
      hasTextContent(leading) ||
      hasTextContent(trailing);
    if (iconOnlySize && !hasName && !asChild) {
      // eslint-disable-next-line no-console
      console.warn(
        'garn Button: an icon-only button (size="%s") has no accessible name. Pass `aria-label` (or `aria-labelledby`/`title`, or an sr-only label).',
        sizeStr
      );
    }
    if (hasDescription && iconOnlySize) {
      // eslint-disable-next-line no-console
      console.warn(
        'garn Button: `description` needs a visible label to sit under, but size="%s" is icon-only. Drop the description or move to a text size.',
        sizeStr
      );
    }
    if (hasDescription && !labelText) {
      // eslint-disable-next-line no-console
      console.warn(
        "garn Button: `description` was passed without a label — it is the SECONDARY line, so it needs `children` above it."
      );
    }
  }

  // Announce the lifecycle. The visual morph (spinner → check) is invisible to
  // AT, so the shared live region is what actually reports the work: polite
  // while it runs and on success, assertive on failure.
  const loadingMessage =
    (loadingText == null ? "" : textOf(loadingText).trim()) ||
    (labelText ? `${labelText}: loading` : "Loading");
  const successMessage = labelText ? `${labelText}: complete` : "Complete";
  const errorMessage = labelText ? `${labelText}: failed` : "Failed";

  // Pending rides the SAME show-delay as the spinner, not the raw state flip.
  // The region is one shared node whose textContent is replaced, so announcing
  // a sub-200ms action would push "loading" in and overwrite it with "complete"
  // before AT ever reached it — chatter that ends in a swallowed result.
  const announcedPending = React.useRef(false);
  React.useEffect(() => {
    if (!spinnerVisible) {
      announcedPending.current = false;
      return;
    }
    if (announcedPending.current) return;
    announcedPending.current = true;
    announce(loadingMessage);
  }, [spinnerVisible, announce, loadingMessage]);

  // Opt-in self-clearing resolution. The button never mutates `state` — it only
  // ASKS, so a controlled value stays the consumer's. The clock starts when the
  // glyph is actually on screen, not when `state` flipped: a resolution that
  // queued behind the spinner's min-visible window would otherwise be shorted
  // by however long it waited. The callback is held in a ref so an inline arrow
  // (`onStateChange={s => setState(s)}`) can't restart the timer on every
  // parent render and strand the button on its check mark forever.
  const wantsSelfReset = onStateChange != null;
  const resolutionShown = glyphKind === "success" || glyphKind === "error";
  const onStateChangeRef = React.useRef(onStateChange);
  useIsomorphicLayoutEffect(() => {
    onStateChangeRef.current = onStateChange;
  });
  React.useEffect(() => {
    if (!resolutionShown || !wantsSelfReset) return;
    const timer = setTimeout(
      () => onStateChangeRef.current?.("idle"),
      RESOLUTION_HOLD_MS
    );
    return () => clearTimeout(timer);
  }, [resolutionShown, wantsSelfReset]);

  // Resolutions announce on the transition itself — seeded with "idle" so a
  // button that MOUNTS already resolved still reports.
  const previousState = React.useRef<ButtonState>("idle");
  React.useEffect(() => {
    const previous = previousState.current;
    previousState.current = resolvedState;
    if (previous === resolvedState) return;
    if (resolvedState === "success") announce(successMessage);
    else if (resolvedState === "error") announce(errorMessage, "assertive");
  }, [resolvedState, announce, successMessage, errorMessage]);

  // Focusable-when-inert. While pending the button keeps its place in the tab
  // order (native `disabled` would silently drop focus to <body> and strand a
  // keyboard user mid-action), so activation has to be blocked here instead.
  // Enter/Space on a real button both surface as a click, but the keydown guard
  // stops the default activation one step earlier — which is what keeps a
  // pending submit button from posting its form.
  const handleClick = pending
    ? (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
      }
    : onClick;
  // The key guard suppresses ACTIVATION only — it still forwards. A container
  // that owns a keyboard model (a roving-focus toolbar, a menubar) reads its
  // Arrow/Home/End keys off this same handler, and swallowing them would strand
  // a keyboard user on the pending button with no way back to its siblings.
  const handleKeyDown = pending
    ? (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === "Enter" || event.key === " ") event.preventDefault();
        onKeyDown?.(event);
      }
    : onKeyDown;

  const labelNode = hasStringLabel ? (
    <span
      data-slot="button-label"
      className={cn("min-w-0 truncate", !hasDescription && hide)}
    >
      {effectiveLabel}
    </span>
  ) : (
    effectiveLabel
  );

  return (
    <Comp
      className={cn(
        buttonVariants({
          variant: resolvedVariant,
          tone: resolvedTone,
          size: resolvedSize,
          justify,
          fullWidth,
          className,
        }),
        opticalTrim,
        descriptionLayout
      )}
      data-slot="button"
      data-variant={resolvedVariant ?? "default"}
      data-tone={resolvedTone ?? "neutral"}
      data-size={sizeStr}
      data-justify={justify ?? "center"}
      data-full-width={fullWidth || undefined}
      data-loading={pending || undefined}
      // Only the non-resting states are reflected: an `idle` button must leave
      // data-state free for a wrapper that owns it (Radix writes open/closed
      // onto a `DropdownMenuTrigger asChild` Button — that's what drives the
      // split button's chevron rotation).
      data-state={resolvedState === "idle" ? undefined : resolvedState}
      {...props}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={resolvedDisabled}
      // OR-ed with the incoming value, never replacing it: these sit after the
      // spread, and a bare `pending || undefined` would erase an `aria-disabled`
      // a caller set for its own reasons (Toolbar's focusable-disabled controls
      // are exactly that caller).
      aria-disabled={pending || props["aria-disabled"] || undefined}
      aria-busy={pending || props["aria-busy"] || undefined}
    >
      {/* ONE overlay slot for the whole lifecycle. Mounted from the first
          pending frame and merely faded during the show-delay — never
          `display:none`, and never re-created at the moment it becomes visible
          (a second element in a second JSX position would remount, restarting
          the rotation from 0° just as the user first sees it). */}
      {overlayGlyph ? (
        <span
          data-slot={glyphKind === "spinner" ? "button-spinner" : "button-status"}
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 inline-flex items-center justify-center transition-opacity",
            !glyphVisible && "opacity-0"
          )}
        >
          {statusGlyph}
        </span>
      ) : null}

      {effectiveLeading != null ? (
        <span
          data-slot="button-leading"
          className={cn("inline-flex shrink-0 items-center justify-center", hide)}
        >
          {effectiveLeading}
        </span>
      ) : null}

      <Slottable>
        {asChild ? (
          children
        ) : effectiveLabel == null ? null : hasDescription ? (
          // Compound shape: label over a de-emphasized second line. The stack
          // owns the truncation so a long description can't widen the button,
          // and `items-start` keeps both lines aligned to each other however
          // the stack itself is placed by `justify`.
          <span
            data-slot="button-label-stack"
            className={cn("flex min-w-0 flex-col items-start", hide)}
          >
            {labelNode}
            <span
              data-slot="button-description"
              className={cn(
                "min-w-0 truncate text-xs font-normal",
                DESCRIPTION_EMPHASIS[resolvedVariant ?? "default"]
              )}
            >
              {description}
            </span>
          </span>
        ) : hasStringLabel ? (
          labelNode
        ) : hide ? (
          // Rich children under a status overlay: wrap once to hide the resting
          // content in place (no reflow) without disturbing its inline flow.
          <span className={cn("contents", hide)}>{effectiveLabel}</span>
        ) : (
          effectiveLabel
        )}
      </Slottable>

      {showTrailing ? (
        <span
          data-slot="button-trailing"
          className={cn("inline-flex shrink-0 items-center justify-center", hide)}
        >
          {trailing}
        </span>
      ) : null}
    </Comp>
  );
}
// #endregion root

// #region exports
export { Button, buttonVariants, SplitButtonContext };
// #endregion exports
