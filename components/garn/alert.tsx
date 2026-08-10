import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Icon color is set per-tone (not in the base) so the status tones win without
// depending on Tailwind class ordering. Each status tone pairs a -subtle fill, a
// -foreground text, and the solid tone for the icon.
const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg~*]:pl-7",
  {
    variants: {
      tone: {
        neutral: "bg-background text-foreground [&>svg]:text-foreground",
        info: "border-info/30 bg-info-subtle text-info-foreground [&>svg]:text-info",
        success:
          "border-success/30 bg-success-subtle text-success-foreground [&>svg]:text-success",
        warning:
          "border-warning/40 bg-warning-subtle text-warning-foreground [&>svg]:text-warning",
        danger:
          "border-danger/30 bg-danger-subtle text-danger-foreground [&>svg]:text-danger",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  }
);

export type AlertProps = React.ComponentProps<"div"> &
  VariantProps<typeof alertVariants>;

/**
 * A prominent, inline status message — renders `role="alert"` across the status
 * tones. For transient, stacked notifications use a toast (`Sonner`) instead.
 *
 * Documentation: https://garn.ohuba.com/components/alert
 */
function Alert({ className, tone, ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(alertVariants({ tone }), className)}
      data-slot="alert"
      data-tone={tone ?? "neutral"}
      {...props}
    />
  );
}

/** The alert's short heading line. */
function AlertTitle({ className, ...props }: React.ComponentProps<"h5">) {
  return (
    <h5
      className={cn("mb-1 font-medium leading-none tracking-tight", className)}
      data-slot="alert-title"
      {...props}
    />
  );
}

/** The alert's body text, beneath the title. */
function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("text-sm [&_p]:leading-relaxed", className)}
      data-slot="alert-description"
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
