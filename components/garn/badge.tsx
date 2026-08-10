"use client";

import * as React from "react";
import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { CheckIcon, CopyIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAnnounce } from "@/lib/use-announce";
import { useClipboard } from "@/lib/use-clipboard";
import { Spinner } from "@/components/garn/spinner";
import { Counter } from "@/components/garn/counter";

// Tone/Size/Appearance are the cva's own option unions (single source of truth),
// surfaced here for the context value. The props themselves derive from
// VariantProps below.
type Tone = "neutral" | "brand" | "info" | "success" | "warning" | "danger";
type Appearance = "solid" | "soft" | "outline" | "subtle" | "framed";
type Size = "xs" | "sm" | "md" | "lg";

const badgeVariants = cva(
  // Base: inline layout + a transparent border (so outline/framed can
  // add an edge without shifting size) + a focus ring for the asChild/anchor
  // case. [&_svg] sizes every glyph — slot icon, spinner, progress ring — to the
  // active rung. Tones below only ever set --b-* vars; appearances only ever read
  // them, so the two axes never collide.
  "relative inline-flex w-fit items-center justify-center whitespace-nowrap border border-transparent align-middle font-medium focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      // Each tone wires the --b-* slot vars to the badge's component tokens
      // (--garn-badge-*). Those tokens carry their own light/dark values in the
      // token layer, so the component holds NO raw ramp refs and NO dark:
      // overrides — re-theming dark mode happens there.
      // Literal strings on purpose: Tailwind's scanner only sees classes that
      // appear verbatim in source — a runtime factory would emit nothing into
      // the CSS.
      tone: {
        neutral:
          "[--b-soft-bg:var(--garn-badge-neutral-bg)] [--b-soft-fg:var(--garn-badge-neutral-fg)] [--b-solid-bg:var(--garn-badge-neutral-bold)] [--b-solid-fg:var(--garn-badge-neutral-bold-fg)] [--b-line:var(--garn-badge-neutral-edge)] [--b-text:var(--garn-badge-neutral-fg)]",
        brand:
          "[--b-soft-bg:var(--garn-badge-brand-bg)] [--b-soft-fg:var(--garn-badge-brand-fg)] [--b-solid-bg:var(--garn-badge-brand-bold)] [--b-solid-fg:var(--garn-badge-brand-bold-fg)] [--b-line:var(--garn-badge-brand-edge)] [--b-text:var(--garn-badge-brand-fg)]",
        info: "[--b-soft-bg:var(--garn-badge-info-bg)] [--b-soft-fg:var(--garn-badge-info-fg)] [--b-solid-bg:var(--garn-badge-info-bold)] [--b-solid-fg:var(--garn-badge-info-bold-fg)] [--b-line:var(--garn-badge-info-edge)] [--b-text:var(--garn-badge-info-fg)]",
        success:
          "[--b-soft-bg:var(--garn-badge-success-bg)] [--b-soft-fg:var(--garn-badge-success-fg)] [--b-solid-bg:var(--garn-badge-success-bold)] [--b-solid-fg:var(--garn-badge-success-bold-fg)] [--b-line:var(--garn-badge-success-edge)] [--b-text:var(--garn-badge-success-fg)]",
        warning:
          "[--b-soft-bg:var(--garn-badge-warning-bg)] [--b-soft-fg:var(--garn-badge-warning-fg)] [--b-solid-bg:var(--garn-badge-warning-bold)] [--b-solid-fg:var(--garn-badge-warning-bold-fg)] [--b-line:var(--garn-badge-warning-edge)] [--b-text:var(--garn-badge-warning-fg)]",
        danger:
          "[--b-soft-bg:var(--garn-badge-danger-bg)] [--b-soft-fg:var(--garn-badge-danger-fg)] [--b-solid-bg:var(--garn-badge-danger-bold)] [--b-solid-fg:var(--garn-badge-danger-bold-fg)] [--b-line:var(--garn-badge-danger-edge)] [--b-text:var(--garn-badge-danger-fg)]",
      },
      appearance: {
        solid: "bg-[var(--b-solid-bg)] text-[var(--b-solid-fg)]",
        soft: "bg-[var(--b-soft-bg)] text-[var(--b-soft-fg)]",
        outline: "bg-transparent text-[var(--b-text)] border-[var(--b-line)]",
        subtle: "bg-transparent text-[var(--b-text)]",
        // framed = a toned fill PLUS a slim, low-contrast hairline of the same
        // tone — the line is the tone color faded most of the way to transparent
        // so it defines the edge without competing with the fill (and stays
        // mode-correct, since it fades toward the surface, not toward white).
        framed:
          "bg-[var(--b-soft-bg)] text-[var(--b-soft-fg)] border-[color-mix(in_oklab,var(--b-line),transparent_72%)]",
      },
      size: {
        xs: "gap-0.5 px-1 py-px text-xs [&_svg]:size-3",
        sm: "gap-1 px-1.5 py-0.5 text-xs [&_svg]:size-3.5",
        md: "gap-1 px-2 py-0.5 text-xs [&_svg]:size-4",
        lg: "gap-1.5 px-2.5 py-1 text-sm [&_svg]:size-4",
      },
      // Three radii: sharp (micro-chip), rounded (default), pill.
      shape: {
        sharp: "rounded-xs",
        rounded: "rounded-md",
        pill: "rounded-full",
      },
      mono: { true: "font-mono tabular-nums", false: "" },
    },
    defaultVariants: {
      tone: "neutral",
      appearance: "soft",
      size: "md",
      shape: "rounded",
      mono: false,
    },
  }
);

/* ---------------------------------------------------------------- helpers -- */

/** Parse #rgb / #rrggbb(aa) / rgb(a)(…) to [r,g,b]; null for tokens/oklch/etc. */
function parseColor(input: string): [number, number, number] | null {
  const s = input.trim();
  if (s.charAt(0) === "#") {
    const raw = s.slice(1);
    if (/^[0-9a-fA-F]+$/.test(raw)) {
      const h = raw.length === 3 ? raw.replace(/./g, (c) => c + c) : raw;
      if (h.length >= 6) {
        const n = parseInt(h.slice(0, 6), 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      }
    }
    return null;
  }
  const m = s.match(/^rgba?\(([^)]+)\)$/i);
  if (m) {
    const p = m[1]!.split(/[,\s/]+/).map(Number);
    if (p.length >= 3 && p.slice(0, 3).every((x) => !Number.isNaN(x)))
      return [p[0]!, p[1]!, p[2]!];
  }
  return null;
}

/**
 * Readable foreground for a custom solid color: WCAG relative luminance → a
 * near-black or near-white token. Returns undefined for inputs we can't parse
 * synchronously (design tokens, oklch) — the caller falls back to white.
 */
function getReadableForeground(color: string): string | undefined {
  const rgb = parseColor(color);
  if (!rgb) return undefined;
  const lin = (c: number) => {
    const x = c / 255;
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  const L = 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
  return L > 0.4 ? "var(--garn-neutral-1000)" : "var(--garn-neutral-0)";
}

/** Dev-only accessible-name probe — walks for any non-empty string (sr-only counts). */
function hasTextContent(node: React.ReactNode): boolean {
  if (node == null || typeof node === "boolean") return false;
  if (typeof node === "string") return node.trim().length > 0;
  if (typeof node === "number") return true;
  if (Array.isArray(node)) return node.some(hasTextContent);
  if (React.isValidElement(node))
    return hasTextContent((node.props as { children?: React.ReactNode }).children);
  return false;
}

/* ------------------------------------------------------------- context ----- */

interface BadgeContextValue {
  tone: Tone;
  size: Size;
  appearance: Appearance;
}

const BadgeContext = React.createContext<BadgeContextValue>({
  tone: "neutral",
  size: "md",
  appearance: "soft",
});

/** Read the ambient tone/size/appearance so custom slot content can match. */
function useBadge(): BadgeContextValue {
  return React.useContext(BadgeContext);
}

/* -------------------------------------------------------- compound parts --- */

type SpanProps = React.ComponentProps<"span">;

/** Fixed-width content before the label (icon / dot / avatar); never truncates. */
function BadgeLeading({ className, ...props }: SpanProps) {
  return (
    <span
      data-slot="badge-leading"
      className={cn("inline-flex shrink-0 items-center justify-center", className)}
      {...props}
    />
  );
}

/** The text label — the only part that truncates. */
function BadgeLabel({ className, ...props }: SpanProps) {
  return (
    <span
      data-slot="badge-label"
      className={cn("min-w-0", className)}
      {...props}
    />
  );
}

/** Fixed-width content after the label (icon / count / copy button); never truncates. */
function BadgeTrailing({ className, ...props }: SpanProps) {
  return (
    <span
      data-slot="badge-trailing"
      className={cn("inline-flex shrink-0 items-center justify-center gap-1", className)}
      {...props}
    />
  );
}

type BadgeSeparatorVariant = "dot" | "line";

/**
 * A decorative divider between inline segments (e.g. "Free plan · Upgrade").
 * `variant="dot"` is a typographic middot that renders its children; `variant="line"`
 * is a hairline that ignores children. aria-hidden — never in the accessible name.
 */
function BadgeSeparator({
  variant = "dot",
  className,
  children,
  ...props
}: SpanProps & { variant?: BadgeSeparatorVariant }) {
  return (
    <span
      data-slot="badge-separator"
      data-variant={variant}
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center",
        variant === "line"
          ? "mx-0.5 w-px self-stretch bg-current/30"
          : "leading-none opacity-50",
        className
      )}
      {...props}
    >
      {variant === "line" ? null : (children ?? "·")}
    </span>
  );
}

/* -------------------------------------------------- status-slot internals -- */

function BadgeDot({ pulse }: { pulse?: boolean }) {
  return (
    <span data-slot="badge-dot" className="relative inline-flex size-1.5 shrink-0">
      {pulse ? (
        <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-60 motion-reduce:hidden" />
      ) : null}
      <span className="relative inline-flex size-full rounded-full bg-current" />
    </span>
  );
}

// Completeness ring that snaps to a check at 100. Drawn in currentColor, sized by
// the badge's [&_svg] rule. SVG coordinates are geometry, not design tokens.
function BadgeProgressRing({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  if (v >= 100) return <CheckIcon aria-hidden="true" />;
  const r = 6;
  const circ = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 16 16" fill="none" role="img" aria-hidden="true">
      <circle cx="8" cy="8" r={r} stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <circle
        cx="8"
        cy="8"
        r={r}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - v / 100)}
        transform="rotate(-90 8 8)"
      />
    </svg>
  );
}

// The one interactive affordance: a real, focusable button. Announces via
// aria-live; the icon flips to a check for a beat after copying.
function BadgeCopyButton({ value }: { value: string }) {
  const { copied, copy } = useClipboard();
  const announce = useAnnounce();
  React.useEffect(() => {
    if (copied) announce("Copied to clipboard");
  }, [copied, announce]);
  return (
    <button
      type="button"
      data-slot="badge-copy"
      onClick={() => copy(value)}
      aria-label={copied ? "Copied" : "Copy"}
      className="inline-flex shrink-0 items-center justify-center rounded-xs opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
    >
      {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
    </button>
  );
}

// The trailing count is a Counter, matched to the badge's tone/size. Its
// appearance is inverted against the badge (a solid badge gets a soft chip and
// vice versa) so the count always contrasts against the surface beneath it.
function BadgeCount({ count }: { count: number }) {
  const { tone, size, appearance } = useBadge();
  return (
    <Counter
      data-slot="badge-count"
      value={count}
      tone={tone}
      size={size === "xs" || size === "sm" ? "sm" : "md"}
      appearance={appearance === "solid" ? "soft" : "solid"}
      live={false}
    />
  );
}

/* ------------------------------------------------------------------ root --- */

export interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {
  /** Custom token reference or hex/rgb value; overrides `tone`. A solid fill gets a luminance-checked foreground. */
  color?: string;

  /** Fixed-width content before the label — an icon, dot, or avatar. */
  leading?: React.ReactNode;
  /** Fixed-width content after the label — an icon, count, or the copy button. */
  trailing?: React.ReactNode;
  /** A leading avatar (sugar for a small Avatar in the leading slot). */
  avatar?: React.ReactNode;

  /**
   * Show a status dot in the leading slot.
   * @default false
   */
  dot?: boolean;
  /**
   * Add a reduced-motion-safe pulsing ring around the `dot`.
   * @default false
   */
  pulse?: boolean;
  /**
   * Swap the leading glyph for a spinner and set `aria-busy`.
   * @default false
   */
  loading?: boolean;
  /** A completeness ring in the leading slot; 0–100, snaps to a check at 100. */
  progress?: number;

  /**
   * Ellipsize a long label at `maxWidth`, exposing the full text via `title`.
   * @default false
   */
  truncate?: boolean;
  /**
   * Max label width when `truncate` is set (px number, or any CSS length).
   * @default 200
   */
  maxWidth?: number | string;

  /**
   * Add a trailing copy-to-clipboard button — Badge's only interactive affordance.
   * @default false
   */
  copyable?: boolean;
  /** Value copied by the `copyable` button (defaults to the label text). */
  copyValue?: string;
  /**
   * A trailing count, rendered by the Counter component (not a plain number):
   * it caps at 99+, rolls its digits on change, and announces the true count to
   * screen readers. Tone and size follow the badge; the count's appearance
   * inverts against the badge's so it always contrasts.
   */
  count?: number;

  /**
   * Render the single child element as the root (via Radix `Slot`) — e.g. an
   * `<a>` wearing the badge styling.
   * @default false
   */
  asChild?: boolean;
}

/**
 * A static, non-interactive inline label for a status, count, or short piece of
 * metadata — renders a `<span>` (or the child element via `asChild`) across the
 * tone × appearance × size matrix, with opt-in leading/trailing sugar.
 *
 * Documentation: https://garn.ohuba.com/components/badge
 */
function Badge(props: BadgeProps) {
  const {
    className,
    style,
    tone = "neutral",
    appearance = "soft",
    size = "md",
    shape,
    color,
    mono = false,
    leading,
    trailing,
    avatar,
    dot = false,
    pulse = false,
    loading = false,
    progress,
    truncate = false,
    maxWidth = 200,
    copyable = false,
    copyValue,
    count,
    asChild = false,
    children,
    ...rest
  } = props;

  const Comp = asChild ? Slot : "span";

  // Custom color: drive --b-* off a single --badge-c, mixing toward the surface
  // (transparent) so soft/outline stay readable in light AND dark. Solid gets a
  // luminance-checked foreground; tokens/oklch we can't parse fall back to white.
  const customStyle: React.CSSProperties | undefined = color
    ? ({
        "--badge-c": color,
        "--b-soft-bg": "color-mix(in oklab, var(--badge-c), transparent 87%)",
        "--b-soft-fg": "var(--badge-c)",
        "--b-solid-bg": "var(--badge-c)",
        "--b-solid-fg": getReadableForeground(color) ?? "var(--garn-neutral-0)",
        "--b-line": "color-mix(in oklab, var(--badge-c), transparent 55%)",
        "--b-text": "var(--badge-c)",
      } as React.CSSProperties)
    : undefined;

  // Status sugar → leading slot (mutually exclusive, in priority order).
  const leadingNode: React.ReactNode = loading ? (
    <Spinner size="xs" aria-label="Loading" />
  ) : progress != null ? (
    <BadgeProgressRing value={progress} />
  ) : avatar != null ? (
    avatar
  ) : dot ? (
    <BadgeDot pulse={pulse} />
  ) : (
    leading
  );

  // Trailing slot: explicit trailing + count sugar + the copy affordance.
  const trailingNodes: React.ReactNode[] = [];
  if (trailing != null) trailingNodes.push(<React.Fragment key="t">{trailing}</React.Fragment>);
  if (count != null) trailingNodes.push(<BadgeCount key="c" count={count} />);
  if (copyable)
    trailingNodes.push(<BadgeCopyButton key="copy" value={copyValue ?? String(children ?? "")} />);

  const hasStringLabel = typeof children === "string" || typeof children === "number";
  const labelText = hasStringLabel ? String(children) : undefined;

  if (process.env.NODE_ENV !== "production") {
    const hasName =
      rest["aria-label"] != null ||
      rest["aria-labelledby"] != null ||
      rest.title != null ||
      hasTextContent(children) ||
      hasTextContent(leading) ||
      hasTextContent(trailing);
    const hasVisual =
      leadingNode != null || trailingNodes.length > 0 || hasTextContent(children);
    if (!hasName && !asChild && hasVisual) {
      // eslint-disable-next-line no-console
      console.warn(
        "garn Badge: an icon-only badge has no accessible name. Pass `aria-label` (or `aria-labelledby` / `title` / an sr-only label)."
      );
    }
  }

  const ctx = React.useMemo<BadgeContextValue>(
    () => ({ tone: tone ?? "neutral", size: size ?? "md", appearance: appearance ?? "soft" }),
    [tone, size, appearance]
  );

  // Provider wraps Comp (not the inner content): when asChild, Slot must see the
  // slot spans + Slottable as its DIRECT children to merge onto the consumer's
  // element — a context provider in between would break that traversal.
  return (
    <BadgeContext.Provider value={ctx}>
      <Comp
        data-slot="badge"
        data-tone={tone ?? "neutral"}
        data-appearance={appearance ?? "soft"}
        data-size={size ?? "md"}
        data-shape={shape ?? "rounded"}
        className={cn(badgeVariants({ tone, appearance, size, shape, mono }), className)}
        style={{ ...customStyle, ...style }}
        aria-busy={loading || undefined}
        {...rest}
      >
        {leadingNode != null ? <BadgeLeading>{leadingNode}</BadgeLeading> : null}

        <Slottable>
          {asChild ? (
            children
          ) : hasStringLabel ? (
            <BadgeLabel
              className={cn(truncate && "truncate")}
              style={truncate ? { maxWidth } : undefined}
              title={truncate ? labelText : undefined}
            >
              {children}
            </BadgeLabel>
          ) : (
            children
          )}
        </Slottable>

        {trailingNodes.length > 0 ? <BadgeTrailing>{trailingNodes}</BadgeTrailing> : null}
      </Comp>
    </BadgeContext.Provider>
  );
}

type BadgeComponent = typeof Badge & {
  Leading: typeof BadgeLeading;
  Label: typeof BadgeLabel;
  Trailing: typeof BadgeTrailing;
  Separator: typeof BadgeSeparator;
};

const BadgeRoot = Badge as BadgeComponent;
BadgeRoot.Leading = BadgeLeading;
BadgeRoot.Label = BadgeLabel;
BadgeRoot.Trailing = BadgeTrailing;
BadgeRoot.Separator = BadgeSeparator;

export {
  BadgeRoot as Badge,
  badgeVariants,
  useBadge,
  getReadableForeground,
  BadgeLeading,
  BadgeLabel,
  BadgeTrailing,
  BadgeSeparator,
};
