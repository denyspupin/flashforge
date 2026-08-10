import * as React from "react";
import { LoaderCircleIcon } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// A spinner is a drawn glyph, so its size is IDENTITY — fixed by the `size`
// prop and density-immune (it never scales with [data-density]). The scale
// mirrors the button icon ramp (14·16·20·24·32) so a spinner drops into a
// control cleanly; inside a Button the button's own `[&_svg]` size wins.
const spinnerVariants = cva("shrink-0 animate-spin", {
  variants: {
    size: {
      xs: "size-3.5", // 14px
      sm: "size-4", // 16px
      md: "size-5", // 20px
      lg: "size-6", // 24px
      xl: "size-8", // 32px
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export type SpinnerProps = Omit<
  React.ComponentProps<typeof LoaderCircleIcon>,
  "size"
> &
  VariantProps<typeof spinnerVariants>;

/**
 * An indeterminate loading indicator — a spinning glyph with a built-in
 * `role="status"` and a default "Loading" accessible name (override via `aria-label`).
 *
 * Documentation: https://garn.ohuba.com/components/spinner
 */
function Spinner({
  className,
  size,
  "aria-label": ariaLabel = "Loading",
  ...props
}: SpinnerProps) {
  return (
    <LoaderCircleIcon
      role="status"
      aria-label={ariaLabel}
      className={cn(spinnerVariants({ size }), className)}
      data-slot="spinner"
      data-size={size ?? "md"}
      {...props}
    />
  );
}

export { Spinner, spinnerVariants };
