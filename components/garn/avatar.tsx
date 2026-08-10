"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { CheckIcon, LockIcon, MinusIcon, UserIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/garn/popover";
import { ScrollArea } from "@/components/garn/scroll-area";

/* Avatar geometry is IDENTITY, not density: a fixed 16→128px size ladder, never
   the density-driven --garn-control-* tokens, so a compact table never shrinks
   it. The frame is deliberately NOT overflow-hidden — the image and fallback
   round themselves — so a corner presence/status indicator can sit past the edge
   without being clipped. */

// A regular (pointy-top) hexagon, defined once as a CSS custom property so the
// root sets it and the image/fallback (and the skeleton) all clip to the same
// shape. Percentages only — token-safe. The root goes transparent and clips its
// media children (not the root) so a corner indicator is never cut off.
const HEX =
  "[--avatar-hex:polygon(50%_0%,93.3%_25%,93.3%_75%,50%_100%,6.7%_75%,6.7%_25%)]";
const HEX_SHAPE = cn(
  "bg-transparent",
  HEX,
  "[&>[data-slot=avatar-image]]:[clip-path:var(--avatar-hex)]",
  "[&>[data-slot=avatar-fallback]]:[clip-path:var(--avatar-hex)]"
);

// Identity sizes — fixed `size-*`, never the density-driven --garn-control-*
// tokens (those scale "air"; an avatar is a drawn shape). Fallback text scales
// with the rung. Square corners scale with size via the compoundVariants below.
const avatarVariants = cva(
  "relative inline-flex shrink-0 select-none items-center justify-center bg-muted align-middle font-medium text-muted-foreground",
  {
    variants: {
      size: {
        "2xs": "size-4 text-xs", // 16
        xs: "size-6 text-xs", // 24
        sm: "size-8 text-sm", // 32
        md: "size-10 text-base", // 40
        lg: "size-12 text-lg", // 48
        xl: "size-24 text-3xl", // 96
        "2xl": "size-32 text-4xl", // 128
      },
      shape: {
        circle: "rounded-full",
        square: "", // per-size radius set in compoundVariants
        hexagon: HEX_SHAPE,
      },
      // Interactive (asChild) affordances: a hover tint overlay (::after, so it
      // sits over the image but under the z-10 indicators) and the keyboard
      // focus ring. No press-scale — library-wide, a control does not move under
      // the pointer; the tint carries it.
      interactive: {
        true: "cursor-pointer outline-none after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-foreground/0 hover:after:bg-state-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        false: "",
      },
    },
    compoundVariants: [
      // Square radius grows with the avatar (reference: 2/2/3/3/6/12px) → nearest
      // garn radius token per rung.
      { shape: "square", size: "2xs", class: "rounded-xs" },
      { shape: "square", size: "xs", class: "rounded-xs" },
      { shape: "square", size: "sm", class: "rounded-sm" },
      { shape: "square", size: "md", class: "rounded-sm" },
      { shape: "square", size: "lg", class: "rounded-md" },
      { shape: "square", size: "xl", class: "rounded-lg" },
      { shape: "square", size: "2xl", class: "rounded-xl" },
    ],
    defaultVariants: { size: "md", shape: "circle", interactive: false },
  }
);

export type AvatarSize = NonNullable<VariantProps<typeof avatarVariants>["size"]>;
export type AvatarShape = NonNullable<VariantProps<typeof avatarVariants>["shape"]>;

// Best-effort accessible-name probe (dev only) for an interactive avatar: the
// name lives on the consumer's element (aria-label/title), or on the AvatarImage
// `alt`, or as AvatarFallback text. Walk for any of them.
function hasAccessibleName(node: React.ReactNode): boolean {
  if (!React.isValidElement(node)) return false;
  const props = node.props as {
    "aria-label"?: unknown;
    "aria-labelledby"?: unknown;
    title?: unknown;
    alt?: unknown;
    children?: React.ReactNode;
  };
  if (props["aria-label"] || props["aria-labelledby"] || props.title) return true;
  if (typeof props.alt === "string" && props.alt.trim().length > 0) return true;
  return React.Children.toArray(props.children).some((c) =>
    typeof c === "string" ? c.trim().length > 0 : hasAccessibleName(c)
  );
}

export interface AvatarProps
  extends Omit<React.ComponentProps<typeof AvatarPrimitive.Root>, "size">,
    Pick<VariantProps<typeof avatarVariants>, "size" | "shape"> {
  /**
   * Render the consumer's element (an `<a>`/`<button>`) as the root — makes the
   * avatar interactive (hover tint + focus ring).
   * @default false
   */
  asChild?: boolean;
}

/**
 * A person or entity's identity mark — a photo with an initials/glyph fallback,
 * on a fixed circle / square / hexagon frame, optionally carrying presence or
 * status indicators. `asChild` promotes it to an interactive `<a>`/`<button>`.
 *
 * Documentation: https://garn.ohuba.com/components/avatar
 */
function Avatar({
  className,
  size,
  shape,
  asChild = false,
  ...props
}: AvatarProps) {
  if (process.env.NODE_ENV !== "production" && asChild) {
    if (!hasAccessibleName(props.children)) {
      // eslint-disable-next-line no-console
      console.warn(
        "garn Avatar: an interactive avatar (asChild) has no accessible name. Give the link/button an `aria-label` (the person's name), or an AvatarImage `alt` / AvatarFallback text."
      );
    }
  }
  return (
    <AvatarPrimitive.Root
      asChild={asChild}
      data-slot="avatar"
      data-size={size ?? "md"}
      data-shape={shape ?? "circle"}
      data-interactive={asChild || undefined}
      className={cn(
        avatarVariants({ size, shape, interactive: asChild }),
        className
      )}
      {...props}
    />
  );
}

/** The photo — give it a meaningful `alt`. Rounds itself to the frame shape (a replaced `<img>` clips its own paint), so the root needs no `overflow-hidden`. */
function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("size-full rounded-[inherit] object-cover", className)}
      {...props}
    />
  );
}

/** Shown while the image loads or if it fails — pass 1–2 initials, or leave empty for a neutral person glyph so a missing image is never a blank disc. */
function AvatarFallback({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-[inherit] bg-muted uppercase leading-none",
        className
      )}
      {...props}
    >
      {children ?? <UserIcon className="size-[60%]" aria-hidden="true" />}
    </AvatarPrimitive.Fallback>
  );
}

export interface AvatarSkeletonProps extends React.ComponentProps<"span"> {
  /** Match the avatar it stands in for. @default "md" */
  size?: AvatarSize;
  /** Match the avatar it stands in for. @default "circle" */
  shape?: AvatarShape;
}

/** A pulsing placeholder in the avatar's size + shape, for the loading state (reduced-motion-safe). */
function AvatarSkeleton({
  size,
  shape,
  className,
  ...props
}: AvatarSkeletonProps) {
  return (
    <span
      data-slot="avatar-skeleton"
      data-size={size ?? "md"}
      data-shape={shape ?? "circle"}
      aria-hidden="true"
      className={cn(
        avatarVariants({ size, shape }),
        "animate-pulse bg-muted",
        shape === "hexagon" && "[clip-path:var(--avatar-hex)]",
        className
      )}
      {...props}
    />
  );
}

/* ---- Presence / status indicators -------------------------------------------
 * Anchored to a corner (presence bottom-end, status top-end — logical, RTL-safe),
 * sized as a fraction of the avatar so they scale with every rung, wrapped in a
 * 2px surface-color ring (the "cutout"). The glyph is knocked out in the surface
 * color. Each carries an sr-only state word so the meaning is never color-only. */

export type AvatarPresenceType = "online" | "busy" | "focus" | "offline";
export type AvatarStatusType = "approved" | "declined" | "locked";

// Shared marker shell: 30% of the avatar, round, ring cutout, glyph in surface color.
const MARKER =
  "pointer-events-none absolute z-10 inline-flex aspect-square w-[30%] items-center justify-center rounded-full text-background ring-2 ring-background [&_svg]:size-[64%]";

const PRESENCE: Record<
  AvatarPresenceType,
  { label: string; fill: string; glyph?: React.ReactNode }
> = {
  online: { label: "Online", fill: "bg-avatar-online" },
  busy: {
    label: "Busy",
    fill: "bg-avatar-busy",
    glyph: <MinusIcon strokeWidth={4} aria-hidden="true" />,
  },
  focus: { label: "Focus", fill: "bg-avatar-focus" },
  // hollow ring: surface center + a grey edge (no glyph).
  offline: { label: "Offline", fill: "border-2 border-avatar-offline bg-background" },
};

const STATUS: Record<
  AvatarStatusType,
  { label: string; fill: string; glyph: React.ReactNode }
> = {
  approved: {
    label: "Approved",
    fill: "bg-avatar-online",
    glyph: <CheckIcon strokeWidth={3} aria-hidden="true" />,
  },
  declined: {
    label: "Declined",
    fill: "bg-avatar-busy",
    glyph: <XIcon strokeWidth={3} aria-hidden="true" />,
  },
  locked: {
    label: "Locked",
    fill: "bg-avatar-locked",
    glyph: <LockIcon strokeWidth={2.5} aria-hidden="true" />,
  },
};

export interface AvatarPresenceProps
  extends Omit<React.ComponentProps<"span">, "children"> {
  /** Which presence state to show. */
  type: AvatarPresenceType;
  /** Accessible label; defaults to the capitalized state word. */
  label?: string;
}

/** A presence dot (online / busy / focus / offline) anchored to the avatar's bottom-end corner. */
function AvatarPresence({ type, label, className, ...props }: AvatarPresenceProps) {
  const cfg = PRESENCE[type];
  return (
    <span
      data-slot="avatar-presence"
      data-presence={type}
      className={cn(MARKER, "bottom-[6%] end-[6%]", cfg.fill, className)}
      {...props}
    >
      {cfg.glyph}
      <span className="sr-only">{label ?? cfg.label}</span>
    </span>
  );
}

export interface AvatarStatusProps
  extends Omit<React.ComponentProps<"span">, "children"> {
  /** Which status to show. */
  type: AvatarStatusType;
  /** Accessible label; defaults to the capitalized state word. */
  label?: string;
}

/** A status glyph (approved / declined / locked) anchored to the avatar's top-end corner. */
function AvatarStatus({ type, label, className, ...props }: AvatarStatusProps) {
  const cfg = STATUS[type];
  return (
    <span
      data-slot="avatar-status"
      data-status={type}
      className={cn(MARKER, "end-[6%] top-[6%]", cfg.fill, className)}
      {...props}
    >
      {cfg.glyph}
      <span className="sr-only">{label ?? cfg.label}</span>
    </span>
  );
}

export interface AvatarItemProps extends React.ComponentProps<"div"> {
  /**
   * Promote the whole row to the consumer's interactive element (a `<button>`/`<a>`).
   * @default false
   */
  asChild?: boolean;
  /** The leading Avatar. */
  avatar?: React.ReactNode;
  /** The primary line — usually the person's name. */
  primaryText: React.ReactNode;
  /** An optional muted second line under the primary. */
  secondaryText?: React.ReactNode;
  /** Reflected as `data-selected` and styled as the active row. */
  selected?: boolean;
}

/** An avatar beside a primary line (+ optional secondary) for lists and menus; `asChild` promotes the whole row to a link/button. */
function AvatarItem({
  asChild = false,
  avatar,
  primaryText,
  secondaryText,
  selected,
  className,
  children,
  ...props
}: AvatarItemProps) {
  const Comp = asChild ? Slot : "div";

  // Children are passed to <Slot> directly (never wrapped in a Fragment, which
  // Slot would try to clone props onto): the Slottable marks the consumer's
  // interactive element, and the avatar + text become its children.
  return (
    <Comp
      data-slot="avatar-item"
      data-selected={selected || undefined}
      className={cn(
        "inline-flex items-center gap-2",
        asChild &&
          "-m-1 cursor-pointer rounded-md p-1 outline-none transition-colors hover:bg-state-hover data-[selected]:bg-state-selected focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
        className
      )}
      {...props}
    >
      {asChild ? <Slottable>{children}</Slottable> : null}
      {avatar}
      <span
        data-slot="avatar-item-content"
        className="flex min-w-0 flex-col text-start"
      >
        <span
          data-slot="avatar-item-primary"
          className="truncate text-sm font-medium text-foreground"
        >
          {primaryText}
        </span>
        {secondaryText != null ? (
          <span
            data-slot="avatar-item-secondary"
            className="truncate text-xs text-muted-foreground"
          >
            {secondaryText}
          </span>
        ) : null}
      </span>
    </Comp>
  );
}

// 25% overlap per rung (negative inline-start margin — logical, RTL-safe).
const OVERLAP: Record<AvatarSize, string> = {
  "2xs": "-ms-1",
  xs: "-ms-1.5",
  sm: "-ms-2",
  md: "-ms-2.5",
  lg: "-ms-3",
  xl: "-ms-6",
  "2xl": "-ms-8",
};

function isAvatarElement(node: React.ReactNode): node is React.ReactElement {
  return React.isValidElement(node);
}

// Pull a display name out of an Avatar child (aria-label > title > image alt >
// fallback text) so the overflow popover can label each AvatarItem.
function deriveName(el: React.ReactElement): string | undefined {
  const p = el.props as {
    "aria-label"?: string;
    title?: string;
    children?: React.ReactNode;
  };
  if (p["aria-label"]) return p["aria-label"];
  if (p.title) return p.title;
  let found: string | undefined;
  React.Children.forEach(p.children, (c) => {
    if (found != null || !React.isValidElement(c)) return;
    const cp = c.props as { alt?: string; children?: React.ReactNode };
    if (typeof cp.alt === "string" && cp.alt.trim()) {
      found = cp.alt;
      return;
    }
    const text = React.Children.toArray(cp.children)
      .filter((x) => typeof x === "string")
      .join("")
      .trim();
    if (text) found = text;
  });
  return found;
}

export interface AvatarGroupProps
  extends Omit<React.ComponentProps<"div">, "onClick"> {
  /**
   * `stack` overlaps the avatars; `grid` lays them out with even gutters.
   * @default "stack"
   */
  appearance?: "stack" | "grid";
  /** Show at most this many avatars before collapsing the rest into "+N". Defaults to 5 (stack) / 11 (grid). */
  max?: number;
  /** Total people represented when not all are passed as children — the surplus is added to "+N". */
  total?: number;
  /**
   * Size applied to every avatar + the chip.
   * @default "sm"
   */
  size?: AvatarSize;
  /**
   * Shape applied to every avatar + the chip.
   * @default "circle"
   */
  shape?: AvatarShape;
  /** Accessible name for the group (required — the group is a labelled list). */
  label?: string;
  /** Fires with the avatar's index when a stacked avatar is clicked. */
  onAvatarClick?: (index: number) => void;
  /** Fires when the "+N" chip is clicked. When set, it replaces the default popover. */
  onMoreClick?: () => void;
  /** Accessible label for the "+N" chip (default: "N more"). */
  moreLabel?: string;
}

/** A labelled stack (or grid) of overlapping avatars, capped at `max` with a "+N" overflow chip that lists the rest. */
function AvatarGroup({
  appearance = "stack",
  max,
  total,
  size = "sm",
  shape = "circle",
  label,
  onAvatarClick,
  onMoreClick,
  moreLabel,
  className,
  children,
  ...props
}: AvatarGroupProps) {
  const isStack = appearance === "stack";
  const avatars = React.Children.toArray(children).filter(isAvatarElement);
  const rendered = avatars.length;
  // `total` lets a count exceed the passed children (the surplus is uncounted in
  // the list but still tallied in "+N"). Caps differ per appearance (reference).
  const effectiveTotal = total != null ? Math.max(total, rendered) : rendered;
  const cap = max ?? (isStack ? 5 : 11);
  const overflowed = effectiveTotal > cap;
  // Reserve the last slot for the chip when overflowing.
  const visibleCount = overflowed ? cap - 1 : rendered;
  const visible = avatars.slice(0, visibleCount);
  const hidden = avatars.slice(visibleCount);

  if (process.env.NODE_ENV !== "production" && !label && !props["aria-label"]) {
    // eslint-disable-next-line no-console
    console.warn(
      'garn AvatarGroup: give the group an accessible name via `label` (e.g. "Project team").'
    );
  }

  // Stack rings each avatar in the surface color so overlaps separate; grid uses
  // the container gap and needs no ring.
  const decorate = (el: React.ReactElement) =>
    React.cloneElement(el, {
      size: (el.props as { size?: AvatarSize }).size ?? size,
      shape: (el.props as { shape?: AvatarShape }).shape ?? shape,
      className: cn(
        isStack && "ring-2 ring-background",
        // Clickable items get the same hover tint the `interactive` variant
        // uses. It rides the AVATAR, not the button wrapping it, so
        // `rounded-[inherit]` picks up whatever radius the shape resolved to —
        // the wrapper is a fixed `rounded-full` and would cut corners off a
        // square group. Triggered from the item wrapper, which is what the
        // pointer is actually over.
        onAvatarClick &&
          "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-foreground/0 after:transition-colors group-hover/avatar-item:after:bg-state-hover",
        (el.props as { className?: string }).className
      ),
    } as Partial<AvatarProps>);

  return (
    <div
      data-slot="avatar-group"
      data-appearance={appearance}
      role="list"
      aria-label={label}
      className={cn(
        isStack ? "flex items-center" : "flex flex-wrap items-center gap-2",
        className
      )}
      {...props}
    >
      {visible.map((el, i) => (
        <div
          key={el.key ?? i}
          role="listitem"
          className={cn(
            "relative hover:z-10 focus-within:z-10",
            onAvatarClick && "group/avatar-item",
            isStack && i > 0 && OVERLAP[size]
          )}
        >
          {onAvatarClick ? (
            <button
              type="button"
              aria-label={deriveName(el)}
              onClick={() => onAvatarClick(i)}
              // No press-scale: this is a real <button>, and library-wide a
              // control does not move under the pointer. The affordances are
              // the focus ring here plus the hover tint on the avatar itself
              // (see `decorate`) and the wrapper's hover:z-10 lift.
              className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {decorate(el)}
            </button>
          ) : (
            decorate(el)
          )}
        </div>
      ))}

      {overflowed ? (
        <div
          role="listitem"
          className={cn(
            "relative hover:z-10 focus-within:z-10",
            isStack && OVERLAP[size]
          )}
        >
          <AvatarGroupMore
            count={effectiveTotal - visibleCount}
            size={size}
            shape={shape}
            isStack={isStack}
            label={moreLabel}
            onMoreClick={onMoreClick}
            hidden={hidden}
          />
        </div>
      ) : null}
    </div>
  );
}

function AvatarGroupMore({
  count,
  size,
  shape,
  isStack,
  label,
  onMoreClick,
  hidden,
}: {
  count: number;
  size: AvatarSize;
  shape: AvatarShape;
  isStack: boolean;
  label?: string;
  onMoreClick?: () => void;
  hidden: React.ReactElement[];
}) {
  const trigger = (
    <button
      type="button"
      data-slot="avatar-group-more"
      aria-label={label ?? `${count} more`}
      onClick={onMoreClick}
      className={cn(
        avatarVariants({ size, shape, interactive: true }),
        "bg-secondary font-medium text-secondary-foreground",
        isStack && "ring-2 ring-background",
        shape === "hexagon" && "[clip-path:var(--avatar-hex)]"
      )}
    >
      <span aria-hidden="true">+{count}</span>
    </button>
  );

  // A custom handler replaces the default popover.
  if (onMoreClick) return trigger;

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-1">
        <ScrollArea className="max-h-72">
          <div role="list" className="flex flex-col gap-0.5 pe-2">
            {hidden.map((el, i) => (
              <AvatarItem
                key={el.key ?? i}
                role="listitem"
                avatar={React.cloneElement(el, {
                  size: "sm",
                  shape,
                } as Partial<AvatarProps>)}
                primaryText={deriveName(el) ?? "Unknown"}
              />
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarSkeleton,
  AvatarPresence,
  AvatarStatus,
  AvatarItem,
  AvatarGroup,
  avatarVariants,
};
