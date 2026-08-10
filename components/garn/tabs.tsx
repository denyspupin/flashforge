"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Counter } from "@/components/garn/counter";

// A Radix Tabs wrapper (the APG tabs pattern) deepened into a view-switcher.
// Radix owns the keyboard model and ARIA; this layer adds the styling axes, the
// animated indicator, overflow scrolling, and lazy panels. The root holds
// variant/size/orientation/mount on a context so every part reads one source of
// truth and reflects them onto data-variant / data-size / data-orientation.

export type TabsVariant = "underline" | "pill" | "enclosed";
export type TabsSize = "sm" | "md" | "lg";
type Orientation = "horizontal" | "vertical";
export type TabsMountMode = "active" | "eager";

/* ----------------------------------------------------------------- tokens --- */

// Trigger height + text + horizontal padding per size, off the control ladder.
// `pill`/`enclosed` get a fuller box; `underline` is text-led (the bar is the
// affordance) so it carries no own background and a tighter inline padding.
const triggerSize: Record<TabsSize, string> = {
  sm: "h-[var(--garn-control-h-sm)] px-[var(--garn-control-px-sm)] text-xs gap-1 [&_svg]:size-3.5",
  md: "h-[var(--garn-control-h-md)] px-[var(--garn-control-px-md)] text-sm gap-1.5 [&_svg]:size-4",
  lg: "h-[var(--garn-control-h-lg)] px-[var(--garn-control-px-lg)] text-sm gap-2 [&_svg]:size-4",
};

const counterSize: Record<TabsSize, "sm" | "md"> = {
  sm: "sm",
  md: "sm",
  lg: "md",
};

/* ------------------------------------------------------------- context ----- */

interface TabsContextValue {
  variant: TabsVariant;
  size: TabsSize;
  orientation: Orientation;
  mount: TabsMountMode;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabs(): TabsContextValue {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("garn Tabs: this part must be used within <Tabs>.");
  return ctx;
}

// The scrolling tablist shares its element so the scroll buttons can page it and
// mirror its reached-end state. Provided by `TabsList`.
interface TabsListContextValue {
  listRef: React.RefObject<HTMLDivElement | null>;
}

const TabsListContext = React.createContext<TabsListContextValue | null>(null);

/* ----------------------------------------------------------------- root ---- */

export interface TabsProps
  extends React.ComponentProps<typeof TabsPrimitive.Root> {
  /**
   * The tab-strip look, which swaps the active-indicator geometry (not fill):
   * `underline` (a bar on the strip's trailing edge), `pill` (a raised thumb
   * behind the active tab in a soft track), or `enclosed` (folder/card tabs whose
   * own border is the marker).
   * @default "underline"
   */
  variant?: TabsVariant;
  /**
   * Trigger height + text/padding, off the shared control ladder.
   * @default "md"
   */
  size?: TabsSize;
  /**
   * Panel mounting. `active` mounts a panel's children on first activation;
   * `eager` renders every panel up front (SEO / measure-on-mount). Per-panel
   * `keepMounted` persists an activated panel.
   * @default "active"
   */
  mount?: TabsMountMode;
}

/**
 * Switch between a few peer views in place, showing one panel at a time — a Radix
 * Tabs view-switcher with `underline` / `pill` / `enclosed` looks, an animated
 * active indicator, overflow scrolling, and lazy panels.
 *
 * Documentation: https://garn.ohuba.com/components/tabs
 */
function Tabs({
  className,
  variant = "underline",
  size = "md",
  mount = "active",
  orientation = "horizontal",
  ...props
}: TabsProps) {
  const ctx = React.useMemo<TabsContextValue>(
    () => ({ variant, size, orientation, mount }),
    [variant, size, orientation, mount]
  );
  return (
    <TabsContext.Provider value={ctx}>
      <TabsPrimitive.Root
        className={cn(
          "flex gap-[var(--garn-gap-stack)]",
          orientation === "vertical" ? "flex-row" : "flex-col",
          className
        )}
        data-slot="tabs"
        data-variant={variant}
        data-size={size}
        orientation={orientation}
        {...props}
      />
    </TabsContext.Provider>
  );
}

/* ----------------------------------------------------------------- list ---- */

export interface TabsListProps
  extends React.ComponentProps<typeof TabsPrimitive.List> {
  /**
   * Render an animated active indicator. Set false to opt out.
   * @default true
   */
  indicator?: boolean;
  /**
   * Show prev/next scroll buttons flanking the list when it overflows (the
   * pointer affordance — keyboard + trackpad scroll already work). The buttons
   * sit *outside* the tablist so the ARIA structure stays clean; they fade out
   * at the reached end. Compose `TabsScrollButton` by hand for bespoke layouts.
   * @default false
   */
  scrollButtons?: boolean;
}

/** The tablist strip that holds the triggers (roving focus) and the sliding indicator. */
function TabsList({
  className,
  children,
  indicator = true,
  scrollButtons = false,
  ...props
}: TabsListProps) {
  const { variant, size, orientation } = useTabs();
  const listRef = React.useRef<HTMLDivElement>(null);
  const horizontal = orientation === "horizontal";

  // Edge-fade + end-state tracking: a passive scroll/resize handler toggles
  // data-attributes (no React state, no re-render per scroll event); the mask +
  // scroll-button disabled state read them via data-[overflow-*] / the scroll
  // button's own listener.
  React.useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const update = () => {
      const horizontalAxis = el.scrollWidth > el.clientWidth + 1;
      const verticalAxis = el.scrollHeight > el.clientHeight + 1;
      const overflowing = horizontalAxis || verticalAxis;
      const startOff = horizontalAxis ? el.scrollLeft > 0 : el.scrollTop > 0;
      const max = horizontalAxis
        ? el.scrollWidth - el.clientWidth
        : el.scrollHeight - el.clientHeight;
      const pos = horizontalAxis ? el.scrollLeft : el.scrollTop;
      const endOff = pos < max - 1;
      el.toggleAttribute("data-overflow", overflowing);
      el.toggleAttribute("data-overflow-start", overflowing && startOff);
      el.toggleAttribute("data-overflow-end", overflowing && endOff);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    // ResizeObserver catches the box resizing; a childList MutationObserver catches
    // triggers being added/removed — both re-evaluate overflow without a React dep.
    const ro = new ResizeObserver(update);
    ro.observe(el);
    const mo = new MutationObserver(update);
    mo.observe(el, { childList: true });
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  // Drive the active indicator + keep the active trigger in view. Both react to
  // the same event — Radix flipping `data-state="active"` on a trigger — so one
  // MutationObserver serves both. The geometry is written to `--tabs-indicator-*`
  // vars on the list (imperative DOM, no re-render per frame); the
  // `TabsIndicator` span just reads those inherited vars. This lives here (not in
  // the indicator) because the list ref is reliably attached by the time this
  // effect runs, whereas a deep-child layout effect can fire before Radix commits
  // the list ref. `useLayoutEffect` so the first paint already carries the bar.
  React.useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;

    // Position the indicator under the active trigger by writing literal geometry
    // straight onto the indicator element (offsets are relative to the list's
    // scroll content, so the bar tracks the trigger even while scrolled). Literal
    // px/number — not CSS vars consumed by `var()` in inline style, which proved
    // unreliable to resolve. Imperative DOM, no React re-render per frame.
    // `animate=false` (the first measure / resize) snaps into place with the
    // transition suppressed, so the bar appears already-positioned instead of
    // growing in from x=0 on every load; later tab changes
    // animate the slide.
    const measure = (animate = true) => {
      const indicator = el.querySelector<HTMLElement>(
        ':scope > [data-slot="tabs-indicator"]'
      );
      if (!indicator) return;
      const active = el.querySelector<HTMLElement>(
        '[data-slot="tabs-trigger"][data-state="active"]'
      );
      if (!active) {
        indicator.style.opacity = "0";
        return;
      }
      // Toggle the transition off for a snap, then restore it on the next frame so
      // the subsequent change animates. `data-animate` gates the CSS transition.
      indicator.dataset.animate = animate ? "true" : "false";
      const vertical = indicator.dataset.orientation === "vertical";
      indicator.style.opacity = "1";
      if (indicator.dataset.variant === "pill") {
        // pill thumb tracks both axes + the full trigger box.
        indicator.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
        indicator.style.width = `${active.offsetWidth}px`;
        indicator.style.height = `${active.offsetHeight}px`;
      } else if (vertical) {
        indicator.style.transform = `translateY(${active.offsetTop}px)`;
        indicator.style.height = `${active.offsetHeight}px`;
      } else {
        indicator.style.transform = `translateX(${active.offsetLeft}px)`;
        indicator.style.width = `${active.offsetWidth}px`;
      }
      if (!animate) {
        // Force a reflow, then re-enable transitions so the snap doesn't animate
        // but the next tab change does.
        void indicator.offsetWidth;
        indicator.dataset.animate = "true";
      }
    };

    // Bring the active trigger into the list's own viewport — but only when the
    // list scrolls, and computed against the list (never `scrollIntoView`, which
    // can scroll ancestor containers and the page). Skipped on the initial mount
    // so a default-active tab never yanks the page on load.
    const reveal = () => {
      const active = el.querySelector<HTMLElement>(
        '[data-slot="tabs-trigger"][data-state="active"]'
      );
      if (!active) return;
      const horizontalAxis = el.scrollWidth > el.clientWidth + 1;
      const verticalAxis = el.scrollHeight > el.clientHeight + 1;
      if (horizontalAxis) {
        const start = active.offsetLeft;
        const end = start + active.offsetWidth;
        if (start < el.scrollLeft) el.scrollTo({ left: start, behavior: "smooth" });
        else if (end > el.scrollLeft + el.clientWidth)
          el.scrollTo({ left: end - el.clientWidth, behavior: "smooth" });
      } else if (verticalAxis) {
        const start = active.offsetTop;
        const end = start + active.offsetHeight;
        if (start < el.scrollTop) el.scrollTo({ top: start, behavior: "smooth" });
        else if (end > el.scrollTop + el.clientHeight)
          el.scrollTo({ top: end - el.clientHeight, behavior: "smooth" });
      }
    };

    // Mount, resize, and font-load re-measures SNAP (no animation — the bar
    // appears already in place); only a user-driven tab change animates the slide.
    measure(false);
    const raf = requestAnimationFrame(() => measure(false));
    const fonts = (
      document as Document & { fonts?: { ready?: Promise<unknown> } }
    ).fonts;
    let cancelled = false;
    fonts?.ready?.then(() => {
      if (!cancelled) measure(false);
    });

    // A `data-state` flip = a user-driven tab change → animate the slide + reveal.
    // A childList change = triggers added/removed → snap (no animation), no reveal.
    const onMutations = (records: MutationRecord[]) => {
      const stateChange = records.some((m) => m.type === "attributes");
      if (stateChange) {
        measure(true);
        reveal();
      } else {
        measure(false);
      }
    };
    const mo = new MutationObserver(onMutations);
    mo.observe(el, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-state"],
    });
    const ro = new ResizeObserver(() => measure(false));
    ro.observe(el);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      mo.disconnect();
      ro.disconnect();
    };
  }, []);

  const listCtx = React.useMemo<TabsListContextValue>(
    () => ({ listRef }),
    []
  );

  const list = (
    <TabsPrimitive.List
      ref={listRef}
      className={cn(
        // The list is the scroll container + the indicator's positioning
        // context. Edge fades are a mask that only bites the overflowing side
        // (data-overflow-start/end gate the mask stops). The native scrollbar
        // is hidden — overflow is conveyed by the fades + optional buttons.
        "relative isolate flex shrink-0 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden motion-reduce:scroll-auto",
        horizontal
          ? "min-w-0 flex-row overflow-x-auto"
          : "flex-col overflow-y-auto",
        // Edge-fade masks (horizontal + vertical), applied only while that side
        // overflows.
        horizontal && [
          "data-[overflow-start]:[mask-image:linear-gradient(to_right,transparent,black_var(--garn-space-24))]",
          "data-[overflow-end]:[mask-image:linear-gradient(to_left,transparent,black_var(--garn-space-24))]",
          "data-[overflow-start]:data-[overflow-end]:[mask-image:linear-gradient(to_right,transparent,black_var(--garn-space-24),black_calc(100%_-_var(--garn-space-24)),transparent)]",
        ],
        !horizontal && [
          "data-[overflow-start]:[mask-image:linear-gradient(to_bottom,transparent,black_var(--garn-space-24))]",
          "data-[overflow-end]:[mask-image:linear-gradient(to_top,transparent,black_var(--garn-space-24))]",
          "data-[overflow-start]:data-[overflow-end]:[mask-image:linear-gradient(to_bottom,transparent,black_var(--garn-space-24),black_calc(100%_-_var(--garn-space-24)),transparent)]",
        ],
        // Per-variant list surface.
        variant === "pill" &&
          "w-fit items-center rounded-lg bg-muted p-1 text-muted-foreground",
        // underline draws its seam as an *inset* hairline rather than a border,
        // so the active bar can sit directly on top of it (the list is a scroll
        // container — anything outside the padding box gets clipped, so a bar
        // pulled onto a real border would be cut off).
        variant === "underline" &&
          (horizontal
            ? "items-stretch gap-1 shadow-[inset_0_-1px_0_0_var(--garn-border)]"
            : [
                "items-stretch gap-1 shadow-[inset_-1px_0_0_0_var(--garn-border)]",
                "[[dir=rtl]_&]:shadow-[inset_1px_0_0_0_var(--garn-border)]",
              ]),
        variant === "enclosed" &&
          (horizontal
            ? "items-end gap-0.5 border-b border-border"
            : "items-stretch gap-0.5 border-e border-border"),
        className
      )}
      data-orientation={orientation}
      data-slot="tabs-list"
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {children}
      {indicator ? <TabsIndicator /> : null}
    </TabsPrimitive.List>
  );

  return (
    <TabsListContext.Provider value={listCtx}>
      {scrollButtons ? (
        // Flank the scrollable list with prev/next buttons — siblings of the
        // tablist (never inside it), so the ARIA structure stays clean and the
        // buttons share the list context for paging + reached-end fade-out.
        <div
          className={cn(
            "flex min-w-0",
            horizontal ? "flex-row items-center" : "flex-col items-stretch"
          )}
          data-slot="tabs-list-scroller"
        >
          <TabsScrollButton direction="start" />
          {list}
          <TabsScrollButton direction="end" />
        </div>
      ) : (
        list
      )}
    </TabsListContext.Provider>
  );
}

/* ------------------------------------------------------------ indicator ---- */

export interface TabsIndicatorProps extends React.ComponentProps<"span"> {}

/**
 * The sliding active marker — an underline bar or a pill thumb (`enclosed` paints
 * none). Purely visual (`aria-hidden`); selection lives on `aria-selected`.
 */
// Radix Tabs has no Indicator part, so `TabsList` measures the active trigger and
// writes this element's geometry (transform/width/height/opacity) imperatively —
// literal px, no CSS-var indirection — so there's no re-render per frame. It starts
// at opacity:0 and the first measure fades it in, so it never flashes at the origin.
function TabsIndicator({ className, style, ...props }: TabsIndicatorProps) {
  const { variant, orientation } = useTabs();
  const horizontal = orientation === "horizontal";

  // enclosed paints no sliding marker.
  if (variant === "enclosed") return null;

  // Start hidden so the first (snap) measure positions it before it's seen. The
  // slide transition is gated by `data-animate`: the mount/resize/font measures
  // set it to "false" (snap into place), a tab change sets it "true" (animate).
  // `motion-reduce` drops the transition entirely.
  const shared =
    "pointer-events-none absolute z-0 opacity-0 data-[animate=true]:transition-[transform,width,height,opacity] duration-[var(--garn-motion-fast)] ease-standard motion-reduce:transition-none";

  if (variant === "pill") {
    // A raised thumb behind the active trigger — sits under the triggers (z-0;
    // triggers are z-10) inside the muted track.
    return (
      <span
        aria-hidden="true"
        data-slot="tabs-indicator"
        data-variant="pill"
        data-orientation={orientation}
        className={cn(shared, "left-0 top-0 rounded-md bg-background shadow-sm", className)}
        style={{ width: 0, height: 0, ...style }}
        {...props}
      />
    );
  }

  // underline — a brand bar on the list's trailing edge, tracking the active
  // trigger's leading offset + width (horizontal) or top offset + height (vertical).
  // It's flush with that edge, so it paints over the list's hairline seam rather
  // than stacking above it.
  return (
    <span
      aria-hidden="true"
      data-slot="tabs-indicator"
      data-variant="underline"
      data-orientation={orientation}
      className={cn(
        shared,
        "rounded-full bg-brand-solid",
        horizontal ? "bottom-0 left-0 h-0.5" : "end-0 top-0 w-0.5",
        className
      )}
      style={horizontal ? { width: 0, ...style } : { height: 0, ...style }}
      {...props}
    />
  );
}

/* -------------------------------------------------------------- trigger ---- */

export interface TabsTriggerProps
  extends React.ComponentProps<typeof TabsPrimitive.Trigger> {
  /** Leading icon (terse path). Compose children for full control. */
  icon?: React.ReactNode;
  /**
   * Trailing badge. A number renders a garn `Counter` matched to the tab's size
   * (e.g. an unread count); a node renders verbatim.
   */
  badge?: React.ReactNode;
}

/** A tab button; its `value` selects the matching `TabsContent`. */
function TabsTrigger({
  className,
  children,
  icon,
  badge,
  ...props
}: TabsTriggerProps) {
  const { variant, size, orientation } = useTabs();

  const badgeNode =
    typeof badge === "number" ? (
      <Counter
        value={badge}
        size={counterSize[size]}
        appearance="soft"
        live={false}
        className="ms-0.5"
      />
    ) : (
      badge
    );

  return (
    <TabsPrimitive.Trigger
      className={cn(
        // Base: the trigger sits above the indicator (z-10) and carries the
        // unified focus ring + disabled treatment. Color transitions use the
        // shared motion tokens.
        "relative z-10 inline-flex shrink-0 items-center justify-center whitespace-nowrap font-medium outline-none transition-[color,background-color,box-shadow] duration-[var(--garn-motion-instant)] ease-standard select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        triggerSize[size],
        // Per-variant resting + active look. Forced-colors keeps the active tab
        // legible where custom paint is dropped.
        variant === "pill" &&
          // Inactive pills lighten toward the foreground on hover (the thumb only
          // sits behind the active one), matching the underline/enclosed hover.
          "rounded-md text-muted-foreground hover:text-foreground data-[state=active]:text-foreground forced-colors:data-[state=active]:bg-[Highlight] forced-colors:data-[state=active]:text-[HighlightText]",
        variant === "underline" &&
          cn(
            "text-muted-foreground hover:text-foreground data-[state=active]:text-foreground",
            "forced-colors:data-[state=active]:text-[Highlight]"
          ),
        variant === "enclosed" &&
          cn(
            "rounded-t-md border border-transparent text-muted-foreground hover:text-foreground",
            "data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground",
            // Lift the active tab to overlap the list border (the folder seam).
            orientation === "horizontal"
              ? "-mb-px data-[state=active]:border-b-background"
              : "-me-px data-[state=active]:border-e-background",
            "forced-colors:data-[state=active]:border-[Highlight]"
          ),
        className
      )}
      data-orientation={orientation}
      data-slot="tabs-trigger"
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {icon != null ? (
        <span
          aria-hidden="true"
          className="inline-flex shrink-0 items-center justify-center"
          data-slot="tabs-trigger-icon"
        >
          {icon}
        </span>
      ) : null}
      {children}
      {badgeNode != null ? (
        <span
          className="inline-flex shrink-0 items-center"
          data-slot="tabs-trigger-badge"
        >
          {badgeNode}
        </span>
      ) : null}
    </TabsPrimitive.Trigger>
  );
}

/* -------------------------------------------------------------- content ---- */

const tabsContentClass =
  "min-w-0 flex-1 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=inactive]:hidden";

export interface TabsContentProps
  extends React.ComponentProps<typeof TabsPrimitive.Content> {
  /**
   * Keep this panel mounted (hidden) once it has been activated, so its form /
   * scroll state survives a tab switch. Overrides the root's `mount="active"`
   * lazy unmount for this panel only.
   * @default false
   */
  keepMounted?: boolean;
}

/** A panel; its `value` matches a trigger. Only the active panel is shown. */
function TabsContent({
  className,
  children,
  keepMounted = false,
  ...props
}: TabsContentProps) {
  const { mount } = useTabs();

  // Eager root, or an explicit keep-mounted panel: hand Radix `forceMount` so the
  // content node (and its `tabpanel` role / `aria-labelledby`) always exists; Radix
  // toggles `hidden` + `data-state` for visibility. Children render normally.
  if (mount === "eager" || keepMounted) {
    return (
      <TabsPrimitive.Content
        className={cn(tabsContentClass, className)}
        data-slot="tabs-content"
        forceMount
        {...props}
      >
        {children}
      </TabsPrimitive.Content>
    );
  }

  // Default: lazy. Radix only renders the active Content, so the panel mounts on
  // first activation and unmounts when another tab is shown — children pay no
  // render cost until needed. The ARIA wiring is intact whenever the panel exists.
  return (
    <TabsPrimitive.Content
      className={cn(tabsContentClass, className)}
      data-slot="tabs-content"
      {...props}
    >
      {children}
    </TabsPrimitive.Content>
  );
}

/* --------------------------------------------------------- scroll button --- */

export interface TabsScrollButtonProps extends React.ComponentProps<"button"> {
  /** Which end this button pages toward. */
  direction: "start" | "end";
}

/**
 * An opt-in page-forward/back control for an overflowing tablist — a pointer
 * convenience (keyboard + trackpad scroll already work). Place it as a child of
 * `TabsList` so it shares the list context.
 */
// It pages the list by ~80% of its viewport and self-disables (fades out) at the
// reached end, reading the same data-overflow-* attrs the edge fades use.
// aria-hidden + tabIndex=-1: scrolling is fully covered by the keyboard model, so
// this is never a tab stop.
function TabsScrollButton({
  className,
  direction,
  onClick,
  ...props
}: TabsScrollButtonProps) {
  const { orientation } = useTabs();
  const list = React.useContext(TabsListContext);
  const horizontal = orientation === "horizontal";
  const [disabled, setDisabled] = React.useState(true);

  // Mirror the list's reached-end state onto this button's disabled flag.
  React.useEffect(() => {
    const el = list?.listRef.current;
    if (!el) return;
    const attr =
      direction === "start" ? "data-overflow-start" : "data-overflow-end";
    const sync = () => setDisabled(!el.hasAttribute(attr));
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", sync);
      ro.disconnect();
    };
  }, [list, direction]);

  const page = () => {
    const el = list?.listRef.current;
    if (!el) return;
    const amount =
      (horizontal ? el.clientWidth : el.clientHeight) *
      0.8 *
      (direction === "start" ? -1 : 1);
    el.scrollBy(
      horizontal
        ? { left: amount, behavior: "smooth" }
        : { top: amount, behavior: "smooth" }
    );
  };

  const Icon = direction === "start" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      aria-hidden="true"
      tabIndex={-1}
      data-slot="tabs-scroll-button"
      data-direction={direction}
      disabled={disabled}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) page();
      }}
      className={cn(
        "inline-flex size-[var(--garn-control-h-sm)] shrink-0 items-center justify-center self-center rounded-md text-muted-foreground outline-none transition-[color,opacity] hover:text-foreground disabled:pointer-events-none disabled:opacity-0 motion-reduce:transition-none [&_svg]:size-4 [&_svg]:shrink-0",
        !horizontal && "rotate-90",
        className
      )}
      {...props}
    >
      <Icon aria-hidden="true" />
    </button>
  );
}

export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  TabsIndicator,
  TabsScrollButton,
};
