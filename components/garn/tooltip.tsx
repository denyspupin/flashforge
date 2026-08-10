"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

/** Shares one hover open/close delay across the tooltips it wraps; place once near the app root. */
const TooltipProvider = TooltipPrimitive.Provider;

/**
 * A small label revealed on hover / focus of its trigger — for a brief text hint,
 * never for interactive or essential content.
 *
 * Documentation: https://garn.ohuba.com/components/tooltip
 */
const Tooltip = TooltipPrimitive.Root;

/** The element the tooltip describes; reveals it on hover / focus. */
function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return (
    <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
  );
}

/** The floating label surface, portalled and positioned against the trigger. */
function TooltipContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-fit rounded-md bg-brand-solid px-3 py-1.5 text-xs text-brand-solid-foreground shadow-md data-[state=delayed-open]:animate-fade-in data-[state=instant-open]:animate-fade-in data-[state=closed]:animate-fade-out",
          className
        )}
        data-slot="tooltip-content"
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
