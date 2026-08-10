"use client";

import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { CircleAlertIcon, EyeIcon, EyeOffIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { fieldVariants } from "@/lib/field-variants";
import {
  AFFORDANCE_BTN,
  FieldSurface,
  NAKED_INPUT,
} from "@/lib/field-surface";
import { Spinner } from "@/components/garn/spinner";

// Two render paths share one control-surface look (lib/field-variants.ts +
// lib/field-surface.tsx, so Input/Select/Textarea can't drift):
//   • BARE — no slots/affordances: a plain <input data-slot="input">, with
//     className/ref/native props all hitting the input (backward-compatible fast path).
//   • WRAPPED — enriched (leading/trailing, clearable, revealable, loading, or
//     aria-invalid): a focus-within wrapper becomes the visible surface; className
//     styles the wrapper, ref + native props still target the inner <input>.
// The trailing zone arbitrates its affordances by priority (error · reveal · clear ·
// spinner) SEPARATELY from the custom `trailing` slot, so a feature never clobbers a
// slot; the `trailing` slot renders outermost, so an edge-pinned control (e.g.
// NumberField's stepper) always sits last, transient affordances to its inner side.

type InputSize = "xs" | "sm" | "md" | "lg" | "xl";

// Spinner glyph matched to the field's icon size per rung (xs/sm→14, md→16, lg/xl→20).
const SPINNER_SIZE: Record<InputSize, "xs" | "sm" | "md"> = {
  xs: "xs",
  sm: "xs",
  md: "sm",
  lg: "md",
  xl: "md",
};

export interface InputProps
  extends Omit<React.ComponentProps<"input">, "size">,
    VariantProps<typeof fieldVariants> {
  /** Decorative or interactive content rendered inside the field, before the text. */
  leading?: React.ReactNode;
  /** Decorative or interactive content rendered inside the field, at the trailing edge (after the built-in affordances). */
  trailing?: React.ReactNode;
  /**
   * Show a clear button when the field is non-empty; Escape also clears.
   * @default false
   */
  clearable?: boolean;
  /**
   * Accessible name for the clear button.
   * @default "Clear"
   */
  clearLabel?: string;
  /** Fires after the field is cleared (button or Escape). */
  onClear?: () => void;
  /**
   * For a password field, render a show/hide toggle that swaps the input type.
   * @default false
   */
  revealable?: boolean;
  /** Controlled reveal state (pair with `onRevealedChange`); omit for uncontrolled. */
  revealed?: boolean;
  /** Fires when the reveal toggle flips (controlled or uncontrolled). */
  onRevealedChange?: (revealed: boolean) => void;
  /**
   * Accessible name for the reveal toggle when the password is hidden.
   * @default "Show password"
   */
  showPasswordLabel?: string;
  /**
   * Accessible name for the reveal toggle when the password is visible.
   * @default "Hide password"
   */
  hidePasswordLabel?: string;
  /**
   * Show a trailing spinner and mark the field `aria-busy`.
   * @default false
   */
  loading?: boolean;
  /** When loading, make the spinner a cancel button (spinner → ✕ on hover/focus) that calls this. */
  onCancel?: () => void;
  /**
   * Accessible name for the cancel button.
   * @default "Cancel"
   */
  cancelLabel?: string;
}

/**
 * A single-line text field with optional in-field affordances — leading/trailing slots, clear button, password reveal, and loading spinner.
 *
 * Documentation: https://garn.ohuba.com/components/input
 */
function Input({
  className,
  type,
  size,
  appearance,
  ref,
  leading,
  trailing,
  clearable = false,
  clearLabel = "Clear",
  onClear,
  revealable = false,
  revealed: revealedProp,
  onRevealedChange,
  showPasswordLabel = "Show password",
  hidePasswordLabel = "Hide password",
  loading = false,
  onCancel,
  cancelLabel = "Cancel",
  ...props
}: InputProps) {
  const resolvedSize: InputSize = size ?? "md";
  const resolvedAppearance = appearance ?? "outline";
  const { disabled, readOnly, value, defaultValue, id } = props;

  // aria-invalid (boolean or "true") drives the wrapper's invalid look + the auto
  // error-icon. Read without consuming, so the inner input keeps the attribute.
  const ariaInvalid = props["aria-invalid"];
  const isInvalid = ariaInvalid === true || ariaInvalid === "true";

  // Password reveal — only meaningful for a password field. Controlled when
  // `revealed` is supplied, else tracked locally (controllable-state parity).
  const isPassword = type === "password";
  const isRevealControlled = revealedProp !== undefined;
  const [revealedUncontrolled, setRevealedUncontrolled] = React.useState(false);
  const revealed = isRevealControlled ? !!revealedProp : revealedUncontrolled;
  const setRevealed = React.useCallback(
    (next: boolean) => {
      if (!isRevealControlled) setRevealedUncontrolled(next);
      onRevealedChange?.(next);
    },
    [isRevealControlled, onRevealedChange]
  );
  const showReveal = revealable && isPassword;
  const renderedType = showReveal ? (revealed ? "text" : "password") : type;

  // Value observation for clearable: derive emptiness from controlled `value`,
  // else track it locally for the uncontrolled case.
  const isControlled = value !== undefined;
  const [hasValueUncontrolled, setHasValueUncontrolled] = React.useState(
    () => String(defaultValue ?? "").length > 0
  );
  const hasValue = isControlled
    ? String(value ?? "").length > 0
    : hasValueUncontrolled;

  // Any slot / affordance / invalid / loading state pulls the field into the
  // wrapped path. Wrapping is STICKY: once a field gains a wrapper it keeps it, so
  // toggling `loading`/`aria-invalid` (e.g. live form validation) never re-parents
  // and remounts the <input> — which would drop focus and keystrokes mid-typing. A
  // field that is never enriched stays bare (the backward-compatible fast path).
  const enrichedNow =
    leading != null ||
    trailing != null ||
    clearable ||
    showReveal ||
    loading ||
    isInvalid;
  const everWrapped = React.useRef(false);
  if (enrichedNow) everWrapped.current = true;
  const enriched = everWrapped.current;

  // Compose the consumer ref with our own (clear/focus/submit-reset need the node).
  const innerRef = React.useRef<HTMLInputElement>(null);
  const setRef = React.useCallback(
    (node: HTMLInputElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref)
        (ref as React.RefObject<HTMLInputElement | null>).current = node;
    },
    [ref]
  );

  const generatedId = React.useId();
  const inputId = id ?? (showReveal ? generatedId : undefined);

  const doClear = React.useCallback(() => {
    const input = innerRef.current;
    if (!input) return;
    // Native value setter + dispatched input event so React (and the consumer's
    // onChange) sees the change in both controlled and uncontrolled modes.
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    )?.set;
    setter?.call(input, "");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    if (!isControlled) setHasValueUncontrolled(false);
    input.focus();
    onClear?.();
  }, [isControlled, onClear]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isControlled) setHasValueUncontrolled(e.target.value.length > 0);
    props.onChange?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    props.onKeyDown?.(e);
    if (
      e.key === "Escape" &&
      clearable &&
      hasValue &&
      !readOnly &&
      !disabled &&
      !e.defaultPrevented
    ) {
      // Consume Escape only when there's something to clear (else let it bubble
      // to close an enclosing popover/dialog).
      e.preventDefault();
      e.stopPropagation();
      doClear();
    }
  };

  // Force the type back to password on form submit, so the value is never
  // submitted while shown as plain text (GOV.UK). Only with an active toggle.
  React.useEffect(() => {
    if (!showReveal) return;
    const form = innerRef.current?.form;
    if (!form) return;
    const onSubmit = () => setRevealed(false);
    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, [showReveal, setRevealed]);

  // ---- BARE path: plain <input> ------------------------------------------
  // Props spread LAST so a wrapping FormControl's data-slot/aria-* win (matches the
  // original). The composed ref is only needed by the wrapped-path affordances, so
  // here the consumer ref passes straight through.
  if (!enriched) {
    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        data-size={resolvedSize}
        data-appearance={resolvedAppearance}
        className={cn(fieldVariants({ appearance, size, className }))}
        {...props}
      />
    );
  }

  // ---- WRAPPED path ------------------------------------------------------
  const clearShown =
    clearable && hasValue && !disabled && !readOnly && !loading;
  const hasTrailingZone =
    trailing != null || isInvalid || showReveal || clearable || loading;

  return (
    <FieldSurface
      slot="input-root"
      appearance={appearance}
      size={size}
      invalid={isInvalid}
      disabled={disabled}
      loading={loading}
      hasLeading={leading != null}
      hasTrailing={hasTrailingZone}
      className={className}
    >
      {leading != null ? (
        <span
          data-slot="input-leading"
          className="inline-flex shrink-0 items-center text-muted-foreground"
        >
          {leading}
        </span>
      ) : null}

      <input
        {...props}
        ref={setRef}
        id={inputId}
        type={renderedType}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        aria-busy={loading || undefined}
        className={NAKED_INPUT}
        data-slot="input"
        data-size={resolvedSize}
      />

      {hasTrailingZone ? (
        <span
          data-slot="input-trailing"
          className="inline-flex shrink-0 items-center gap-1"
        >
          {isInvalid && !loading ? (
            <CircleAlertIcon
              data-slot="input-error-icon"
              aria-hidden="true"
              className="shrink-0 text-danger"
            />
          ) : null}

          {showReveal ? (
            <button
              type="button"
              data-slot="input-reveal"
              aria-controls={inputId}
              aria-label={revealed ? hidePasswordLabel : showPasswordLabel}
              disabled={disabled || undefined}
              onClick={() => setRevealed(!revealed)}
              className={AFFORDANCE_BTN}
            >
              {revealed ? (
                <EyeOffIcon aria-hidden="true" />
              ) : (
                <EyeIcon aria-hidden="true" />
              )}
            </button>
          ) : null}

          {clearable ? (
            <button
              type="button"
              data-slot="input-clear"
              aria-label={clearLabel}
              aria-hidden={!clearShown || undefined}
              tabIndex={clearShown ? 0 : -1}
              disabled={disabled || undefined}
              onClick={doClear}
              className={cn(
                AFFORDANCE_BTN,
                "transition-opacity motion-reduce:transition-none",
                clearShown ? "opacity-100" : "pointer-events-none opacity-0"
              )}
            >
              <XIcon aria-hidden="true" />
            </button>
          ) : null}

          {loading ? (
            onCancel ? (
              // Cancellable: a real button showing the spinner at rest and a ✕ on
              // hover/focus (cross-fade). The field stays aria-busy; the button is
              // keyboard-reachable and the spinner is still tappable on touch.
              <button
                type="button"
                data-slot="input-cancel"
                aria-label={cancelLabel}
                disabled={disabled || undefined}
                onClick={onCancel}
                className={cn(AFFORDANCE_BTN, "group/cancel relative")}
              >
                <Spinner
                  size={SPINNER_SIZE[resolvedSize]}
                  aria-hidden="true"
                  className="transition-opacity group-hover/field:opacity-0 group-focus-visible/cancel:opacity-0 motion-reduce:transition-none"
                />
                <XIcon
                  aria-hidden="true"
                  className="absolute inset-0 m-auto opacity-0 transition-opacity group-hover/field:opacity-100 group-focus-visible/cancel:opacity-100 motion-reduce:transition-none"
                />
              </button>
            ) : (
              <Spinner
                data-slot="input-loading"
                size={SPINNER_SIZE[resolvedSize]}
                aria-hidden="true"
                className="text-muted-foreground"
              />
            )
          ) : null}

          {trailing != null ? (
            <span className="inline-flex items-center text-muted-foreground">
              {trailing}
            </span>
          ) : null}
        </span>
      ) : null}

      {showReveal ? (
        <span aria-live="polite" className="sr-only">
          {revealed ? "Your password is visible" : "Your password is hidden"}
        </span>
      ) : null}
    </FieldSurface>
  );
}

export { Input };
