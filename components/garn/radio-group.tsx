"use client";

import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { cva, type VariantProps } from "class-variance-authority";
import { Circle } from "lucide-react";

import { cn } from "@/lib/utils";

// The circle is identity (a drawn shape + hit target): fixed --garn-box-*
// geometry, sized only by `size`, never by density.
const radioItemVariants = cva(
  "aspect-square rounded-full border border-brand text-brand shadow focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:border-danger aria-invalid:focus-visible:ring-danger disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      size: {
        sm: "size-[var(--garn-box-sm)] [&_svg]:size-2",
        md: "size-[var(--garn-box-md)] [&_svg]:size-2.5",
        lg: "size-[var(--garn-box-lg)] [&_svg]:size-3",
      },
    },
    defaultVariants: { size: "md" },
  }
);

type RadioSize = VariantProps<typeof radioItemVariants>["size"];

// Size set on the group propagates to every item (override per item if needed).
const RadioGroupContext = React.createContext<{ size?: RadioSize }>({});

export interface RadioGroupProps
  extends Omit<React.ComponentProps<typeof RadioGroupPrimitive.Root>, "size">,
    VariantProps<typeof radioItemVariants> {}

/**
 * A set of mutually exclusive radio options where exactly one may be selected.
 *
 * Documentation: https://garn.ohuba.com/components/radio-group
 */
function RadioGroup({ className, size, ...props }: RadioGroupProps) {
  return (
    <RadioGroupContext.Provider value={{ size }}>
      <RadioGroupPrimitive.Root
        className={cn("grid gap-2", className)}
        data-slot="radio-group"
        data-size={size ?? "md"}
        {...props}
      />
    </RadioGroupContext.Provider>
  );
}

/** A single selectable option within a `RadioGroup`; inherits the group's `size`. */
function RadioGroupItem({
  className,
  size,
  ...props
}: Omit<React.ComponentProps<typeof RadioGroupPrimitive.Item>, "size"> &
  VariantProps<typeof radioItemVariants>) {
  const ctx = React.useContext(RadioGroupContext);
  return (
    <RadioGroupPrimitive.Item
      className={cn(radioItemVariants({ size: ctx.size ?? size, className }))}
      data-slot="radio-group-item"
      data-size={ctx.size ?? size ?? "md"}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <Circle className="fill-brand text-brand" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem, radioItemVariants };
