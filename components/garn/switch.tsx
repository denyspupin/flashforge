"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircleIcon } from "lucide-react";

import { cn } from "@/lib/utils";

// --sh = fixed box geometry (identity, not density); size sets it, tone recolors the ON track.
const switchVariants = cva(
  "peer relative isolate inline-flex h-[var(--sh)] w-[calc(var(--sh)*2)] shrink-0 cursor-pointer items-center rounded-full border transition-colors data-[state=checked]:shadow-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=unchecked]:border-input data-[state=unchecked]:bg-[color-mix(in_srgb,var(--garn-muted),var(--garn-background)_50%)] data-[state=unchecked]:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 data-[loading]:disabled:opacity-100 data-[state=checked]:forced-colors:bg-[Highlight] data-[state=checked]:forced-colors:text-[HighlightText]",
  {
    variants: {
      size: {
        sm: "[--sh:var(--garn-box-sm)]",
        md: "[--sh:var(--garn-box-md)]",
        lg: "[--sh:var(--garn-box-lg)]",
      },
      tone: {
        neutral:
          "data-[state=checked]:border-[color-mix(in_srgb,var(--garn-neutral-solid),black_18%)] data-[state=checked]:bg-neutral-solid data-[state=checked]:text-neutral-solid-foreground",
        brand:
          "data-[state=checked]:border-brand-strong data-[state=checked]:bg-brand-solid data-[state=checked]:text-brand-solid-foreground",
        success:
          "data-[state=checked]:border-[color-mix(in_srgb,var(--garn-success-solid),black_18%)] data-[state=checked]:bg-success-solid data-[state=checked]:text-success-solid-foreground",
        warning:
          "data-[state=checked]:border-[color-mix(in_srgb,var(--garn-warning-solid),black_18%)] data-[state=checked]:bg-warning-solid data-[state=checked]:text-warning-solid-foreground",
        danger:
          "data-[state=checked]:border-[color-mix(in_srgb,var(--garn-danger-solid),black_18%)] data-[state=checked]:bg-danger-solid data-[state=checked]:text-danger-solid-foreground",
      },
    },
    defaultVariants: { size: "md", tone: "brand" },
  },
);

// The content well is decorative — state is already announced by role=switch + aria-checked — so it stays aria-hidden.
const CONTENT_WELL =
  "pointer-events-none absolute inset-y-0 flex w-[calc(var(--sh)_-_3px)] items-center justify-center text-xs leading-none opacity-0 transition-opacity [&_svg]:size-[calc(var(--sh)_-_6px)]";

export interface SwitchProps
  extends
    Omit<React.ComponentProps<typeof SwitchPrimitive.Root>, "size" | "children">,
    VariantProps<typeof switchVariants> {
  /**
   * Shows a spinner in the thumb and blocks interaction (sets `disabled` +
   * `aria-busy`) — for a toggle whose effect resolves asynchronously.
   * @default false
   */
  loading?: boolean;
  /** Icon or 1–2 chars shown in the track well while ON (the vacated inline-start side). */
  checkedContent?: React.ReactNode;
  /** Icon or 1–2 chars shown in the track well while OFF (the vacated inline-end side). */
  uncheckedContent?: React.ReactNode;
}

/**
 * A two-state toggle that applies its effect immediately — renders a `role="switch"` button with a sliding thumb.
 *
 * Documentation: https://garn.ohuba.com/components/switch
 */
function Switch({
  className,
  size,
  tone,
  loading = false,
  checkedContent,
  uncheckedContent,
  disabled,
  "aria-busy": ariaBusy,
  ...props
}: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      className={cn(switchVariants({ size, tone, className }))}
      data-slot="switch"
      data-size={size ?? "md"}
      data-tone={tone ?? "brand"}
      disabled={disabled || loading}
      {...props}
      // loading attrs after spread so a consumer prop can't desync pending state from aria-busy.
      data-loading={loading || undefined}
      aria-busy={loading || ariaBusy || undefined}
    >
      {uncheckedContent != null && (
        <span
          aria-hidden="true"
          className={cn(CONTENT_WELL, "end-0 [[data-state=unchecked]_&]:opacity-100")}
        >
          {uncheckedContent}
        </span>
      )}
      {checkedContent != null && (
        <span
          aria-hidden="true"
          className={cn(CONTENT_WELL, "start-0 [[data-state=checked]_&]:opacity-100")}
        >
          {checkedContent}
        </span>
      )}
      <SwitchPrimitive.Thumb
        className={cn(
          // Thumb travel mirrors under dir=rtl via [[dir=rtl]_&]: overrides (plain rtl: loses specificity).
          // In forced-colors the thumb fill collapses to Canvas — the CanvasText border keeps it visible on either track.
          "pointer-events-none z-10 flex h-[calc(var(--sh)_-_4px)] w-[calc(var(--sh)_-_1px)] items-center justify-center rounded-full shadow-lg ring-0 forced-colors:border forced-colors:border-[CanvasText] transition-transform ease-[var(--garn-ease-out-back)] data-[state=checked]:translate-x-[calc(var(--sh)_-_2px)] data-[state=unchecked]:translate-x-px [[dir=rtl]_&]:data-[state=checked]:-translate-x-[calc(var(--sh)_-_2px)] [[dir=rtl]_&]:data-[state=unchecked]:-translate-x-px data-[state=checked]:bg-background data-[state=checked]:text-foreground data-[state=unchecked]:bg-[color-mix(in_srgb,var(--garn-foreground),var(--garn-background)_14%)] data-[state=unchecked]:text-background",
        )}
      >
        {loading && (
          <LoaderCircleIcon
            aria-hidden="true"
            className="size-[calc(var(--sh)_-_7px)] animate-spin [animation-duration:var(--garn-motion-spin)]"
          />
        )}
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  );
}

export { Switch, switchVariants };
