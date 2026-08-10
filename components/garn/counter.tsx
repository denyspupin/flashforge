"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const counterVariants = cva(
  "relative isolate inline-flex items-center justify-center text-center font-semibold leading-none tabular-nums",
  {
    variants: {
      // Literal strings on purpose: Tailwind's scanner only sees classes that
      // appear verbatim in source — a runtime factory would emit nothing into
      // the CSS.
      tone: {
        neutral:
          "[--c-soft-bg:var(--garn-badge-neutral-bg)] [--c-soft-fg:var(--garn-badge-neutral-fg)] [--c-solid-bg:var(--garn-badge-neutral-bold)] [--c-solid-fg:var(--garn-badge-neutral-bold-fg)] [--counter-ping:var(--garn-badge-neutral-bold)]",
        brand:
          "[--c-soft-bg:var(--garn-badge-brand-bg)] [--c-soft-fg:var(--garn-badge-brand-fg)] [--c-solid-bg:var(--garn-badge-brand-bold)] [--c-solid-fg:var(--garn-badge-brand-bold-fg)] [--counter-ping:var(--garn-badge-brand-bold)]",
        info: "[--c-soft-bg:var(--garn-badge-info-bg)] [--c-soft-fg:var(--garn-badge-info-fg)] [--c-solid-bg:var(--garn-badge-info-bold)] [--c-solid-fg:var(--garn-badge-info-bold-fg)] [--counter-ping:var(--garn-badge-info-bold)]",
        success:
          "[--c-soft-bg:var(--garn-badge-success-bg)] [--c-soft-fg:var(--garn-badge-success-fg)] [--c-solid-bg:var(--garn-badge-success-bold)] [--c-solid-fg:var(--garn-badge-success-bold-fg)] [--counter-ping:var(--garn-badge-success-bold)]",
        warning:
          "[--c-soft-bg:var(--garn-badge-warning-bg)] [--c-soft-fg:var(--garn-badge-warning-fg)] [--c-solid-bg:var(--garn-badge-warning-bold)] [--c-solid-fg:var(--garn-badge-warning-bold-fg)] [--counter-ping:var(--garn-badge-warning-bold)]",
        danger:
          "[--c-soft-bg:var(--garn-badge-danger-bg)] [--c-soft-fg:var(--garn-badge-danger-fg)] [--c-solid-bg:var(--garn-badge-danger-bold)] [--c-solid-fg:var(--garn-badge-danger-bold-fg)] [--counter-ping:var(--garn-badge-danger-bold)]",
        discovery:
          "[--c-soft-bg:var(--garn-badge-discovery-bg)] [--c-soft-fg:var(--garn-badge-discovery-fg)] [--c-solid-bg:var(--garn-badge-discovery-bold)] [--c-solid-fg:var(--garn-badge-discovery-bold-fg)] [--counter-ping:var(--garn-badge-discovery-bold)]",
      },
      appearance: {
        solid: "bg-[var(--c-solid-bg)] text-[var(--c-solid-fg)]",
        soft: "bg-[var(--c-soft-bg)] text-[var(--c-soft-fg)]",
      },
      size: {
        sm: "h-4 min-w-4 px-1 text-xs",
        md: "h-5 min-w-5 px-1.5 text-xs",
      },
      shape: {
        sharp: "rounded-xs",
        rounded: "rounded-md",
        pill: "rounded-full",
      },
    },
    defaultVariants: {
      tone: "neutral",
      appearance: "solid",
      size: "md",
      shape: "pill",
    },
  }
);

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

function CounterDigit({ digit }: { digit: number }) {
  return (
    <span
      data-slot="counter-digit"
      className="inline-block overflow-hidden"
      style={{ height: "1em" }}
    >
      <span
        className="flex flex-col transition-transform duration-[var(--garn-motion-fast)] ease-standard motion-reduce:transition-none"
        style={{ transform: `translateY(-${digit * 10}%)` }}
      >
        {DIGITS.map((n) => (
          <span key={n} className="block text-center leading-none">
            {n}
          </span>
        ))}
      </span>
    </span>
  );
}

function RollingNumber({ text }: { text: string }) {
  const chars = Array.from(text);
  const len = chars.length;
  return (
    <span
      data-slot="counter-value"
      aria-hidden="true"
      className="inline-flex items-center leading-none tabular-nums"
    >
      {chars.map((ch, i) => {
        const place = len - 1 - i;
        return ch >= "0" && ch <= "9" ? (
          <CounterDigit key={`d${place}`} digit={Number(ch)} />
        ) : (
          <span key={`s${place}`} className="inline-block">
            {ch}
          </span>
        );
      })}
    </span>
  );
}

export interface CounterProps
  extends Omit<React.ComponentProps<"span">, "color">,
    VariantProps<typeof counterVariants> {
  /** The count to display. `0` renders nothing unless `showZero`. */
  value: number;
  /**
   * Cap; counts above render `${max}+` (e.g. `99+`).
   * @default 99
   */
  max?: number;
  /**
   * Render a `0` instead of hiding the counter.
   * @default false
   */
  showZero?: boolean;
  /**
   * `"compact"` abbreviates large counts (`1.2K`) via Intl; `max` no longer applies.
   * @default "standard"
   */
  format?: "standard" | "compact";
  /** BCP-47 locale for number formatting (pass it for SSR determinism). */
  locale?: string;
  /**
   * Add a reduced-motion-safe "new activity" halo.
   * @default false
   */
  pulse?: boolean;
  /**
   * Announce changes to assistive tech via an aria-live region.
   * @default true
   */
  live?: boolean;
}

/**
 * A compact numeric indicator for counts, notifications, and totals — caps at
 * `max` (`99+`), rolls its digits on change, and announces the true count.
 *
 * Documentation: https://garn.ohuba.com/components/counter
 */
function Counter({
  value,
  max = 99,
  showZero = false,
  format = "standard",
  locale,
  tone = "neutral",
  appearance = "solid",
  size = "md",
  shape = "pill",
  pulse = false,
  live = true,
  className,
  ...rest
}: CounterProps) {
  if (value === 0 && !showZero) return null;

  const overflowed = format !== "compact" && value > max;
  const display = overflowed
    ? `${max}+`
    : new Intl.NumberFormat(
        locale,
        format === "compact"
          ? { notation: "compact", maximumFractionDigits: 1 }
          : undefined
      ).format(value);

  const trueLabel = new Intl.NumberFormat(locale).format(value);

  return (
    <span
      data-slot="counter"
      data-tone={tone ?? "neutral"}
      data-appearance={appearance ?? "solid"}
      data-size={size ?? "md"}
      data-shape={shape ?? "pill"}
      data-pulse={pulse || undefined}
      className={cn(counterVariants({ tone, appearance, size, shape }), className)}
      aria-live={live ? "polite" : undefined}
      aria-atomic={live ? "true" : undefined}
      {...rest}
    >
      {pulse ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 animate-ping rounded-full bg-[var(--counter-ping)] opacity-70 motion-reduce:hidden"
        />
      ) : null}
      <RollingNumber text={display} />
      <span data-slot="counter-label" className="sr-only">
        {trueLabel}
      </span>
    </span>
  );
}

export type IndicatorPosition =
  | "top-start"
  | "top-center"
  | "top-end"
  | "middle-start"
  | "middle-center"
  | "middle-end"
  | "bottom-start"
  | "bottom-center"
  | "bottom-end";

const indicatorDotVariants = cva("block rounded-full", {
  variants: {
    tone: {
      neutral: "bg-[var(--garn-badge-neutral-bold)]",
      brand: "bg-[var(--garn-badge-brand-bold)]",
      info: "bg-[var(--garn-badge-info-bold)]",
      success: "bg-[var(--garn-badge-success-bold)]",
      warning: "bg-[var(--garn-badge-warning-bold)]",
      danger: "bg-[var(--garn-badge-danger-bold)]",
      discovery: "bg-[var(--garn-badge-discovery-bold)]",
    },
    size: { sm: "size-2", md: "size-2.5" },
  },
  defaultVariants: { tone: "neutral", size: "md" },
});

export type CounterTone =
  | "neutral"
  | "brand"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "discovery";

function markPlacement(
  position: IndicatorPosition,
  overlap: "rectangular" | "circular",
  offset: number
): React.CSSProperties {
  const [v, h] = position.split("-") as [
    "top" | "middle" | "bottom",
    "start" | "center" | "end",
  ];
  const pull = overlap === "circular" ? "14%" : "0%";
  const s: Record<string, string> = {};

  if (v === "top") {
    s.insetBlockStart = pull;
    s["--mk-ty"] = "-50%";
    s["--mk-oy"] = `${offset}px`;
  } else if (v === "bottom") {
    s.insetBlockEnd = pull;
    s["--mk-ty"] = "50%";
    s["--mk-oy"] = `${-offset}px`;
  } else {
    s.insetBlockStart = "50%";
    s["--mk-ty"] = "-50%";
    s["--mk-oy"] = "0px";
  }

  if (h === "start") {
    s.insetInlineStart = pull;
    s["--mk-tx"] = "-50%";
    s["--mk-ox"] = `${offset}px`;
  } else if (h === "end") {
    s.insetInlineEnd = pull;
    s["--mk-tx"] = "50%";
    s["--mk-ox"] = `${-offset}px`;
  } else {
    s.insetInlineStart = "50%";
    s["--mk-tx"] = "-50%";
    s["--mk-ox"] = "0px";
  }

  s.translate =
    "calc(var(--mk-dir, 1) * (var(--mk-tx) + var(--mk-ox))) calc(var(--mk-ty) + var(--mk-oy))";
  return s as React.CSSProperties;
}

export interface CounterIndicatorProps
  extends Omit<React.ComponentProps<"span">, "color"> {
  /** The target the marker is anchored onto. */
  children: React.ReactNode;
  /** Show a count marker (a composed Counter). Hidden at 0 unless `showZero`. */
  count?: number;
  /**
   * Show a bare presence dot instead of a number.
   * @default false
   */
  dot?: boolean;
  /**
   * Tone of the marker (shared with Counter).
   * @default "neutral"
   */
  tone?: CounterTone;
  /**
   * Marker size (shared with Counter).
   * @default "md"
   */
  size?: "sm" | "md";
  /**
   * Count-marker appearance.
   * @default "solid"
   */
  appearance?: "solid" | "soft";
  /**
   * Count-marker shape.
   * @default "pill"
   */
  shape?: "sharp" | "rounded" | "pill";
  /**
   * Forwarded to the count marker.
   * @default 99
   */
  max?: number;
  /**
   * Render a `0` count instead of hiding the marker.
   * @default false
   */
  showZero?: boolean;
  /**
   * Forwarded to the count marker.
   * @default "standard"
   */
  format?: "standard" | "compact";
  /** Forwarded to the count marker (SSR-deterministic formatting). */
  locale?: string;
  /**
   * Announce count changes via the count marker's live region.
   * @default true
   */
  live?: boolean;
  /**
   * Corner to anchor the marker on (logical / RTL-safe).
   * @default "top-end"
   */
  position?: IndicatorPosition;
  /**
   * Inset the marker inward for a round target (an avatar).
   * @default "rectangular"
   */
  overlap?: "rectangular" | "circular";
  /**
   * Nudge the marker inward by N px (fine-tuning against the target's radius).
   * @default 0
   */
  offset?: number;
  /**
   * A ring in the surface color so the marker separates from the target.
   * @default true
   */
  withBorder?: boolean;
  /**
   * A reduced-motion-safe "new activity" halo on the marker.
   * @default false
   */
  pulse?: boolean;
  /**
   * Hide the marker while keeping the child in place.
   * @default false
   */
  invisible?: boolean;
}

/** Anchors a count marker or presence dot onto its child's corner (badge-style), positioned via `position` / `overlap` / `offset`. */
function CounterIndicator({
  children,
  count,
  dot = false,
  tone = "neutral",
  size = "md",
  appearance = "solid",
  shape = "pill",
  max = 99,
  showZero = false,
  format = "standard",
  locale,
  live = true,
  position = "top-end",
  overlap = "rectangular",
  offset = 0,
  withBorder = true,
  pulse = false,
  invisible = false,
  className,
  ...rest
}: CounterIndicatorProps) {
  const countHidden = count != null && count === 0 && !showZero;
  const showMarker = !invisible && (dot || (count != null && !countHidden));

  const ring = withBorder ? "ring-2 ring-background" : undefined;

  const marker = dot ? (
    <span data-slot="counter-dot" aria-hidden="true" className="relative inline-flex">
      {pulse ? (
        <span
          aria-hidden="true"
          className={cn(
            indicatorDotVariants({ tone, size }),
            "absolute inset-0 animate-ping opacity-70 motion-reduce:hidden"
          )}
        />
      ) : null}
      <span
        className={cn(indicatorDotVariants({ tone, size }), "relative", ring)}
      />
    </span>
  ) : count != null ? (
    <Counter
      value={count}
      max={max}
      showZero={showZero}
      format={format}
      locale={locale}
      tone={tone}
      appearance={appearance}
      size={size}
      shape={shape}
      pulse={pulse}
      live={live}
      className={ring}
    />
  ) : null;

  return (
    <span
      data-slot="counter-indicator"
      data-position={position}
      data-overlap={overlap}
      className={cn("relative inline-flex w-fit", className)}
      {...rest}
    >
      {children}
      {showMarker ? (
        <span
          data-slot="counter-indicator-mark"
          className="pointer-events-none absolute z-10 [--mk-dir:1] rtl:[--mk-dir:-1]"
          style={markPlacement(position, overlap, offset)}
        >
          {marker}
        </span>
      ) : null}
    </span>
  );
}

type CounterComponent = typeof Counter & {
  Indicator: typeof CounterIndicator;
};

const CounterRoot = Counter as CounterComponent;
CounterRoot.Indicator = CounterIndicator;

export {
  CounterRoot as Counter,
  CounterIndicator,
  counterVariants,
  indicatorDotVariants,
};
