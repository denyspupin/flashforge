"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { type VariantProps } from "class-variance-authority";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { fieldVariants } from "@/lib/field-variants";

/**
 * A listbox for choosing one option from a set, opening into a floating panel.
 *
 * Documentation: https://garn.ohuba.com/components/select
 */
const Select = SelectPrimitive.Root;
/** Groups related options under a shared `SelectLabel`. */
const SelectGroup = SelectPrimitive.Group;

// `Select` owns the value/open state (SelectProps); the `size` variant lives on
// the trigger (SelectTriggerProps).
export interface SelectProps
  extends React.ComponentProps<typeof SelectPrimitive.Root> {}

/** Displays the selected option's label in the trigger, or the placeholder when empty. */
function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

// The trigger IS a field surface — it consumes the shared `fieldVariants` so a
// Select lines up with Input on the same grid and can't drift (aria-invalid gets
// the danger edge + ring too); Select adds only its own layout here.
export interface SelectTriggerProps
  extends Omit<React.ComponentProps<typeof SelectPrimitive.Trigger>, "size">,
    VariantProps<typeof fieldVariants> {}

/** The button that opens the listbox; shows the current value and a chevron. */
function SelectTrigger({
  className,
  children,
  size,
  appearance,
  ...props
}: SelectTriggerProps) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        fieldVariants({ appearance, size }),
        "justify-between whitespace-nowrap [&>span]:line-clamp-1 [&_svg]:shrink-0",
        className
      )}
      data-slot="select-trigger"
      data-size={size ?? "md"}
      data-appearance={appearance ?? "outline"}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

/** Scrolls the option list up when it overflows the viewport. */
function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      data-slot="select-scroll-up-button"
      {...props}
    >
      <ChevronUp className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  );
}

/** Scrolls the option list down when it overflows the viewport. */
function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      data-slot="select-scroll-down-button"
      {...props}
    >
      <ChevronDown className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  );
}

/** The floating panel holding the options; portalled and positioned over the trigger. */
function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={cn(
          "relative z-50 max-h-96 min-w-32 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        data-slot="select-content"
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

/** A heading for a `SelectGroup` of options. */
function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      className={cn("px-2 py-1.5 text-sm font-semibold", className)}
      data-slot="select-label"
      {...props}
    />
  );
}

/** A selectable option row with a check when chosen. */
function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex min-h-[var(--garn-row-h)] w-full cursor-default select-none items-center rounded-xs pl-2 pr-8 text-sm outline-hidden transition-colors focus:bg-state-hover focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      data-slot="select-item"
      {...props}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

/** A divider between groups of options. */
function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      className={cn("-mx-1 my-1 h-px bg-muted", className)}
      data-slot="select-separator"
      {...props}
    />
  );
}

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
