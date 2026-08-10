"use client";

import * as React from "react";
import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { ArrowDownRight, ArrowUpRight, MinusIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/garn/skeleton";

export type StatSize = "sm" | "md" | "lg";
type Align = "start" | "center" | "end";
export type StatDirection = "up" | "down" | "neutral";
/** What "good" means for this metric. `inverse` flips which direction reads green
 *  (up is bad: churn, latency, cost). */
export type StatSentiment = "positive" | "inverse";
type DeltaTone = "positive" | "negative" | "muted";
export type StatDeltaAppearance = "text" | "soft";
export type StatNumberFormat = "standard" | "compact" | "currency" | "percent";

/* ------------------------------------------------------------- helpers ----- */

/** Walk a node for any non-empty string — for the group's accessible name. */
function textOf(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (React.isValidElement(node))
    return textOf((node.props as { children?: React.ReactNode }).children);
  return "";
}

interface FormatOpts {
  format?: StatNumberFormat;
  currency?: string;
  precision?: number;
  locale?: string;
}

/** Format a numeric value through Intl — the Counter house pattern. */
function formatNumber(value: number, opts: FormatOpts): string {
  const { format = "standard", currency, precision, locale } = opts;
  const options: Intl.NumberFormatOptions = {};
  if (format === "compact") {
    options.notation = "compact";
    options.maximumFractionDigits = precision ?? 1;
  } else if (format === "currency") {
    options.style = "currency";
    options.currency = currency ?? "USD";
    if (precision != null) {
      options.minimumFractionDigits = precision;
      options.maximumFractionDigits = precision;
    }
  } else if (format === "percent") {
    options.style = "percent";
    options.maximumFractionDigits = precision ?? 1;
  } else if (precision != null) {
    options.minimumFractionDigits = precision;
    options.maximumFractionDigits = precision;
  }
  return new Intl.NumberFormat(locale, options).format(value);
}

/** Sign of a numeric delta → direction. */
function directionOf(delta: number): StatDirection {
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "neutral";
}

/** Resolve good/bad tone from direction + sentiment. */
function deltaTone(direction: StatDirection, sentiment: StatSentiment): DeltaTone {
  if (direction === "neutral") return "muted";
  const upIsGood = sentiment !== "inverse";
  const good = direction === "up" ? upIsGood : !upIsGood;
  return good ? "positive" : "negative";
}

/* ------------------------------------------------------------- context ----- */

interface StatContextValue {
  size: StatSize;
  /** Id of the label, so the value can `aria-describedby` it. */
  labelId: string;
  /** Set by Stat.Label when it renders, so the value/root can wire the relationship. */
  hasLabel: boolean;
  registerLabel: () => void;
  /** Shared number-format defaults, inherited by Stat.Value / Stat.Delta. */
  format: FormatOpts;
  loading: boolean;
}

const StatContext = React.createContext<StatContextValue | null>(null);

/** Read the ambient tile size + shared number-format defaults so custom slot content can match. */
function useStat(): StatContextValue | null {
  return React.useContext(StatContext);
}

interface StatGroupContextValue {
  size: StatSize;
}
const StatGroupContext = React.createContext<StatGroupContextValue | null>(null);

/* ------------------------------------------------------------- styling ----- */

const statVariants = cva(
  "flex min-w-0 flex-col text-card-foreground",
  {
    variants: {
      size: {
        sm: "gap-[var(--garn-gap-field)]",
        md: "gap-[var(--garn-gap-field)]",
        lg: "gap-[var(--garn-gap-stack)]",
      },
      align: {
        start: "items-start text-start",
        center: "items-center text-center",
        end: "items-end text-end",
      },
    },
    defaultVariants: { size: "md", align: "start" },
  }
);

// Value type scale per size. Identity type, not air — a metric's headline size is
// its drawn presence; density scales the surrounding gaps, not the number's rung.
const valueSize: Record<StatSize, string> = {
  sm: "text-2xl",
  md: "text-3xl",
  lg: "text-4xl",
};

const labelSize: Record<StatSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-sm",
};

// Prefix ("$") / suffix ("ms") sit one type-rung below the value so a unit reads
// as subordinate to the headline number — token-scale utilities, never raw em.
const prefixSize: Record<StatSize, string> = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-xl",
};
const suffixSize: Record<StatSize, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

/* ---------------------------------------------------------- compound parts -- */

type DivProps = React.ComponentProps<"div">;
type SpanProps = React.ComponentProps<"span">;

/** Leading icon / glyph for the tile. Decorative — hidden from assistive tech. */
function StatIcon({ className, "aria-hidden": ariaHidden, ...props }: SpanProps) {
  const stat = useStat();
  const size = stat?.size ?? "md";
  return (
    <span
      data-slot="stat-icon"
      aria-hidden={ariaHidden ?? true}
      className={cn(
        "inline-flex shrink-0 items-center justify-center text-muted-foreground [&_svg]:shrink-0",
        size === "sm"
          ? "[&_svg]:size-4"
          : size === "lg"
            ? "[&_svg]:size-6"
            : "[&_svg]:size-5",
        className
      )}
      {...props}
    />
  );
}

/** The metric's name. Registers itself so Stat.Value can describe-by it. */
function StatLabel({ className, id, ...props }: SpanProps) {
  const stat = useStat();
  const resolvedId = id ?? stat?.labelId;
  // Register on mount so the value/root can wire `aria-describedby`.
  React.useEffect(() => {
    stat?.registerLabel();
  }, [stat]);
  return (
    <span
      data-slot="stat-label"
      id={resolvedId}
      className={cn(
        "min-w-0 truncate font-medium text-muted-foreground",
        labelSize[stat?.size ?? "md"],
        className
      )}
      {...props}
    />
  );
}

export interface StatValueProps
  extends Omit<React.ComponentProps<"span">, "prefix" | "children">,
    FormatOpts {
  /** A number (formatted via Intl) or any node (rendered verbatim, e.g. "—"). */
  children?: React.ReactNode;
  /** Rendered before the value (a unit, "$"). */
  prefix?: React.ReactNode;
  /** Rendered after the value (a unit, "ms", "/mo"). */
  suffix?: React.ReactNode;
}

/** The headline number. Formats a numeric child via Intl; renders any node as-is. */
function StatValue({
  children,
  prefix,
  suffix,
  format,
  currency,
  precision,
  locale,
  className,
  ...props
}: StatValueProps) {
  const stat = useStat();
  const size = stat?.size ?? "md";

  const display =
    typeof children === "number"
      ? formatNumber(children, {
          format: format ?? stat?.format.format,
          currency: currency ?? stat?.format.currency,
          precision: precision ?? stat?.format.precision,
          locale: locale ?? stat?.format.locale,
        })
      : children;

  return (
    <span
      data-slot="stat-value"
      aria-describedby={stat?.hasLabel ? stat.labelId : undefined}
      className={cn(
        "inline-flex min-w-0 items-baseline gap-1 font-semibold leading-none tracking-tight tabular-nums",
        valueSize[size],
        className
      )}
      {...props}
    >
      {prefix != null ? (
        <span
          data-slot="stat-value-prefix"
          className={cn("text-muted-foreground", prefixSize[size])}
        >
          {prefix}
        </span>
      ) : null}
      <span className="min-w-0 truncate">{display}</span>
      {suffix != null ? (
        <span
          data-slot="stat-value-suffix"
          className={cn("font-medium text-muted-foreground", suffixSize[size])}
        >
          {suffix}
        </span>
      ) : null}
    </span>
  );
}

const deltaVariants = cva(
  "inline-flex w-fit items-center gap-0.5 font-medium tabular-nums [&_svg]:shrink-0",
  {
    variants: {
      // Literal slot-var strings on purpose — Tailwind's scanner only emits CSS
      // for classes that appear verbatim in source.
      tone: {
        positive: "[--d-fg:var(--garn-success)] [--d-bg:var(--garn-success-subtle)]",
        negative: "[--d-fg:var(--garn-danger)] [--d-bg:var(--garn-danger-subtle)]",
        muted:
          "[--d-fg:var(--garn-muted-foreground)] [--d-bg:var(--garn-muted)]",
      },
      appearance: {
        text: "text-[var(--d-fg)]",
        soft: "rounded-full bg-[var(--d-bg)] px-1.5 py-0.5 text-[var(--d-fg)]",
      },
      size: {
        sm: "text-xs [&_svg]:size-3",
        md: "text-sm [&_svg]:size-3.5",
        lg: "text-sm [&_svg]:size-4",
      },
    },
    defaultVariants: { tone: "muted", appearance: "text", size: "md" },
  }
);

const DIRECTION_WORD: Record<StatDirection, string> = {
  up: "up",
  down: "down",
  neutral: "no change",
};

export interface StatDeltaProps
  extends Omit<React.ComponentProps<"span">, "children" | "prefix">,
    FormatOpts {
  /** The change. A number formats via Intl + infers direction from its sign. */
  children?: React.ReactNode;
  /** Override the inferred direction (defaults to the sign of a numeric child). */
  direction?: StatDirection;
  /**
   * What "good" means — flips which direction reads green.
   * @default "positive"
   */
  sentiment?: StatSentiment;
  /**
   * `text` (coloured inline arrow) or `soft` (a tinted lozenge).
   * @default "text"
   */
  appearance?: StatDeltaAppearance;
  /**
   * Hide the directional arrow glyph.
   * @default false
   */
  hideIcon?: boolean;
  /** Trailing context, rendered muted ("vs. last week"). */
  trailing?: React.ReactNode;
  /** Accessible phrasing of the change, when the value alone isn't self-describing. */
  label?: string;
}

/** The change indicator — tone follows good/bad, never up/down alone. */
function StatDelta({
  children,
  direction: directionProp,
  sentiment = "positive",
  appearance = "text",
  hideIcon = false,
  trailing,
  label,
  format,
  currency,
  precision,
  locale,
  className,
  ...props
}: StatDeltaProps) {
  const stat = useStat();
  const size = stat?.size ?? "md";

  const numeric = typeof children === "number" ? children : null;
  const direction: StatDirection =
    directionProp ?? (numeric != null ? directionOf(numeric) : "neutral");
  const tone = deltaTone(direction, sentiment);

  // A delta describes a *change*, not the value's unit — so it does NOT inherit
  // the value's format/currency/precision. It defaults to `percent` (the dominant
  // KPI convention: "+12.5%"); pass `format="standard"` for an absolute change
  // (+3) or `currency` for a money delta. Only `locale` is inherited (grouping /
  // SSR determinism). The sign is shown by the arrow glyph + tone, so the printed
  // number drops its own minus to avoid a doubled "↓ -3%".
  const display =
    numeric != null
      ? formatNumber(Math.abs(numeric), {
          format: format ?? "percent",
          currency,
          precision,
          locale: locale ?? stat?.format.locale,
        })
      : children;

  const Glyph =
    direction === "up"
      ? ArrowUpRight
      : direction === "down"
        ? ArrowDownRight
        : MinusIcon;

  const announced =
    label ?? `${DIRECTION_WORD[direction]} ${textOf(display)}`.trim();

  return (
    <span
      data-slot="stat-delta"
      data-direction={direction}
      data-sentiment={sentiment}
      data-tone={tone}
      className={cn(deltaVariants({ tone, appearance, size }), className)}
      {...props}
    >
      {hideIcon ? null : <Glyph aria-hidden="true" />}
      <span aria-hidden="true">{display}</span>
      {/* Direction reaches assistive tech in words, so it's never colour-only. */}
      <span className="sr-only">{announced}</span>
      {trailing != null ? (
        <span
          data-slot="stat-delta-trailing"
          aria-hidden="true"
          className="font-normal text-muted-foreground"
        >
          {trailing}
        </span>
      ) : null}
    </span>
  );
}

/** Supporting copy under the value. */
function StatDescription({ className, ...props }: DivProps) {
  return (
    <div
      data-slot="stat-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

/**
 * A bare presentational slot at the foot of the tile for a trend visual —
 * a sparkline, a Progress, a mini bar. Stat ships no charting dep: it only
 * reserves the box so the future Chart recipe drops in. Marked presentational.
 */
function StatTrend({ className, ...props }: DivProps) {
  return (
    <div
      data-slot="stat-trend"
      role="presentation"
      className={cn("mt-1 min-w-0", className)}
      {...props}
    />
  );
}

/* ------------------------------------------------------------- skeleton ---- */

function StatSkeleton({ size, align }: { size: StatSize; align: Align }) {
  const items = align === "center" ? "items-center" : align === "end" ? "items-end" : "items-start";
  return (
    <div
      data-slot="stat-skeleton"
      aria-hidden="true"
      className={cn("flex w-full flex-col gap-[var(--garn-gap-field)]", items)}
    >
      <Skeleton className={cn("h-3.5", size === "lg" ? "w-28" : "w-20")} />
      <Skeleton
        className={cn(
          size === "sm" ? "h-7 w-24" : size === "lg" ? "h-10 w-36" : "h-8 w-28"
        )}
      />
      <Skeleton className="h-3.5 w-16" />
    </div>
  );
}

/* ------------------------------------------------------------- Stat (root) - */

export interface StatProps
  extends Omit<React.ComponentProps<"div">, "prefix" | "title">,
    VariantProps<typeof statVariants>,
    FormatOpts {
  /** Terse: the metric's name. */
  label?: React.ReactNode;
  /** Terse: the headline value (number → Intl-formatted, or any node). */
  value?: React.ReactNode;
  /** Terse: the change. Number infers direction from its sign. */
  delta?: React.ReactNode;
  /** Override the delta's inferred direction. */
  direction?: StatDirection;
  /** What "good" means for the delta. Default `positive`. */
  sentiment?: StatSentiment;
  /** Terse: leading icon (decorative). */
  icon?: React.ReactNode;
  /** Terse: supporting copy under the value. */
  description?: React.ReactNode;
  /** Terse: a trend visual slot (sparkline / progress) at the foot. */
  trend?: React.ReactNode;
  /** Rendered before the value. */
  prefix?: React.ReactNode;
  /** Rendered after the value. */
  suffix?: React.ReactNode;
  /**
   * Delta presentation — inline coloured arrow, or a tinted lozenge.
   * @default "text"
   */
  deltaAppearance?: StatDeltaAppearance;
  /**
   * How the terse `delta` is formatted (the KPI convention is a percent).
   * @default "percent"
   */
  deltaFormat?: StatNumberFormat;
  /** Fraction digits for the terse `delta`. */
  deltaPrecision?: number;
  /**
   * Swap the value/label/delta for sized Skeleton blocks; keeps the footprint.
   * @default false
   */
  loading?: boolean;
  /**
   * Render as the child element (a link/button drill-down tile).
   * @default false
   */
  asChild?: boolean;
}

/**
 * A KPI / metric tile — a labelled number with an optional sentiment-aware delta,
 * an icon, supporting copy, and a chart-agnostic trend slot. Surface-less, so it
 * composes onto Card; `asChild` promotes the whole tile to a drill-down link.
 *
 * Documentation: https://garn.ohuba.com/components/stat
 */
function Stat({
  label,
  value,
  delta,
  direction,
  sentiment,
  icon,
  description,
  trend,
  prefix,
  suffix,
  deltaAppearance = "text",
  deltaFormat,
  deltaPrecision,
  format,
  currency,
  precision,
  locale,
  size: sizeProp,
  align = "start",
  loading = false,
  asChild = false,
  className,
  children,
  ref,
  "aria-label": ariaLabel,
  ...rest
}: StatProps) {
  const group = React.useContext(StatGroupContext);
  const size = sizeProp ?? group?.size ?? "md";

  const rootRef = React.useRef<HTMLDivElement | null>(null);
  // Compose the internal probe ref with any consumer ref (React 19 ref-as-prop).
  const setRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.RefObject<HTMLDivElement | null>).current = node;
    },
    [ref]
  );
  const labelId = React.useId();
  const [hasLabel, setHasLabel] = React.useState(false);
  const registerLabel = React.useCallback(() => setHasLabel(true), []);

  // Terse mode renders the stack from props. When asChild, `children` is the
  // wrapper element (a drill-down link/button), so the stack still comes from
  // props; otherwise terse means "no composed children were passed".
  const terse = asChild || children == null;
  const labelText = textOf(label);

  const ctx = React.useMemo<StatContextValue>(
    () => ({
      size,
      labelId,
      hasLabel: hasLabel || (terse && label != null),
      registerLabel,
      format: { format, currency, precision, locale },
      loading,
    }),
    [size, labelId, hasLabel, terse, label, registerLabel, format, currency, precision, locale, loading]
  );

  // Dev-only: a metric without a name is unscannable / unlabelled. Probe the
  // committed DOM (deferred a frame so composed <Stat.Label> children have
  // rendered) rather than the register-effect, which races on first commit.
  React.useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (loading || ariaLabel != null) return;
    const id = requestAnimationFrame(() => {
      const named =
        (terse ? label != null : false) ||
        !!rootRef.current?.querySelector('[data-slot="stat-label"]');
      if (!named) {
        // eslint-disable-next-line no-console
        console.warn(
          "garn Stat: provide a metric name via `label`, a <Stat.Label>, or `aria-label` so the value is scannable and announced."
        );
      }
    });
    return () => cancelAnimationFrame(id);
  }, [terse, label, ariaLabel, loading]);

  const Comp = asChild ? Slot : "div";

  // The terse stack, built from the root's props. Used directly when not asChild
  // and not composed; when asChild, it's injected (via Slottable) as the children
  // of the consumer's element so a drill-down `<a>`/`<button>` wraps the tile.
  const terseStack = (
    <>
      {icon != null ? <StatIcon>{icon}</StatIcon> : null}
      {label != null ? <StatLabel>{label}</StatLabel> : null}
      {value != null ? (
        <StatValue prefix={prefix} suffix={suffix}>
          {value}
        </StatValue>
      ) : null}
      {delta != null ? (
        // A primitive delta is wrapped in a Stat.Delta; a composed <Stat.Delta>
        // (or any element) is rendered as-is so the consumer keeps full control.
        React.isValidElement(delta) ? (
          delta
        ) : (
          <StatDelta
            appearance={deltaAppearance}
            direction={direction}
            sentiment={sentiment}
            format={deltaFormat}
            precision={deltaPrecision}
          >
            {delta}
          </StatDelta>
        )
      ) : null}
      {description != null ? (
        <StatDescription>{description}</StatDescription>
      ) : null}
      {trend != null ? <StatTrend>{trend}</StatTrend> : null}
    </>
  );

  // Non-asChild body: skeleton, or the terse stack, or composed children.
  const body = loading ? (
    <StatSkeleton size={size} align={align ?? "start"} />
  ) : terse ? (
    terseStack
  ) : (
    children
  );

  return (
    <StatContext.Provider value={ctx}>
      <Comp
        ref={setRef}
        data-slot="stat"
        data-size={size}
        data-align={align ?? "start"}
        data-loading={loading || undefined}
        role={asChild ? undefined : "group"}
        aria-label={ariaLabel ?? (labelText || undefined)}
        aria-busy={loading || undefined}
        className={cn(statVariants({ size, align }), className)}
        {...rest}
      >
        {asChild ? (
          // Slot merges its props onto the consumer element (the Slottable child);
          // the terse stack becomes that element's children. The Slottable and the
          // stack must be DIRECT, sibling children of Slot — never fragment-wrapped.
          <Slottable>{children}</Slottable>
        ) : null}
        {asChild
          ? loading
            ? <StatSkeleton size={size} align={align ?? "start"} />
            : terse
              ? terseStack
              : null
          : body}
      </Comp>
    </StatContext.Provider>
  );
}

/* ------------------------------------------------------------- StatGroup --- */

const groupVariants = cva("grid", {
  variants: {
    divided: {
      true: "gap-0 [&>[data-slot=stat]]:relative",
      false: "gap-[var(--garn-gap-section)]",
    },
  },
  defaultVariants: { divided: false },
});

export interface StatGroupProps extends React.ComponentProps<"div"> {
  /** Number of columns. Default: auto-fit by min tile width. */
  columns?: number;
  /** Min tile width for the auto-fit grid (when `columns` is unset). Default 220. */
  minTileWidth?: number;
  /** Seam separators between tiles (the divided stat-row look). */
  divided?: boolean;
  /** Ambient size inherited by child Stats (each may override). Default `md`. */
  size?: StatSize;
  /** Accessible name for the group of metrics. */
  label?: React.ReactNode;
}

/**
 * A responsive row/grid of Stat tiles. `columns` sets a fixed track count;
 * otherwise the grid auto-fits by `minTileWidth`. `divided` draws seam separators
 * between tiles (token-driven, RTL-safe via logical borders). The group is a
 * labelled region; ambient `size` flows to child Stats via context.
 */
function StatGroup({
  columns,
  minTileWidth = 220,
  divided = false,
  size = "md",
  label,
  className,
  style,
  children,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  ...rest
}: StatGroupProps) {
  const labelId = React.useId();

  const gridStyle: React.CSSProperties = {
    ...style,
    gridTemplateColumns:
      columns != null
        ? `repeat(${columns}, minmax(0, 1fr))`
        : `repeat(auto-fit, minmax(min(${minTileWidth}px, 100%), 1fr))`,
  };

  const ctx = React.useMemo<StatGroupContextValue>(() => ({ size }), [size]);

  return (
    <StatGroupContext.Provider value={ctx}>
      {label != null ? (
        <span id={labelId} data-slot="stat-group-label" className="sr-only">
          {label}
        </span>
      ) : null}
      <div
        data-slot="stat-group"
        data-divided={divided || undefined}
        role="group"
        aria-label={ariaLabel}
        aria-labelledby={
          ariaLabelledby ?? (label != null ? labelId : undefined)
        }
        className={cn(
          groupVariants({ divided }),
          // Seam separators between tiles: a logical inline/block start border on
          // every tile, suppressed on the first column/row by the grid's own edge.
          // Drawn with the same hairline `border` token the whole system shares.
          divided &&
            "[&>[data-slot=stat]]:border-border [&>[data-slot=stat]]:p-[var(--garn-pad-panel)] [&>[data-slot=stat]]:border-s [&>[data-slot=stat]]:border-t [&>[data-slot=stat]]:-ms-px [&>[data-slot=stat]]:-mt-px",
          className
        )}
        style={gridStyle}
        {...rest}
      >
        {children}
      </div>
    </StatGroupContext.Provider>
  );
}

/* --------------------------------------------------------------- exports --- */

type StatComponent = typeof Stat & {
  Icon: typeof StatIcon;
  Label: typeof StatLabel;
  Value: typeof StatValue;
  Delta: typeof StatDelta;
  Description: typeof StatDescription;
  Trend: typeof StatTrend;
  Group: typeof StatGroup;
};

const StatRoot = Stat as StatComponent;
StatRoot.Icon = StatIcon;
StatRoot.Label = StatLabel;
StatRoot.Value = StatValue;
StatRoot.Delta = StatDelta;
StatRoot.Description = StatDescription;
StatRoot.Trend = StatTrend;
StatRoot.Group = StatGroup;

export {
  StatRoot as Stat,
  StatIcon,
  StatLabel,
  StatValue,
  StatDelta,
  StatDescription,
  StatTrend,
  StatGroup,
  statVariants,
  deltaVariants,
  useStat,
};
