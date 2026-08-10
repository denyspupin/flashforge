"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

// The box is identity (a drawn shape + hit target), so it reads the fixed
// --garn-box-* geometry — density never resizes it; only `size` does (md → 16px).
const checkboxVariants = cva(
  "peer shrink-0 rounded-[var(--garn-box-radius)] border border-brand shadow focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:border-danger aria-invalid:focus-visible:ring-danger disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-brand-solid data-[state=checked]:text-brand-solid-foreground data-[state=checked]:forced-colors:bg-[Highlight] data-[state=checked]:forced-colors:text-[HighlightText]",
  {
    variants: {
      size: {
        sm: "size-[var(--garn-box-sm)] [&_svg]:size-3",
        md: "size-[var(--garn-box-md)] [&_svg]:size-3.5",
        lg: "size-[var(--garn-box-lg)] [&_svg]:size-4",
      },
    },
    defaultVariants: { size: "md" },
  }
);

export interface CheckboxProps
  extends Omit<React.ComponentProps<typeof CheckboxPrimitive.Root>, "size">,
    VariantProps<typeof checkboxVariants> {}

/**
 * A single toggleable box for boolean or indeterminate (mixed) state — renders a `role="checkbox"` control.
 *
 * Documentation: https://garn.ohuba.com/components/checkbox
 */
function Checkbox({ className, size, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      className={cn(checkboxVariants({ size, className }))}
      data-slot="checkbox"
      data-size={size ?? "md"}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className={cn("flex items-center justify-center text-current")}
      >
        {/* One Indicator serves both states; the ancestor-state selectors pick
            the glyph — a check when checked, a dash when indeterminate. */}
        <Check className="hidden [[data-state=checked]_&]:block" />
        <Minus className="hidden [[data-state=indeterminate]_&]:block" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox, checkboxVariants };
