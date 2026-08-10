"use client";

// #region imports — dependencies
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { frameFill } from "@/lib/frame";
import { insetChild, insetHost } from "@/lib/inset";
import { AspectRatio } from "@/components/garn/aspect-ratio";
import { Skeleton } from "@/components/garn/skeleton";
// #endregion imports

// #region variants — appearance × tone × orientation × interactive
// The color of a card (fill, border-color, text) lives ENTIRELY in
// `compoundVariants`, never in the `appearance`/`tone` variant classes. That is
// deliberate: it guarantees a card's final class list carries exactly ONE `bg-*`,
// ONE border-color, and ONE `text-*` — so there is no same-property collision
// whose winner would depend on Tailwind's stylesheet order. `appearance` sets
// only structure (border-WIDTH + shadow + layout).
//
// The two axes divide the work cleanly: **`appearance` decides which slots a card
// has — a fill? a border? a shadow? — and `tone` decides the hue of the slots that
// exist.** A tone never overrides the surface family a card chose:
//
//                fill                    border-color   text
//   outline      white (every tone)      tone           neutral
//   elevated     white (every tone)      tone           neutral
//   soft         tone tint               —              tone
//   framed       tone tint               tone           tone
//   ghost        —                       —              tone
//   glass        tone tint, translucent  tone           neutral
//
// Two rules produce that table:
//   1. A tone tints the fill only where `appearance` declared one. The white family
//      (`outline`/`elevated`) is *defined* by its white surface, so there a tone
//      speaks through the edge instead — a white card with a status hairline, which
//      is precisely what a fully tinted panel can't be.
//   2. Text pairs with the surface directly beneath it, not with the tone: a
//      `-subtle` fill needs its `-foreground` partner to stay legible, while a white
//      fill keeps `text-card-foreground`. That also stops a toned white card from
//      cascading a hue onto mounted content (a Table, a Chart) that isn't sitting on
//      the tint. `glass` counts as white here — the tint is on the outer strip, but
//      the content sits on the inner container's `bg-card`. `ghost` is the mirror
//      exception: with no fill and no border, text is the only slot a tone can reach.
//
// Class strings are written literally (never assembled at runtime) so Tailwind's
// scanner sees every utility verbatim.
/** Class recipe for the card surface across the `appearance` × `tone` × `interactive` matrix. */
const cardVariants = cva("rounded-xl", {
  variants: {
    // Fill / surface treatment — which slots the card has. Structure only here
    // (border-width + shadow + layout); every colour comes from the compounds below.
    appearance: {
      elevated: "border shadow-surface-raised",
      outline: "border",
      soft: "",
      ghost: "",
      // Framed: the neutral-FILL family with an edge — a light grey fill PLUS a subtle
      // hairline (the garn `framed` idiom, a fill defined by a low-contrast border, cf.
      // Badge). Shares `soft`'s light grey fill; the border is precisely what a bordered
      // WHITE card (`outline`) can't be. Border-WIDTH only here; the fill + border-color
      // live in the compounds below.
      framed: "border",
      // Frosted glass: a framed "container-in-container" surface. The root is the
      // frosted OUTER frame (translucent fill from the tone compound, backdrop-blur,
      // soft shadow); the frame's own PADDING is the frosted strip, and Card nests
      // the content in a real inner bordered container (see the root below) whose
      // radius is concentric — the card radius minus the strip. Real padding + a
      // real element, never a ::before pseudo-strip (the garn nesting rule; cf.
      // lib/inset, CardMedia inheritPadding, the billing example). `block` keeps the
      // strip padding reliable when the root is a promoted inline element (asChild
      // an `<a>`), which would otherwise collapse the top/bottom strip.
      glass:
        "block border backdrop-blur-xl shadow-surface-overlay p-[var(--garn-space-3)]",
    },
    // Status accent. Colors are applied in compoundVariants (see the note above).
    tone: {
      neutral: "",
      info: "",
      success: "",
      warning: "",
      danger: "",
      brand: "",
    },
    // The affordance. A `pointer-events-none` ::after state-layer (so a click on a
    // nested action still reaches it), a single `:focus-within` ring (focusing an
    // inner link rings the whole card), and `relative` to host a stretched link.
    // Hover is deliberately whisper-quiet: the tint shifts the surface under a
    // single neutral-ramp step (`foreground/2`, deepening to `/4` on press) paired
    // with the faintest `surface-raised` (sm) shadow — the barest rise, never a
    // colour jump. All interactive appearances share the lift; motion degrades under
    // reduced-motion.
    interactive: {
      true: "relative cursor-pointer outline-none transition-shadow motion-reduce:transition-none after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-foreground/0 after:duration-[var(--garn-motion-base)] hover:after:bg-foreground/2 hover:shadow-surface-raised active:after:bg-foreground/4 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
      false: "",
    },
  },
  compoundVariants: [
    // ── FILL — exactly one `bg-*` reaches any cell. ──────────────────────────
    // The WHITE family keeps its white surface in EVERY tone; that white is what
    // makes it the white family, so a tone is never allowed to fill over it.
    // `bg-surface-overlay` is the pure-white surface role (`--garn-neutral-0`), a notch
    // whiter than the raised `bg-card` (`--garn-neutral-25`) used by `elevated`. Reads
    // as true white-on-white (the border, not the fill, defines it) and flips correctly
    // in dark mode.
    { appearance: "outline", class: "bg-surface-overlay" },
    { appearance: "elevated", class: "bg-card" },

    // soft + framed are the FILL family: the fill does the work — `soft` is the plain
    // filled tile, `framed` the same fill plus a hairline. Neutral is `bg-surface-soft`:
    // a dedicated surface role (the lightest-touch tint off the base surface —
    // neutral-50 in light, darkneutral-50 in dark), lighter than the heavier `muted` and
    // with a controlled value in BOTH modes (so dark soft stays a visible raised tile
    // instead of collapsing into muted). A tone swaps that neutral fill for its own
    // `-subtle` tint — the Alert surface idiom. (Note: the white/grey split is a
    // light-mode read; in dark, garn's surfaces are an elevation ramp, so a neutral
    // soft/framed sits close to outline.)
    { appearance: ["soft", "framed"], tone: "neutral", class: "bg-surface-soft" },
    { appearance: ["soft", "framed"], tone: "info", class: "bg-info-subtle" },
    { appearance: ["soft", "framed"], tone: "success", class: "bg-success-subtle" },
    { appearance: ["soft", "framed"], tone: "warning", class: "bg-warning-subtle" },
    { appearance: ["soft", "framed"], tone: "danger", class: "bg-danger-subtle" },
    { appearance: ["soft", "framed"], tone: "brand", class: "bg-brand-subtle" },

    // Glass — the outer frame's fill. Neutral is the shared semi-transparent white
    // strip (`frameFill`, which carries the rim border-color too). A tone tints that
    // strip but must stay TRANSLUCENT, so it uses the `-subtle` fill at 70% rather
    // than the opaque tile fill — an opaque tone here would clobber the frost and
    // leave a plain coloured panel with a pointless `backdrop-blur`.
    { appearance: "glass", tone: "neutral", class: frameFill },
    { appearance: "glass", tone: "info", class: "bg-info-subtle/70" },
    { appearance: "glass", tone: "success", class: "bg-success-subtle/70" },
    { appearance: "glass", tone: "warning", class: "bg-warning-subtle/70" },
    { appearance: "glass", tone: "danger", class: "bg-danger-subtle/70" },
    { appearance: "glass", tone: "brand", class: "bg-brand-subtle/70" },

    // `ghost` declares no fill in any tone — a padding container only.

    // ── BORDER-COLOR — only where `appearance` declared a border-WIDTH. ──────
    // `soft` and `ghost` are absent by design: a border-color with no border-width
    // paints nothing, which is exactly what made them clones of `framed`/`outline`
    // under the old flat tone recipe.
    {
      appearance: ["outline", "elevated", "framed"],
      tone: "neutral",
      class: "border-border",
    },
    // Glass's neutral rim ships inside `frameFill` (it tracks the strip alpha), so
    // only the toned glass rim is listed here.
    {
      appearance: ["outline", "elevated", "framed", "glass"],
      tone: "info",
      class: "border-info/30",
    },
    {
      appearance: ["outline", "elevated", "framed", "glass"],
      tone: "success",
      class: "border-success/30",
    },
    // warning's hue is the palest of the set, so its edge carries a touch more alpha.
    {
      appearance: ["outline", "elevated", "framed", "glass"],
      tone: "warning",
      class: "border-warning/40",
    },
    {
      appearance: ["outline", "elevated", "framed", "glass"],
      tone: "danger",
      class: "border-danger/30",
    },
    {
      appearance: ["outline", "elevated", "framed", "glass"],
      tone: "brand",
      class: "border-brand/30",
    },

    // ── TEXT — pairs with the surface beneath it, not with the tone. ─────────
    // A white surface keeps the neutral foreground in every tone. `glass` belongs
    // here because its content sits on the inner container's `bg-card`, not on the
    // tinted outer strip.
    {
      appearance: ["outline", "elevated", "glass"],
      class: "text-card-foreground",
    },
    // A `-subtle` fill takes its paired `-foreground` so the contrast holds.
    // `ghost` rides along: with no fill and no border, text is the only slot left
    // for a tone to speak through.
    {
      appearance: ["soft", "framed", "ghost"],
      tone: "neutral",
      class: "text-card-foreground",
    },
    {
      appearance: ["soft", "framed", "ghost"],
      tone: "info",
      class: "text-info-foreground",
    },
    {
      appearance: ["soft", "framed", "ghost"],
      tone: "success",
      class: "text-success-foreground",
    },
    {
      appearance: ["soft", "framed", "ghost"],
      tone: "warning",
      class: "text-warning-foreground",
    },
    {
      appearance: ["soft", "framed", "ghost"],
      tone: "danger",
      class: "text-danger-foreground",
    },
    // brand's soft text token is `-subtle-foreground` (there is no brand-foreground).
    {
      appearance: ["soft", "framed", "ghost"],
      tone: "brand",
      class: "text-brand-subtle-foreground",
    },
  ],
  defaultVariants: {
    appearance: "outline",
    tone: "neutral",
    interactive: false,
  },
});

// Responsive collapse: a horizontal card is a column below the breakpoint, a row
// at/above it. Literal strings so both breakpoints reach Tailwind's scanner.
const COLLAPSE = {
  sm: "flex-col sm:flex-row",
  md: "flex-col md:flex-row",
  lg: "flex-col lg:flex-row",
} as const;

// Content-host classes — layout + section treatment that must sit on the element
// which DIRECTLY parents the header/content/footer/media. On a normal card that is
// the root; on `glass` it is the inner frame (see the root below). Keeping them on
// the host is what lets `glass` compose with orientation, divided, and media.

// Hairline rules between regions for dense info cards, plus restored top padding so
// each divided section breathes (the higher-specificity descendant selector wins
// over a part's own `pt-0`). Written literally so Tailwind's scanner sees them.
const DIVIDED_RULES =
  "[&>*:not(:first-child)]:border-t [&>*:not(:first-child)]:border-border [&>[data-slot=card-content]]:pt-[var(--garn-pad-surface)] [&>[data-slot=card-footer]]:pt-[var(--garn-pad-surface)]";

// A card that contains a full-bleed region (CardMedia, CardBleed, or a CardSkeleton
// media box) clips its children to the rounded box, so the bleed's leading/trailing
// corners follow the host's radius.
const CLIP_EDGE =
  "has-[[data-slot=card-media]]:overflow-hidden has-[[data-slot=card-bleed]]:overflow-hidden has-[[data-slot=card-skeleton]]:overflow-hidden";

// The `glass` inner container — a real bordered surface whose radius is concentric
// to the outer frame (the card radius minus the strip padding), so the two curves
// run parallel. The frame's padding is the frosted strip; this is the real element
// that padding reveals (never a ::before pseudo-strip).
const GLASS_FRAME =
  "rounded-[calc(var(--radius-xl)-var(--garn-space-3))] border border-border bg-card";
// #endregion variants

// #region root — Card
let warnedElevation = false;

export interface CardProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof cardVariants> {
  /** Render the single child element AS the card root (an `<a>`/`<button>` for a
   * whole-surface control, or a semantic `<article>`). Pair with `interactive`
   * for the affordance. A promoted `<button>` must not wrap block/interactive
   * content — use `interactive` + a stretched `CardTitle` link for rich nav cards.
   * @default false */
  asChild?: boolean;
  /** Layout flow. `vertical` stacks the parts; `horizontal` lays them out in a row
   * (media beside content), collapsing to vertical below `collapseBelow`.
   * @default "vertical" */
  orientation?: "vertical" | "horizontal";
  /** Hairline rules between the header / content / footer regions — for dense info
   * cards. Reflects `data-divided`. */
  divided?: boolean;
  /** Breakpoint below which a `horizontal` card collapses to vertical; `false` never
   * collapses.
   * @default "sm" */
  collapseBelow?: keyof typeof COLLAPSE | false;
  /** For an `interactive` card: mark it disabled — `aria-disabled`, no pointer
   * events, and click / Enter / Space are blocked. Best with the whole-surface
   * (`asChild`) or stretched-link pattern (a single control). A disabled card
   * blocks activation but does not remove *nested* focusable controls from the tab
   * order — if the card hosts its own, disable those too.
   * @default false */
  disabled?: boolean;
  /**
   * Legacy surface alias, superseded by `appearance`.
   * @deprecated Use `appearance` — `raised` → `elevated`, `hairline` → `outline`.
   * Kept as an alias for one release. Ignored when `appearance` is set.
   */
  elevation?: "raised" | "hairline";
}

/**
 * A surface for grouping related content, across the `appearance` × `tone` matrix,
 * with an optional interactive affordance, media bleed, orientation, and divided
 * rules. Composes with `CardHeader` / `CardContent` / `CardFooter` and friends.
 *
 * Documentation: https://garn.ohuba.com/components/card
 */
function Card({
  className,
  appearance,
  tone,
  orientation,
  interactive,
  divided,
  asChild = false,
  collapseBelow = "sm",
  disabled = false,
  elevation,
  ...props
}: CardProps) {
  if (process.env.NODE_ENV !== "production" && elevation && !warnedElevation) {
    warnedElevation = true;
    // eslint-disable-next-line no-console
    console.warn(
      'garn Card: the `elevation` prop is deprecated — use `appearance="elevated"` (was "raised") or `appearance="outline"` (was "hairline").'
    );
  }

  // Fold the deprecated `elevation` into `appearance`; an explicit `appearance`
  // always wins.
  const resolvedAppearance =
    appearance ??
    (elevation ? (elevation === "raised" ? "elevated" : "outline") : undefined);
  const effectiveAppearance = resolvedAppearance ?? "outline";

  // Horizontal direction (with responsive collapse) is a single, non-colliding
  // flex-direction descriptor that rides the content host below.
  const isHorizontal = orientation === "horizontal";
  const horizontalDir = isHorizontal
    ? collapseBelow === false
      ? "flex-row"
      : COLLAPSE[collapseBelow]
    : undefined;

  const isDisabled = Boolean(interactive && disabled);

  // Block activation for a disabled interactive card. `pointer-events-none` is not
  // enough on its own (it is ignored in test environments and does not stop
  // keyboard activation), so guard click + Enter/Space at the capture phase.
  const guard = isDisabled
    ? {
        onClickCapture: (e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
        },
        onKeyDownCapture: (e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
          }
        },
      }
    : undefined;

  const Comp = asChild ? Slot : "div";
  const isGlass = effectiveAppearance === "glass";

  // Content-host classes ride whichever element DIRECTLY parents the parts: the root
  // for a normal card, the inner frame for `glass`. Layout (orientation), section
  // rules (`divided`), and media clipping all live here so `glass` composes with all
  // three even though its content sits one level deeper.
  const hostClasses = cn(
    isHorizontal && "flex",
    horizontalDir,
    divided && DIVIDED_RULES,
    CLIP_EDGE
  );

  // Glass wraps the content in a REAL inner bordered container whose radius is
  // concentric to the frosted outer frame — the frame's padding is the strip. The
  // host classes ride this frame, not the outer frame.
  const { children, ...restProps } = props;
  const frame = (inner: React.ReactNode) => (
    <div data-slot="card-frame" className={cn(GLASS_FRAME, hostClasses)}>
      {inner}
    </div>
  );

  let content: React.ReactNode = children;
  if (isGlass) {
    if (asChild) {
      // The promoted <a>/<button> must stay the card root, so wrap ITS children in
      // the frame (clone) — nesting the promoted element inside a wrapper instead
      // would silently demote the whole-surface control to a plain <div>.
      const only = React.Children.only(children) as React.ReactElement<{
        children?: React.ReactNode;
      }>;
      content = React.cloneElement(only, undefined, frame(only.props.children));
    } else {
      content = frame(children);
    }
  }

  return (
    <Comp
      data-slot="card"
      data-appearance={effectiveAppearance}
      data-tone={tone ?? "neutral"}
      data-orientation={orientation ?? "vertical"}
      data-interactive={interactive || undefined}
      data-divided={divided || undefined}
      data-disabled={isDisabled || undefined}
      aria-disabled={isDisabled || undefined}
      // Only pull a promoted root out of the tab order; a non-asChild interactive
      // root is a div (not focusable) and hosts a focusable child instead.
      tabIndex={asChild && isDisabled ? -1 : undefined}
      className={cn(
        cardVariants({
          appearance: effectiveAppearance,
          tone,
          interactive,
        }),
        // A normal card IS the content host; glass delegates the host classes to its
        // inner frame (above), so the outer frame carries only frame styling.
        !isGlass && hostClasses,
        isDisabled && "pointer-events-none opacity-50",
        className
      )}
      {...restProps}
      {...guard}
    >
      {content}
    </Comp>
  );
}
// #endregion root

// #region parts — media / header / title / description / action / content / footer
export interface CardMediaProps extends React.ComponentProps<"div"> {
  /** Constrain the media to a width:height ratio (composes AspectRatio). */
  ratio?: number;
  /**
   * Inset the media from the card edge instead of bleeding edge-to-edge: the media
   * slot becomes a padded host and the image sits in an inner container whose
   * corner radius is **concentric** — the card's radius minus the gap — so its
   * curve runs parallel to the card's (the garn nesting rule, see `lib/inset`).
   * Tune the gap with the `--inset-gap` custom property (default 6px here). Padding,
   * not margin; a real inner container, not a pseudo-element.
   * @default false
   */
  inheritPadding?: boolean;
}

// Reserve the media box (fills its container, covers, degrades to a muted panel).
const MEDIA_BOX =
  "relative overflow-hidden bg-muted [&_img]:size-full [&_img]:object-cover [&_video]:size-full [&_video]:object-cover";

/**
 * Media (image / video) inside a Card. By default it's edge-to-edge: place it as a
 * direct child of Card (the root is padding-free), so the media is full-bleed and
 * the card clips its corners to the radius. With `inheritPadding` the slot pads
 * itself and nests the media in an inner container with a concentric radius.
 */
function CardMedia({
  ratio,
  inheritPadding = false,
  className,
  children,
  ...props
}: CardMediaProps) {
  const content =
    ratio != null ? <AspectRatio ratio={ratio}>{children}</AspectRatio> : children;

  // Inset: a padded host (transparent, so the card's surface shows in the gap)
  // wrapping a concentric inner box. A smaller default gap than the surface padding
  // so the concentric radius stays positive on the default card.
  if (inheritPadding) {
    return (
      <div
        data-slot="card-media"
        className={cn(insetHost, "[--inset-gap:var(--garn-space-6)]", className)}
        {...props}
      >
        <div className={cn(insetChild, MEDIA_BOX)}>{content}</div>
      </div>
    );
  }

  return (
    <div
      data-slot="card-media"
      className={cn(MEDIA_BOX, "rounded-[inherit]", className)}
      {...props}
    >
      {content}
    </div>
  );
}

/**
 * A CSS grid header. When it contains a `CardAction`, it becomes a two-column
 * grid so the action snaps top-right and spans the title + description rows.
 */
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "grid auto-rows-min items-start gap-[var(--garn-gap-field)] p-[var(--garn-pad-surface)] has-[[data-slot=card-action]]:grid-cols-[1fr_auto]",
        className
      )}
      data-slot="card-header"
      {...props}
    />
  );
}

export interface CardTitleProps extends React.ComponentProps<"div"> {
  /** Render the child element as the title — use it for a real heading
   * (`<h2>`–`<h4>`, WCAG 1.3.1) or the anchor of a stretched-link nav card.
   * @default false */
  asChild?: boolean;
  /** Render the title as a real heading at this level (`<h2>`–`<h4>`) so sibling
   * cards keep a flat, valid outline — the ergonomic path to a semantic heading
   * without `asChild`. An explicit `asChild` wins when both are set. */
  headingLevel?: 2 | 3 | 4;
}

/** The card's heading line — render a real `<h2>`–`<h4>` via `headingLevel` or `asChild`. */
function CardTitle({
  className,
  asChild = false,
  headingLevel,
  ...props
}: CardTitleProps) {
  const Comp: React.ElementType = asChild
    ? Slot
    : headingLevel
      ? (`h${headingLevel}` as const)
      : "div";
  return (
    <Comp
      className={cn("font-semibold leading-none tracking-tight", className)}
      data-slot="card-title"
      {...props}
    />
  );
}

/** Supporting text under the title. */
function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("text-sm text-muted-foreground", className)}
      data-slot="card-description"
      {...props}
    />
  );
}

/**
 * A header action area (menu / close / toggle). Snaps to the top-right grid cell
 * of CardHeader. Inside an interactive card it stays clickable — give it
 * `relative z-10` when it must sit above a stretched-link overlay.
 */
function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      data-slot="card-action"
      {...props}
    />
  );
}

/** The card's main body region (self-padded). */
function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("p-[var(--garn-pad-surface)] pt-0", className)}
      data-slot="card-content"
      {...props}
    />
  );
}

/** A trailing region for actions or metadata, below the content. */
function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center p-[var(--garn-pad-surface)] pt-0",
        className
      )}
      data-slot="card-footer"
      {...props}
    />
  );
}

// Mounting content inside a Card — the contract:
//  • The root is padding-free and each part self-pads. Mount INSET content (a Stat,
//    a chart, text, a DataList, a form group) in `CardContent`; mount EDGE-TO-EDGE
//    content (a Table, List rows, a chart/sparkline footer, media) with `CardBleed`
//    (or `CardMedia`) as a direct child of the card.
//  • Don't double-pad: `Empty`, `Field appearance="card"`, and `List appearance="card"`
//    already bring their own surface — mount them bare (not inside `CardContent`) and
//    use the flat `plain` appearance, never a card inside a card.
//  • Some children own their dividers (`DataList`, `List`, `Timeline`) — let them, and
//    don't also set `divided` on the Card.
//  • Mounted content keeps its own a11y wiring: a Table needs a caption, a RadioGroup
//    needs an explicit group label (a visual title does not auto-associate), a
//    List / Timeline / TagGroup needs a name.

export interface CardBleedProps extends React.ComponentProps<"div"> {
  /**
   * Re-add the surface's horizontal padding so the content insets while the region
   * still spans edge-to-edge — e.g. a full-width rule under text that lines up with
   * the card's other padded regions.
   * @default false
   */
  inheritPadding?: boolean;
}

/**
 * A full-bleed region — mount any content edge-to-edge (a Table, a List, a
 * chart/sparkline footer, media). Place it as a DIRECT child of Card: the root is
 * padding-free, so a direct child is already flush (no negative margins needed),
 * and the card clips the bleed's corners to its radius. Use `inheritPadding` to
 * inset the content horizontally while the region stays full-width.
 */
function CardBleed({
  inheritPadding = false,
  className,
  ...props
}: CardBleedProps) {
  return (
    <div
      data-slot="card-bleed"
      className={cn(
        "overflow-hidden rounded-[inherit]",
        inheritPadding && "px-[var(--garn-pad-surface)]",
        className
      )}
      {...props}
    />
  );
}

export interface CardMetaProps
  extends Omit<React.ComponentProps<"div">, "title"> {
  /** Leading media — an Avatar, an icon tile, or a thumbnail. */
  media?: React.ReactNode;
  /** A small overline / kicker above the title. */
  eyebrow?: React.ReactNode;
  /** The primary title line (rendered via `CardTitle`). */
  title?: React.ReactNode;
  /** The subtitle / supporting line under the title. */
  description?: React.ReactNode;
  /** Render the title as a real heading (`<h2>`–`<h4>`) — forwarded to CardTitle. */
  headingLevel?: 2 | 3 | 4;
}

/**
 * The identity cluster: a leading avatar/media beside an eyebrow + title +
 * subtitle. The text column is `min-w-0` so a long title truncates instead of
 * pushing the media. Reuses CardTitle / CardDescription so the type scale matches;
 * drop it inside a CardHeader or use it standalone.
 */
function CardMeta({
  media,
  eyebrow,
  title,
  description,
  headingLevel,
  className,
  children,
  ...props
}: CardMetaProps) {
  return (
    <div
      data-slot="card-meta"
      className={cn("flex items-start gap-[var(--garn-space-12)]", className)}
      {...props}
    >
      {media != null && (
        <div data-slot="card-meta-media" className="shrink-0">
          {media}
        </div>
      )}
      <div
        data-slot="card-meta-text"
        className="grid min-w-0 gap-[var(--garn-gap-field)]"
      >
        {eyebrow != null && (
          <div
            data-slot="card-meta-eyebrow"
            className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            {eyebrow}
          </div>
        )}
        {title != null && (
          <CardTitle headingLevel={headingLevel} className="truncate">
            {title}
          </CardTitle>
        )}
        {description != null && <CardDescription>{description}</CardDescription>}
        {children}
      </div>
    </div>
  );
}

export interface CardSkeletonProps extends React.ComponentProps<"div"> {
  /**
   * Number of body placeholder lines (the last is shortened).
   * @default 3
   */
  lines?: number;
  /**
   * Reserve a leading full-bleed media box (16:9).
   * @default false
   */
  media?: boolean;
  /**
   * Reserve a leading avatar circle in the header instead of a plain title line.
   * @default false
   */
  avatar?: boolean;
}

/**
 * A loading placeholder shaped like a Card — an optional top media box or leading
 * avatar, a title line, and `lines` body lines (composes Skeleton). It is
 * `aria-hidden` (decorative); mark the region it stands in for `aria-busy` so
 * assistive tech announces the wait.
 */
function CardSkeleton({
  lines = 3,
  media = false,
  avatar = false,
  className,
  ...props
}: CardSkeletonProps) {
  return (
    <div data-slot="card-skeleton" aria-hidden className={className} {...props}>
      {/* Square box; the Card clips its top corners to the radius via CLIP_EDGE. */}
      {media && <Skeleton className="aspect-video w-full rounded-none" />}
      <div className="p-[var(--garn-pad-surface)]">
        {avatar ? (
          <div className="flex items-center gap-[var(--garn-space-12)]">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="grid flex-1 gap-[var(--garn-gap-field)]">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ) : (
          <div className="grid gap-[var(--garn-gap-field)]">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        )}
      </div>
      <div className="grid gap-[var(--garn-space-8)] p-[var(--garn-pad-surface)] pt-0">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length placeholder list
            key={i}
            className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")}
          />
        ))}
      </div>
    </div>
  );
}
// #endregion parts

// #region exports
export {
  Card,
  cardVariants,
  CardMedia,
  CardBleed,
  CardMeta,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  CardSkeleton,
};
// #endregion exports
