"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Text size matches the form-control sizes so a label pairs with its field.
const labelVariants = cva(
  "font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
  {
    variants: {
      size: {
        sm: "text-xs",
        md: "text-sm",
        lg: "text-base",
      },
    },
    defaultVariants: { size: "md" },
  }
);

export interface LabelProps
  extends React.ComponentProps<typeof LabelPrimitive.Root>,
    VariantProps<typeof labelVariants> {}

/**
 * An accessible caption for a form control — click-to-focus, and dims with its disabled peer.
 *
 * Documentation: https://garn.ohuba.com/components/label
 */
function Label({ className, size, ...props }: LabelProps) {
  return (
    <LabelPrimitive.Root
      className={cn(labelVariants({ size, className }))}
      data-slot="label"
      data-size={size ?? "md"}
      {...props}
    />
  );
}

export { Label, labelVariants };
