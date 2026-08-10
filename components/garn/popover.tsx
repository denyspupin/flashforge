"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "@/lib/utils";
import { frameFill, frameSurface, solidSurface } from "@/lib/frame";

/**
 * A floating panel anchored to a trigger — for rich, interactive content
 * (forms, pickers) that a tooltip can't hold.
 *
 * Documentation: https://garn.ohuba.com/components/popover
 */
const Popover = PopoverPrimitive.Root;

/** The control that toggles the popover. */
function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return (
    <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
  );
}

/** An alternate positioning anchor, when the panel should point at an element other than the trigger. */
function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return (
    <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />
  );
}

/** The floating panel surface, portalled and positioned against the anchor. */
function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  forceMount,
  appearance = "solid",
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & {
  /**
   * Surface treatment. `solid` (default) is an opaque raised panel — the right
   * look for an anchored popup over unscrimmed page content. `glass` is the
   * frosted framed surface; opt into it only when the panel sits over a dimmed
   * backdrop that gives the frost something to read against.
   */
  appearance?: "solid" | "glass";
}) {
  return (
    // `forceMount` must reach BOTH the Portal and the Content (Radix requirement)
    // so a consumer can keep the content in the DOM while closed — e.g. a listbox
    // referenced by an always-present `aria-controls`.
    <PopoverPrimitive.Portal forceMount={forceMount}>
      <PopoverPrimitive.Content
        forceMount={forceMount}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          appearance === "glass" ? cn(frameSurface, frameFill) : solidSurface,
          "relative z-50 w-72 rounded-md p-[var(--garn-pad-panel)] text-popover-foreground outline-hidden data-[state=open]:animate-enter data-[state=closed]:animate-exit",
          // A force-mounted popover is inert BY CONSTRUCTION while closed —
          // without this its exit-animated (opacity-0, fill:both) box would stay
          // hit-testable and in the a11y tree, silently eating clicks.
          forceMount && "data-[state=closed]:hidden",
          className
        )}
        data-slot="popover-content"
        data-appearance={appearance}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
