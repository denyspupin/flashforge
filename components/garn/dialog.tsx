"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { frameFill, frameSurface } from "@/lib/frame";

/**
 * A modal dialog — focus-trapped content over a dimming overlay, for a focused
 * task or confirmation that interrupts the page.
 *
 * Documentation: https://garn.ohuba.com/components/dialog
 */
const Dialog = DialogPrimitive.Root;

/** The control that opens the dialog. */
function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

/** Portals the overlay + content out to the document body. */
const DialogPortal = DialogPrimitive.Portal;

/** A control that closes the nearest dialog. */
function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

/** The dimming backdrop behind the content. */
function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-overlay transition-opacity duration-[var(--garn-motion-fast)] data-[state=closed]:opacity-0 data-[state=open]:opacity-100",
        className
      )}
      data-slot="dialog-overlay"
      {...props}
    />
  );
}

/** The dialog surface — portalled over the overlay, with a built-in close button. */
function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          frameSurface,
          frameFill,
          // Over the dim overlay, keep the frosted strip light (not muddy).
          "[--garn-frame-strip-alpha:75%]",
          "fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-[var(--garn-gap-stack)] p-[var(--garn-pad-surface)] duration-[var(--garn-motion-fast)] sm:rounded-lg",
          "transition-all data-[state=closed]:scale-95 data-[state=closed]:opacity-0 data-[state=open]:scale-100 data-[state=open]:opacity-100",
          className
        )}
        data-slot="dialog-content"
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-3 top-3 inline-flex size-[var(--garn-control-h-xs)] items-center justify-center rounded-sm text-muted-foreground opacity-80 ring-offset-background transition-[color,background-color,opacity] hover:bg-state-hover hover:text-accent-foreground hover:opacity-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

/** Groups the title + description at the top of the content. */
function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col gap-[var(--garn-gap-field)] text-center sm:text-left",
        className
      )}
      data-slot="dialog-header"
      {...props}
    />
  );
}

/** Groups the actions at the bottom of the content (stacks on narrow widths). */
function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
        className
      )}
      data-slot="dialog-footer"
      {...props}
    />
  );
}

/** The dialog's accessible title — required so the surface has an accessible name. */
function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn(
        "text-lg font-semibold leading-none tracking-tight",
        className
      )}
      data-slot="dialog-title"
      {...props}
    />
  );
}

/** Supporting text under the title, wired as the dialog's accessible description. */
function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-sm text-muted-foreground", className)}
      data-slot="dialog-description"
      {...props}
    />
  );
}

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
