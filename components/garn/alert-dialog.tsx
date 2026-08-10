"use client";

import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";

import { cn } from "@/lib/utils";
import { frameFill, frameSurface } from "@/lib/frame";
import { buttonVariants } from "@/components/garn/button";

/**
 * A modal confirmation for a consequential choice — like `Dialog` but focus
 * starts on an action and it can only be dismissed by choosing (no click-outside
 * or Esc-to-cancel by default).
 *
 * Documentation: https://garn.ohuba.com/components/alert-dialog
 */
const AlertDialog = AlertDialogPrimitive.Root;

/** The control that opens the alert dialog. */
function AlertDialogTrigger({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
  );
}

/** Portals the overlay + content out to the document body. */
const AlertDialogPortal = AlertDialogPrimitive.Portal;

/** The dimming backdrop behind the content. */
function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-overlay transition-opacity duration-[var(--garn-motion-fast)] data-[state=closed]:opacity-0 data-[state=open]:opacity-100",
        className
      )}
      data-slot="alert-dialog-overlay"
      {...props}
    />
  );
}

/** The alert-dialog surface — portalled over the overlay; no built-in close button. */
function AlertDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        className={cn(
          frameSurface,
          frameFill,
          // Over the dim overlay, keep the frosted strip light (not muddy).
          "[--garn-frame-strip-alpha:75%]",
          "fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-[var(--garn-gap-stack)] p-[var(--garn-pad-surface)] duration-[var(--garn-motion-fast)] transition-all data-[state=closed]:scale-95 data-[state=closed]:opacity-0 data-[state=open]:scale-100 data-[state=open]:opacity-100 sm:rounded-lg",
          className
        )}
        data-slot="alert-dialog-content"
        {...props}
      />
    </AlertDialogPortal>
  );
}

/** Groups the title + description at the top of the content. */
function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col gap-[var(--garn-gap-field)] text-center sm:text-left",
        className
      )}
      data-slot="alert-dialog-header"
      {...props}
    />
  );
}

/** Groups the cancel + action buttons at the bottom of the content. */
function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
        className
      )}
      data-slot="alert-dialog-footer"
      {...props}
    />
  );
}

/** The alert dialog's accessible title — states the decision being confirmed. */
function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      className={cn("text-lg font-semibold", className)}
      data-slot="alert-dialog-title"
      {...props}
    />
  );
}

/** Supporting text under the title, wired as the accessible description. */
function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      className={cn("text-sm text-muted-foreground", className)}
      data-slot="alert-dialog-description"
      {...props}
    />
  );
}

/** The confirming button — styled as a brand Button; closes the dialog on select. */
function AlertDialogAction({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action>) {
  return (
    <AlertDialogPrimitive.Action
      className={cn(buttonVariants({ tone: "brand" }), className)}
      data-slot="alert-dialog-action"
      {...props}
    />
  );
}

/** The dismissing button — styled as an outline Button; receives initial focus. */
function AlertDialogCancel({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return (
    <AlertDialogPrimitive.Cancel
      className={cn(buttonVariants({ variant: "outline" }), className)}
      data-slot="alert-dialog-cancel"
      {...props}
    />
  );
}

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
