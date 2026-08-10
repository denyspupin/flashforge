"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * The toast host — mount it once near the app root, then raise notifications with
 * the `toast()` function. Wraps the `sonner` toaster with garn's theming.
 *
 * Documentation: https://garn.ohuba.com/components/sonner
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-brand-solid group-[.toast]:text-brand-solid-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      data-slot="toaster"
      {...props}
    />
  );
};

export { Toaster };
/** Imperatively raise a toast (success / error / promise / custom) from anywhere. */
export { toast } from "sonner";
export type { ToasterProps } from "sonner";
