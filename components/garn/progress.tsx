"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

// A Radix Progress wrapper (determinate feedback). Beyond the basic bar it adds a
// `tone` axis with a smart `tone="auto"` that maps the value to a tone via
// `thresholds`; a capacity meter (ProgressTrack + ProgressSegment) that is
// semantically role="meter" (a static scalar in a known range), NOT a progressbar;
// and a correct indeterminate state that OMITS aria-valuenow (never zeroes it) per
// the APG while keeping role="progressbar".

export type ProgressTone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

/** Ascending value→tone breakpoints. The highest `at` the value meets wins. */
export interface ProgressThreshold {
  at: number;
  tone: ProgressTone;
}

/** Capacity-style default: healthy → caution at 75% → danger at 90%. */
const DEFAULT_THRESHOLDS: ProgressThreshold[] = [
  { at: 0, tone: "success" },
  { at: 75, tone: "warning" },
  { at: 90, tone: "danger" },
];

/** Resolve a percentage (0–100) to a tone via an ascending threshold map. */
function resolveAutoTone(
  pct: number,
  thresholds: ProgressThreshold[] = DEFAULT_THRESHOLDS
): ProgressTone {
  let tone: ProgressTone = "neutral";
  // Sort defensively so callers can pass thresholds in any order.
  const sorted = [...thresholds].sort((a, b) => a.at - b.at);
  for (const t of sorted) {
    if (pct >= t.at) tone = t.tone;
    else break;
  }
  return tone;
}

/* ------------------------------------------------------------- variants ----- */

// The fill paints from the AA-tuned solid-fill tokens (`--garn-badge-*-bold`) so
// the contrast is the tuned one (warning a saturated amber, danger the destructive
// red, both mode-correct in the token layer — no `dark:` here). The mid `--garn-*`
// text-tones read pale as a solid fill, especially warning.
const indicatorToneVariants = cva("size-full flex-1", {
  variants: {
    tone: {
      neutral: "bg-[var(--garn-badge-neutral-bold)]",
      brand: "bg-[var(--garn-badge-brand-bold)]",
      success: "bg-[var(--garn-badge-success-bold)]",
      warning: "bg-[var(--garn-badge-warning-bold)]",
      danger: "bg-[var(--garn-badge-danger-bold)]",
      info: "bg-[var(--garn-badge-info-bold)]",
    },
  },
  defaultVariants: { tone: "brand" },
});

// Track heights from the spacing scale — never raw px (the `size` axis, not
// density). The track tint follows the resolved tone so the unfilled rail reads
// as a faint wash of the same colour.
const trackVariants = cva("relative w-full overflow-hidden rounded-full", {
  variants: {
    size: { sm: "h-1.5", md: "h-2", lg: "h-3" },
    tone: {
      neutral: "bg-muted",
      brand: "bg-brand-solid/15",
      success: "bg-success/15",
      warning: "bg-warning/20",
      danger: "bg-danger/15",
      info: "bg-info/15",
    },
  },
  defaultVariants: { size: "md", tone: "brand" },
});

// Segment fills reuse the single-bar indicator's badge-bold tone mapping. A tiny
// `min-w` floors a non-zero slice so a 1–2% segment stays visible, and the seam
// between adjacent segments comes from a hairline gap on the flex track (set on
// ProgressTrack) that lets the rail show through — so neighbouring tones read as
// distinct without a border.
const segmentToneVariants = cva(
  "h-full min-w-[var(--garn-space-2)] transition-[width] duration-[var(--garn-motion-base)] ease-standard motion-reduce:transition-none",
  {
    variants: {
      tone: {
        neutral: "bg-[var(--garn-badge-neutral-bold)]",
        brand: "bg-[var(--garn-badge-brand-bold)]",
        success: "bg-[var(--garn-badge-success-bold)]",
        warning: "bg-[var(--garn-badge-warning-bold)]",
        danger: "bg-[var(--garn-badge-danger-bold)]",
        info: "bg-[var(--garn-badge-info-bold)]",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

/* --------------------------------------------------------------- helpers ---- */

const clampPct = (value: number, max: number) =>
  max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));

/** Default value formatter — a rounded percentage. */
const formatPercent = (value: number, max: number) =>
  `${Math.round(clampPct(value, max))}%`;

/* ----------------------------------------------------------- label / value -- */

export interface ProgressLabelProps extends React.ComponentProps<"span"> {}

/** The bar's visible caption — wired as its accessible name when present. */
function ProgressLabel({ className, ...props }: ProgressLabelProps) {
  return (
    <span
      data-slot="progress-label"
      className={cn("text-sm font-medium text-foreground", className)}
      {...props}
    />
  );
}

export interface ProgressValueProps extends React.ComponentProps<"span"> {}

/** The numeric read-out (percent or a `format(value, max)` string). */
function ProgressValue({ className, ...props }: ProgressValueProps) {
  return (
    <span
      data-slot="progress-value"
      className={cn("text-sm tabular-nums text-muted-foreground", className)}
      {...props}
    />
  );
}

/* ----------------------------------------------------------------- root ----- */

export interface ProgressProps
  extends Omit<
    React.ComponentProps<typeof ProgressPrimitive.Root>,
    "value" | "asChild"
  > {
  /** 0–`max`. `null`/`undefined` → indeterminate (or set `indeterminate`). */
  value?: number | null;
  /**
   * Force indeterminate even with no value (the unknown-progress mode).
   * @default false
   */
  indeterminate?: boolean;
  /**
   * `neutral | brand | success | warning | danger | info`, or `"auto"` to drive
   * the tone from the value via `thresholds`.
   * @default "brand"
   */
  tone?: ProgressTone | "auto";
  /**
   * Ascending value→tone map for `tone="auto"`.
   * @default [{ at: 0, tone: "success" }, { at: 75, tone: "warning" }, { at: 90, tone: "danger" }]
   */
  thresholds?: ProgressThreshold[];
  /**
   * Track height.
   * @default "md"
   */
  size?: "sm" | "md" | "lg";
  /** A visible caption (rendered in a ProgressLabel; becomes the accessible name). */
  label?: React.ReactNode;
  /**
   * Show the value read-out beside the label.
   * @default false
   */
  showValue?: boolean;
  /**
   * Format the read-out + `aria-valuetext`.
   * @default (value, max) => `${Math.round((value / max) * 100)}%`
   */
  format?: (value: number, max: number) => string;
}

/**
 * A determinate (or indeterminate) progress bar — task completion, upload state,
 * or a capacity gauge. Supports value-driven `tone="auto"` and a segmented
 * capacity meter via `ProgressTrack` / `ProgressSegment`.
 *
 * Documentation: https://garn.ohuba.com/components/progress
 */
function Progress({
  className,
  value,
  indeterminate = false,
  tone = "brand",
  thresholds,
  size = "md",
  max = 100,
  label,
  showValue = false,
  format = formatPercent,
  id: idProp,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  ...props
}: ProgressProps) {
  const reactId = React.useId();
  const labelId = `${idProp ?? reactId}-label`;

  const isIndeterminate = indeterminate || value == null;
  const numeric = value ?? 0;
  const pct = clampPct(numeric, max);

  // `tone="auto"` resolves against the percentage; an explicit tone passes through.
  const resolvedTone: ProgressTone =
    tone === "auto" ? resolveAutoTone(pct, thresholds) : tone;

  const valueText = isIndeterminate ? undefined : format(numeric, max);

  // Accessible name: an explicit aria-label(ledby) wins; else the visible label.
  const hasOwnName = Boolean(ariaLabel || ariaLabelledby);
  const resolvedLabelledby =
    ariaLabelledby ?? (label != null ? labelId : undefined);

  React.useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (!hasOwnName && label == null) {
      // eslint-disable-next-line no-console
      console.warn(
        "garn Progress: give the bar an accessible name via `label`, `aria-label`, or `aria-labelledby`."
      );
    }
  }, [hasOwnName, label]);

  const header =
    label != null || showValue ? (
      <div
        data-slot="progress-header"
        // Baseline-align the label and value (both text-sm) so the read-out sits
        // on the same line as the caption rather than optically-centred against it.
        className="mb-[var(--garn-gap-field)] flex items-baseline justify-between gap-2"
      >
        {label != null ? (
          <ProgressLabel id={labelId}>{label}</ProgressLabel>
        ) : (
          <span />
        )}
        {showValue ? (
          <ProgressValue>
            {isIndeterminate ? "" : format(numeric, max)}
          </ProgressValue>
        ) : null}
      </div>
    ) : null;

  const bar = (
    <ProgressPrimitive.Root
      data-slot="progress"
      data-tone={resolvedTone}
      data-size={size}
      // Forward the (possibly null) value so Radix wires `aria-valuenow` /
      // `data-state` — and correctly OMITS aria-valuenow when indeterminate.
      value={isIndeterminate ? null : numeric}
      max={max}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? undefined : resolvedLabelledby}
      aria-valuetext={valueText}
      className={cn(trackVariants({ size, tone: resolvedTone }), className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          indicatorToneVariants({ tone: resolvedTone }),
          isIndeterminate
            ? "w-2/5 animate-[var(--animate-progress-indeterminate)] rounded-full motion-reduce:animate-none"
            : "transition-transform duration-[var(--garn-motion-base)] ease-standard motion-reduce:transition-none"
        )}
        style={
          isIndeterminate
            ? undefined
            : { transform: `translateX(-${100 - pct}%)` }
        }
      />
    </ProgressPrimitive.Root>
  );

  // No chrome (no label/value) → return the bare bar so the terse path stays a
  // single element with the consumer's className on the track.
  if (!header) return bar;

  return (
    <div data-slot="progress-root" className="w-full">
      {header}
      {bar}
    </div>
  );
}

/* ----------------------------------------------------- capacity meter ------- */

interface ProgressTrackContextValue {
  max: number;
  size: "sm" | "md" | "lg";
}
const ProgressTrackContext =
  React.createContext<ProgressTrackContextValue | null>(null);

export interface ProgressTrackProps
  extends Omit<React.ComponentProps<"div">, "role"> {
  /**
   * Track height.
   * @default "md"
   */
  size?: "sm" | "md" | "lg";
  /**
   * Total the segments sum toward (the denominator).
   * @default 100
   */
  max?: number;
  /** A summary string for `aria-valuetext` (e.g. "78 of 100 GB used"). */
  valueText?: string;
  /** Accessible name (required — a meter carries no text of its own). */
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

/**
 * A multi-segment capacity bar. Unlike `Progress` this is a **`role="meter"`** —
 * a static scalar in a known range (the WAI-ARIA APG forbids a meter for task
 * progress, and requires an always-present value). The filled total (the sum of
 * its segments) becomes `aria-valuenow`; the `valueText` carries the breakdown.
 */
function ProgressTrack({
  className,
  children,
  size = "md",
  max = 100,
  valueText,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  ...props
}: ProgressTrackProps) {
  // Sum the child segment values to derive aria-valuenow (the filled total).
  const filled = React.useMemo(() => {
    let sum = 0;
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && child.type === ProgressSegment) {
        const v = (child.props as ProgressSegmentProps).value;
        if (typeof v === "number") sum += v;
      }
    });
    return Math.min(sum, max);
  }, [children, max]);

  React.useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (!ariaLabel && !ariaLabelledby) {
      // eslint-disable-next-line no-console
      console.warn(
        "garn ProgressTrack: a capacity meter needs an accessible name via `aria-label` or `aria-labelledby`."
      );
    }
  }, [ariaLabel, ariaLabelledby]);

  const ctx = React.useMemo<ProgressTrackContextValue>(
    () => ({ max, size }),
    [max, size]
  );

  return (
    <ProgressTrackContext.Provider value={ctx}>
      {/* A native <meter> renders its own bar and cannot host the
          custom-coloured <ProgressSegment> children — role="meter" on a div is
          the APG-sanctioned pattern for a composed multi-segment capacity meter. */}
      <div
        data-slot="progress-track"
        data-size={size}
        role="meter"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : ariaLabelledby}
        aria-valuenow={filled}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuetext={valueText}
        // `gap` opens a 2px seam between segments so the rail shows through and
        // adjacent tones read as distinct; the first/last segments still hug the
        // rounded track ends.
        className={cn(
          trackVariants({ size, tone: "neutral" }),
          "flex gap-[var(--garn-space-2)]",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </ProgressTrackContext.Provider>
  );
}

export interface ProgressSegmentProps
  extends Omit<React.ComponentProps<"div">, "color"> {
  /** This segment's share of the track's `max`. */
  value: number;
  /**
   * Tone of the fill.
   * @default "neutral"
   */
  tone?: ProgressTone;
}

/**
 * One coloured slice of a `ProgressTrack`. Decorative (`aria-hidden`) — the meter
 * announces the aggregate; per-segment meaning travels via the track's
 * `valueText`. Width is `value / max`, set inline (a dynamic length never
 * generates a class, so it stays token-safe).
 */
function ProgressSegment({
  className,
  value,
  tone = "neutral",
  style,
  ...props
}: ProgressSegmentProps) {
  const ctx = React.useContext(ProgressTrackContext);
  const max = ctx?.max ?? 100;
  const width = clampPct(value, max);

  // An empty category renders nothing — no min-width sliver, and it doesn't eat a
  // seam gap (so the remaining segments still sum cleanly).
  if (width <= 0) return null;

  return (
    <div
      data-slot="progress-segment"
      data-tone={tone}
      aria-hidden="true"
      className={cn(
        segmentToneVariants({ tone }),
        "first:rounded-s-full last:rounded-e-full",
        className
      )}
      style={{ width: `${width}%`, ...style }}
      {...props}
    />
  );
}

/* --------------------------------------------------------------- exports ---- */

export {
  Progress,
  ProgressLabel,
  ProgressValue,
  ProgressTrack,
  ProgressSegment,
  resolveAutoTone,
};
