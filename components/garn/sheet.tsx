"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A panel that slides in from a screen edge — a `Dialog` shaped as an edge sheet,
 * for secondary tasks or navigation that shouldn't take over the whole screen.
 *
 * Documentation: https://garn.ohuba.com/components/sheet
 */
const Sheet = SheetPrimitive.Root;

/** Portals the overlay + content out to the document body. */
const SheetPortal = SheetPrimitive.Portal;

// Public prop types. `Sheet` owns the open state (see SheetProps); the `side` variant lives on
// the content (SheetContentProps).
export interface SheetProps
  extends React.ComponentProps<typeof SheetPrimitive.Root> {}

/** The control that opens the sheet. */
function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return (
    <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
  );
}

/** A control that closes the sheet (e.g. a Cancel button). */
function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return (
    <SheetPrimitive.Close data-slot="sheet-close" {...props} />
  );
}

/** The dimming backdrop behind the panel. */
function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-overlay transition-opacity duration-[var(--garn-motion-base)] data-[state=closed]:opacity-0 data-[state=open]:opacity-100",
        className
      )}
      data-slot="sheet-overlay"
      {...props}
    />
  );
}

const sheetVariants = cva(
  "fixed z-50 gap-[var(--garn-gap-stack)] bg-background p-[var(--garn-pad-surface)] shadow-lg transition ease-in-out data-[state=open]:duration-[var(--garn-motion-base)] data-[state=closed]:duration-[var(--garn-motion-base)]",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:-translate-y-full",
        bottom:
          "inset-x-0 bottom-0 border-t data-[state=closed]:translate-y-full",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:-translate-x-full sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:translate-x-full sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
);

export interface SheetContentProps
  extends React.ComponentProps<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

/** The edge panel — carries the `side` variant, portals its overlay, and includes a built-in close X. */
function SheetContent({
  side = "right",
  className,
  children,
  ...props
}: SheetContentProps) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        className={cn(sheetVariants({ side }), className)}
        data-slot="sheet-content"
        data-side={side ?? "right"}
        {...props}
      >
        {children}
        <SheetPrimitive.Close className="absolute right-3 top-3 inline-flex size-[var(--garn-control-h-xs)] items-center justify-center rounded-sm text-muted-foreground opacity-80 ring-offset-background transition-[color,background-color,opacity] hover:bg-state-hover hover:text-accent-foreground hover:opacity-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

/** Groups the title + description at the top of the panel. */
function SheetHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col gap-[var(--garn-gap-field)] text-center sm:text-left",
        className
      )}
      data-slot="sheet-header"
      {...props}
    />
  );
}

/** Groups the actions at the bottom of the panel (right-aligned on ≥sm). */
function SheetFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
        className
      )}
      data-slot="sheet-footer"
      {...props}
    />
  );
}

/** The panel's accessible title — required so the sheet has an accessible name. */
function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      className={cn("text-lg font-semibold text-foreground", className)}
      data-slot="sheet-title"
      {...props}
    />
  );
}

/** Supporting text under the title, wired as the sheet's accessible description. */
function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      className={cn("text-sm text-muted-foreground", className)}
      data-slot="sheet-description"
      {...props}
    />
  );
}

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
