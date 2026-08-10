"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Label } from "@/components/garn/label";

const fieldVariants = cva(
  "flex gap-[var(--garn-gap-field)]",
  {
    variants: {
      appearance: {
        plain: "",
        card: "rounded-xl border bg-card p-[var(--garn-pad-panel)] shadow-sm transition-colors has-[[data-state=checked]]:border-brand",
      },
      orientation: {
        start: "flex-row items-start",
        end: "flex-row-reverse items-start justify-between",
      },
    },
    defaultVariants: { appearance: "plain", orientation: "start" },
  },
);

export interface FieldProps
  extends
    Omit<React.ComponentProps<"div">, "children">,
    VariantProps<typeof fieldVariants> {
  /** The setting name — becomes the control's accessible name via `htmlFor`. */
  label: React.ReactNode;
  /** Optional one-line explanation, wired to the control via `aria-describedby`. */
  description?: React.ReactNode;
  /** Label text size — pair with the control's own `size`. */
  size?: React.ComponentProps<typeof Label>["size"];
  /** The control: a Switch, Checkbox, or single RadioGroupItem. */
  children: React.ReactElement;
}

/**
 * Pairs a boolean or choice control (Switch, Checkbox, a single RadioGroupItem) with its label and description, wiring both relationships so any control drops in identically.
 *
 * Documentation: https://garn.ohuba.com/components/field
 */
function Field({
  className,
  appearance,
  orientation,
  label,
  description,
  size,
  id: idProp,
  children,
  ...props
}: FieldProps) {
  const generatedId = React.useId();
  const id = idProp ?? generatedId;
  const descriptionId = description ? `${id}-description` : undefined;

  // Central wiring: the control owns the id (so the Label's htmlFor lands on it)
  // and points at the description — preserving any aria-describedby it already had.
  const controlProps = children.props as {
    id?: string;
    "aria-describedby"?: string;
  };
  const control = React.cloneElement(children, {
    id,
    "aria-describedby":
      cn(controlProps["aria-describedby"], descriptionId) || undefined,
  } as Partial<typeof controlProps>);

  return (
    <div
      className={cn(fieldVariants({ appearance, orientation }), className)}
      data-slot="field"
      data-appearance={appearance ?? "plain"}
      data-orientation={orientation ?? "start"}
      {...props}
    >
      {control}
      <div className="flex min-w-0 flex-1 flex-col gap-[var(--garn-gap-field)]">
        <Label htmlFor={id} size={size}>
          {label}
        </Label>
        {description != null && (
          <p
            id={descriptionId}
            className="text-sm leading-snug text-muted-foreground"
          >
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

export { Field, fieldVariants };
