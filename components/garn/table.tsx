"use client";
// #region imports — React, icons, shared hooks, sibling components

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  GripVertical,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useControllableState } from "@/lib/use-controllable-state";
import { useIsomorphicLayoutEffect } from "@/lib/use-isomorphic-layout-effect";
import { useMergedRef } from "@/lib/use-merged-ref";
import { Button } from "@/components/garn/button";
import { Checkbox } from "@/components/garn/checkbox";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/garn/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/garn/select";
import { Skeleton } from "@/components/garn/skeleton";
import { useSortable, type UseSortableReturn } from "@/components/garn/sortable";

// #endregion imports
// #region utils — pin classes, resize constants, width clamp
/* --------------------------------------------------------------- helpers --- */

/** Sticky-column classes for a pinned cell. A pinned cell needs its own opaque
 * surface so the columns scrolling behind it don't show through. A pinned **header**
 * cell uses the header band's own `bg-muted`, so a frozen column's header reads the
 * SAME color as the scrolling columns' header (no lighter pinned patch); a pinned
 * **body** cell uses the frosted-glass surface (`bg-background/80` + `backdrop-blur`,
 * the docs-site navbar treatment) to float over the rows scrolling behind it, and
 * keeps the row's hover/selected highlight. A hairline seam marks the edge; the
 * scroll-aware seam shadow casts from an `::after` overlay (a `<td>`'s own box-shadow
 * is suppressed under `border-collapse: collapse`, but a pseudo-element paints) and
 * fades in only while content is scrolled under the frozen edge. Header cells sit
 * above the sticky header within its stacking context (z-30); body cells are z-10.
 * Seam + inset use logical properties so pinning is RTL-correct; the seam-side
 * padding override gives a tight checkbox column breathing room before the edge. */
function pinClasses(
  pin: "start" | "end" | undefined,
  opts: { header?: boolean }
): string | undefined {
  if (!pin) return undefined;
  return cn(
    // A sticky cell's bg paints over the table's collapsed <tr> border, so the
    // pinned cell carries its own bottom divider (dropped on the last body row to
    // match the tr's border-0 there).
    "sticky border-b border-border",
    // ::after seam-shadow overlay — covers the cell, casts its box-shadow outward
    // (a <td>'s own box-shadow is suppressed by border-collapse, but a pseudo-
    // element paints). The cast var is `none` at rest and the shadow token while
    // content is scrolled under the frozen edge (toggled by the scroll handler).
    "after:pointer-events-none after:absolute after:inset-0 after:content-['']",
    // Only the OUTERMOST pinned cell per edge casts the seam — an inner frozen
    // column's shadow would otherwise bleed under the next frozen column's
    // translucent bg (a spurious seam between two frozen columns). Start's outer
    // edge is the last start-pin (`:has` a later start-pin → inner → suppress);
    // end's outer edge is the first end-pin (preceded by an end-pin → inner →
    // suppress). data-pin is set on every pinned cell, so the sibling checks work.
    pin === "start"
      ? "start-0 border-e border-border [&:has([role=checkbox])]:pr-2 after:[box-shadow:var(--pin-cast-start,none)] [&:has(~[data-pin=start])]:after:[box-shadow:none]"
      : "end-0 border-s border-border [&:has([role=checkbox])]:pl-2 after:[box-shadow:var(--pin-cast-end,none)] [[data-pin=end]~&]:after:[box-shadow:none]",
    // Header pin = the band's own opaque muted (uniform with the non-pinned header
    // cells); body pin = frosted glass over the scrolling rows + hover/selected.
    opts.header
      ? "z-30 bg-muted"
      : "z-10 bg-background/80 backdrop-blur-sm [tbody_tr:last-child_&]:border-b-0 [tr:hover_&]:bg-muted/60 [tr[data-state=selected]_&]:bg-muted"
  );
}

/** Smallest a column may be dragged or keyed to (px). A drawn affordance floor
 * — a column narrower than this can't show its content — not a spacing token. */
const MIN_COLUMN_WIDTH = 80;
/** Keyboard resize step (px); Shift / PageUp·PageDown use the larger step. */
const RESIZE_STEP = 16;
const RESIZE_STEP_LARGE = 64;

/** Clamp a candidate width into `[min, max]` (max optional). */
function clampWidth(width: number, min: number, max?: number): number {
  const bounded = Math.max(Math.max(min, 0), Math.round(width));
  return max !== undefined ? Math.min(max, bounded) : bounded;
}

// #endregion utils
// #region reorder-context — drag-reorder contexts (the drag handle lives in the reorder region)

/** The prop-getters a `reorderable` {@link TableBody} publishes to its rows and
 *  drag handles — sourced from the `sortable` primitive, the drag machine garn
 *  owns. `null` when the body isn't reorderable. */
type TableReorderContextValue = Pick<
  UseSortableReturn,
  "getItemProps" | "getHandleProps"
>;

const TableReorderContext =
  React.createContext<TableReorderContextValue | null>(null);

/** A reorderable {@link TableRow} publishes its key so a nested
 *  {@link TableDragHandle} drives the correct row without the consumer re-passing
 *  `value`. */
const TableRowValueContext = React.createContext<string | null>(null);

// #endregion reorder-context
// #region root — Table scroll container + sticky/pin engine
/* ------------------------------------------------------------ primitives --- */

export interface TableProps extends React.ComponentProps<"table"> {
  /** Local density override; omit to inherit the ambient `[data-density]`. */
  density?: "compact" | "spacious";
  /** Stick the header to the top of the scroll container on vertical scroll. */
  stickyHeader?: boolean;
  /** Stick the footer to the bottom of the scroll container on vertical scroll —
   * for a summary / totals `TableFooter` row that stays visible over a scrolling
   * body. Needs a height-bounded `containerProps.className` to have room to stick,
   * same as `stickyHeader`. */
  stickyFooter?: boolean;
  /** Column-sizing model. `"fixed"` makes a `TableHead`'s `width` govern its
   * column (content truncates instead of widening it) — the substrate column
   * resize needs. Omit for the default content-driven `"auto"` layout. */
  layout?: "auto" | "fixed";
  /** Props for the scrolling wrapper — set `className="max-h-*"` here so a
   * `stickyHeader` has a bounded box to stick within. */
  containerProps?: React.ComponentProps<"div">;
}

/**
 * The root scroll container + `<table>` — owns horizontal/vertical scroll, sticky header/footer, and the pinned-column seam shadows.
 *
 * Documentation: https://garn.ohuba.com/components/table
 */
function Table({
  className,
  density,
  stickyHeader,
  stickyFooter,
  layout,
  containerProps,
  ...props
}: TableProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Track scroll position so a pinned column / the sticky header / the sticky
  // footer reveals its seam shadow only while content is actually scrolled under
  // the frozen edge. The data-attributes are toggled imperatively (no React state)
  // to avoid a re-render per scroll event; group-data selectors on the parts read
  // them. A layout effect (not a passive one) runs the first sync before paint, so
  // an overflowing table doesn't flash its first frame without the seam shadows —
  // via the isomorphic helper so the always-rendered root stays SSR-warning-clean.
  useIsomorphicLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const maxX = el.scrollWidth - el.clientWidth;
      const maxY = el.scrollHeight - el.clientHeight;
      // Distance scrolled from the start edge, direction-agnostic: RTL browsers
      // report scrollLeft as 0 → -maxX (negative model), LTR as 0 → maxX, so the
      // magnitude runs 0 (at start) → maxX (at end) in both. Reading raw
      // scrollLeft would invert the seam shadows under RTL.
      const scrolled = Math.abs(el.scrollLeft);
      // Column seam shadows are cast by a pinned cell's ::after, whose box-shadow
      // reads an inherited var the handler toggles between the shadow token and
      // `none` (a conditional-state + ::after variant doesn't compile in Tailwind,
      // but a var read by `after:[box-shadow:var(--pin-cast-start,none)]` does). The header/footer use
      // a data-attr — group-data works for the non-pseudo thead/tfoot targets.
      el.style.setProperty(
        "--pin-cast-start",
        scrolled > 0 ? "var(--garn-shadow-pin-start)" : "none"
      );
      el.style.setProperty(
        "--pin-cast-end",
        scrolled < maxX - 1 ? "var(--garn-shadow-pin-end)" : "none"
      );
      // Header casts down once content is scrolled up under it; footer casts up
      // while there's still content below it (i.e. not scrolled to the bottom).
      el.toggleAttribute("data-scrolled-top", el.scrollTop > 0);
      el.toggleAttribute("data-scrollable-bottom", el.scrollTop < maxY - 1);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    // Observe BOTH the container and its <table>: the container box is `w-full`
    // and often height-bounded, so content that changes the table's own size
    // (async rows loading in, a wide detail row expanding) never resizes the
    // container and would otherwise leave the pin/scroll shadows stale until the
    // next scroll.
    const observer = new ResizeObserver(update);
    observer.observe(el);
    const table = el.querySelector("table");
    if (table) observer.observe(table);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  const { className: containerClassName, ...containerRest } =
    containerProps ?? {};
  return (
    <div
      {...containerRest}
      ref={containerRef}
      className={cn(
        "group/tbl relative w-full overflow-auto [--pin-cast-end:none] [--pin-cast-start:none]",
        containerClassName
      )}
      data-density={density}
      data-slot="table-container"
    >
      <table
        className={cn(
          "w-full caption-bottom text-sm",
          layout === "fixed" && "table-fixed",
          layout === "auto" && "table-auto",
          stickyHeader &&
            "[&>thead]:sticky [&>thead]:top-0 [&>thead]:z-20 [&>thead]:bg-muted group-data-[scrolled-top]/tbl:[&>thead]:[box-shadow:var(--garn-shadow-pin-bottom,none)]",
          stickyFooter &&
            "[&>tfoot]:sticky [&>tfoot]:bottom-0 [&>tfoot]:z-20 [&>tfoot]:bg-muted group-data-[scrollable-bottom]/tbl:[&>tfoot]:[box-shadow:var(--garn-shadow-pin-top,none)]",
          className
        )}
        data-layout={layout}
        data-slot="table"
        data-sticky-footer={stickyFooter || undefined}
        data-sticky-header={stickyHeader || undefined}
        {...props}
      />
      {/* Full-height resize guideline. A pinned <th>'s grip can't paint past the
       * header, so the line lives here in the positioned container; a resizable
       * header writes its column edge to `--resize-x` and reveals the line (opacity
       * + a `scrollHeight` height, both set imperatively) while the grip is engaged.
       * `top-0` + the measured height span the full scrolled content, so the line
       * stays visible under a sticky header once the body is scrolled. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 z-30 w-0.5 -translate-x-1/2 bg-brand-solid opacity-0 transition-opacity"
        data-slot="table-resize-guide"
        style={{ left: "var(--resize-x, -1px)" }}
      />
    </div>
  );
}

// #endregion root
// #region parts — header/body/footer/row/head/cell/caption structural subcomponents
/** The header band — renders `<thead>` on the muted header surface. */
function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      className={cn("bg-muted/50 [&_tr]:border-b", className)}
      data-slot="table-header"
      {...props}
    />
  );
}

export interface TableBodyProps extends React.ComponentProps<"tbody"> {
  /** Enable drag-to-reorder for the body rows. Each reorderable {@link TableRow}
   *  needs a `value`, and a {@link TableDragHandle} in a leading cell grabs it.
   *  Powered by garn's `sortable` primitive — pointer + keyboard + screen-reader
   *  announcements come free. The order is **controlled**: pass `order` and apply
   *  the next order in `onReorder` (garn reorders the keys, never your row data). */
  reorderable?: boolean;
  /** The body row keys in visual order — the array driving your row `.map`.
   *  Required when `reorderable`. */
  order?: string[];
  /** Fires on drop with the next key order. Apply it to your data. */
  onReorder?: (order: string[]) => void;
}

/** The body rows — renders `<tbody>`; opt into drag-to-reorder with `reorderable` + `order`. */
function TableBody({
  className,
  reorderable = false,
  order,
  onReorder,
  ref,
  ...props
}: TableBodyProps) {
  const innerRef = React.useRef<HTMLTableSectionElement>(null);
  const mergedRef = useMergedRef(ref, innerRef);

  // The drag engine is always instantiated (Rules of Hooks) but idle unless
  // `reorderable`. Controlled by `order`; on drop it reports the next key order for
  // the consumer to apply to their own data — garn owns the drag UI contract, never
  // the row shape.
  const sortable = useSortable({
    value: order,
    onValueChange: (next) => onReorder?.(next),
    disabled: !reorderable,
  });
  const sortableRef = sortable.getContainerProps().ref;
  const bodyRef = React.useCallback(
    (node: HTMLTableSectionElement | null) => {
      mergedRef(node);
      if (reorderable) sortableRef(node);
    },
    [mergedRef, sortableRef, reorderable]
  );

  const reorderCtx = React.useMemo<TableReorderContextValue | null>(
    () =>
      reorderable
        ? {
            getItemProps: sortable.getItemProps,
            getHandleProps: sortable.getHandleProps,
          }
        : null,
    [reorderable, sortable.getItemProps, sortable.getHandleProps]
  );

  React.useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (reorderable && order == null) {
      // eslint-disable-next-line no-console
      console.warn(
        "garn Table: a `reorderable` TableBody needs an `order` prop (the row keys in visual order); without it the drag engine has no order and reorder is inert."
      );
    }
  }, [reorderable, order]);

  // The provider renders unconditionally (value is null when not reorderable) so
  // toggling `reorderable` never changes the tree shape — a conditional wrapper
  // would remount the whole <tbody>, dropping focus / in-cell edit state / scroll.
  return (
    <TableReorderContext.Provider value={reorderCtx}>
      <tbody
        ref={bodyRef}
        className={cn(
          "[&_tr:last-child]:border-0",
          // The sortable engine projects each row's drop slot from its `offsetTop`,
          // which is only measured relative to the <tbody> once the <tbody> is that
          // row's offsetParent — i.e. positioned. Horizontal sticky pins are
          // unaffected: they anchor to the scroll container, not this box.
          reorderable && "relative",
          className
        )}
        data-dragging={(reorderable && sortable.isDragging) || undefined}
        data-reorderable={reorderable || undefined}
        data-slot="table-body"
        {...props}
      />
    </TableReorderContext.Provider>
  );
}

/** The footer band for summary/totals rows — renders `<tfoot>`. */
function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      data-slot="table-footer"
      {...props}
    />
  );
}

export interface TableRowProps extends React.ComponentProps<"tr"> {
  /** The row's stable key when the owning {@link TableBody} is `reorderable` — the
   *  same id you keyed the `.map` and `order` array by. Wires the row into the drag
   *  engine and lets a nested {@link TableDragHandle} grab it. Ignored otherwise. */
  value?: string;
}

/** One row — renders `<tr>` with hover + `data-state="selected"` highlighting; joins the drag engine when the body is `reorderable`. */
function TableRow({ className, value, style, ref, ...props }: TableRowProps) {
  const reorder = React.useContext(TableReorderContext);
  // Reorder wiring: the row keeps its native role="row" — a HANDLE carries the
  // drag, never the row itself (a role="button" on a <tr> would wreck its row
  // semantics, the sortable primitive's documented constraint for semantic rows).
  // So take only the engine's ref + transform + drag data-attrs, never its
  // `data-slot`/role. `value == null` (header/footer/detail rows) → inert.
  const dragProps =
    reorder && value != null
      ? reorder.getItemProps(value, { handle: true })
      : null;
  // `itemRef(value)` is cached per value by the coordinator, so `dragRef` is stable
  // across renders even though `dragProps` is a fresh object each time.
  const dragRef = dragProps?.ref;
  const rowRef = React.useCallback(
    (node: HTMLTableRowElement | null) => {
      if (typeof ref === "function") ref(node);
      else if (ref)
        (ref as React.RefObject<HTMLTableRowElement | null>).current = node;
      dragRef?.(node);
    },
    [ref, dragRef]
  );

  const row = (
    <tr
      ref={rowRef}
      className={cn(
        "border-b hover:bg-state-hover data-[state=selected]:bg-state-selected",
        // Non-reorderable rows keep the plain color transition (hover highlight).
        !reorder && "transition-colors",
        // Reorder feedback: the lifted row rides above its peers on a lifted
        // surface; peers glide to open the gap; the commit frame snaps (no
        // stale-offset animation). Mirrors the List reorder idiom.
        reorder &&
          "data-[dragging]:relative data-[dragging]:z-10 data-[dragging]:bg-card data-[dragging]:shadow-lg not-data-[dragging]:not-data-[dropping]:transition-[transform,color,background-color] not-data-[dragging]:ease-standard not-data-[dragging]:duration-[var(--garn-motion-fast)] motion-reduce:transition-none",
        className
      )}
      data-slot="table-row"
      data-dragging={dragProps?.["data-dragging"]}
      data-dropping={dragProps?.["data-dropping"]}
      data-placeholder={dragProps?.["data-placeholder"]}
      data-drop-edge={dragProps?.["data-drop-edge"]}
      style={dragProps ? { ...style, ...dragProps.style } : style}
      {...props}
    />
  );

  // Publish the row key (or null) so a nested `TableDragHandle` grabs the right
  // row. Rendered unconditionally — a conditional wrapper would remount the <tr>
  // (and its cells) whenever `value` appears/disappears; the handle already guards
  // `value == null`.
  return (
    <TableRowValueContext.Provider value={value ?? null}>
      {row}
    </TableRowValueContext.Provider>
  );
}

/** Sort state of a column header — maps 1:1 onto the `aria-sort` token values. */
export type TableSortDirection = "ascending" | "descending" | "none";

export interface TableHeadProps extends React.ComponentProps<"th"> {
  /**
   * When set, the header becomes sortable: it owns `aria-sort` + `data-sort`
   * and wraps its label in a {@link TableSortButton}. The consumer owns the
   * comparator/data and the tri-state cycle (ascending → descending → none);
   * the header reflects the current direction and fires `onSort`.
   */
  sortDirection?: TableSortDirection;
  /** Fired when the sort control is activated (click / Enter / Space). */
  onSort?: () => void;
  /** Pin this header cell to the start/end edge on horizontal scroll. */
  pin?: "start" | "end";
  /** Controlled column width (px). Needs `Table layout="fixed"` to govern the
   * column; pair with `onResizeEnd` (or the `useColumnResize` hook) to resize. */
  width?: number;
  /**
   * Lower resize bound (px).
   * @default 80
   */
  minWidth?: number;
  /** Upper resize bound (px); unbounded when omitted. */
  maxWidth?: number;
  /** Live width during a drag (per-pixel). Usually omitted — the DOM updates
   * imperatively, so let `onResizeEnd` commit the final value. */
  onResize?: (width: number) => void;
  /** Committed width on pointer release, each keyboard step, and double-click
   * auto-fit. Its presence makes the header resizable (renders a
   * {@link TableColumnResizer} grip). */
  onResizeEnd?: (width: number) => void;
  /** Accessible name for the resize grip when the header label isn't plain text
   * (defaults to the string children, else "column"). */
  resizeLabel?: string;
}

/** A header cell — renders `<th>`; grows a sort button from `sortDirection` and a resize grip from `onResizeEnd`. */
function TableHead({
  className,
  sortDirection,
  onSort,
  pin,
  width,
  minWidth,
  maxWidth,
  onResize,
  onResizeEnd,
  resizeLabel,
  style,
  children,
  "aria-label": ariaLabel,
  ...props
}: TableHeadProps) {
  const sortable = sortDirection !== undefined;
  const resizable = onResize !== undefined || onResizeEnd !== undefined;
  const resizeName =
    resizeLabel ?? (typeof children === "string" ? children : undefined);
  return (
    <th
      // The grip is a slider child; without an explicit name the header's
      // name-from-content would absorb the slider's value ("Name 200"). Pin the
      // header's accessible name to its label when resizable (consumer's own
      // aria-label still wins).
      aria-label={ariaLabel ?? (resizable ? resizeName : undefined)}
      aria-sort={sortable ? sortDirection : undefined}
      className={cn(
        "h-[var(--garn-control-h-md)] px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
        // A non-pinned resizable header needs its own positioning context for the
        // absolute grip; a pinned one is already `sticky` (positioned), so adding
        // `relative` there would fight it.
        resizable && !pin && "relative",
        pinClasses(pin, { header: true }),
        className
      )}
      data-pin={pin}
      data-resizable={resizable || undefined}
      data-slot="table-head"
      data-sort={sortable ? sortDirection : undefined}
      style={{ width, minWidth, maxWidth, ...style }}
      {...props}
    >
      {sortable ? (
        <TableSortButton
          className="flex w-full"
          sortDirection={sortDirection}
          onClick={onSort}
        >
          {children}
        </TableSortButton>
      ) : (
        children
      )}
      {resizable ? (
        <TableColumnResizer
          aria-label={resizeName ? `Resize ${resizeName}` : undefined}
          max={maxWidth}
          min={minWidth}
          onResize={onResize}
          onResizeEnd={onResizeEnd}
          value={width}
        />
      ) : null}
    </th>
  );
}

export interface TableCellProps extends React.ComponentProps<"td"> {
  /** Pin this cell to the start/end edge on horizontal scroll. */
  pin?: "start" | "end";
}

/** A data cell — renders `<td>`; `pin` freezes it to an edge on horizontal scroll. */
function TableCell({ className, pin, ...props }: TableCellProps) {
  return (
    <td
      className={cn(
        "h-[var(--garn-control-h-md)] px-2 align-middle [&:has([role=checkbox])]:pr-0",
        pinClasses(pin, {}),
        className
      )}
      data-pin={pin}
      data-slot="table-cell"
      {...props}
    />
  );
}

/** The table's accessible caption — renders `<caption>` below the table. */
function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      data-slot="table-caption"
      {...props}
    />
  );
}

// #endregion parts
// #region sort — in-cell sort button
/* --------------------------------------------------------- sortable head --- */

export interface TableSortButtonProps extends React.ComponentProps<"button"> {
  /**
   * Current sort direction — picks the trailing glyph and `data-sort`. The host
   * `TableHead` carries the `aria-sort` state.
   * @default "none"
   */
  sortDirection?: TableSortDirection;
}

/**
 * The in-cell sort control — a ghost `Button` (so it inherits garn's focus ring,
 * hover, and icon slot) with the direction glyph in its `trailing` slot.
 * `TableHead` renders this for you when given a `sortDirection`; it's exported
 * for bespoke header layouts. The icon is decorative — `aria-sort` on the `<th>`
 * carries the state for assistive tech.
 */
function TableSortButton({
  className,
  sortDirection = "none",
  children,
  ...props
}: TableSortButtonProps) {
  const Icon =
    sortDirection === "ascending"
      ? ArrowUp
      : sortDirection === "descending"
        ? ArrowDown
        : ChevronsUpDown;
  return (
    <Button
      className={cn(
        "-ms-2 h-[var(--garn-control-h-md)] justify-start text-sm font-medium text-muted-foreground data-[sort=ascending]:text-foreground data-[sort=descending]:text-foreground",
        className
      )}
      data-slot="table-sort-button"
      data-sort={sortDirection}
      size="sm"
      trailing={
        <Icon className={sortDirection === "none" ? "opacity-60" : undefined} />
      }
      type="button"
      variant="ghost"
      {...props}
    >
      {children}
    </Button>
  );
}

// #endregion sort
// #region resize — column-resize grip (slider)
/* -------------------------------------------------------------- resizing --- */

export interface TableColumnResizerProps
  extends Omit<React.ComponentProps<"div">, "onResize"> {
  /** Current committed width (px) — drives `aria-valuenow`; measured from the
   * host header if omitted. */
  value?: number;
  /**
   * Lower resize bound (px).
   * @default 80
   */
  min?: number;
  /** Upper resize bound (px); unbounded when omitted. */
  max?: number;
  /**
   * Keyboard step (px); Shift / PageUp·PageDown use a larger step.
   * @default 16
   */
  step?: number;
  /** Live width while dragging. Also receives a committed keyboard-step /
   * auto-fit width **when `onResizeEnd` is not wired**, so an `onResize`-only
   * consumer still hears those (a pointer drag already streams the final width
   * here). Wire `onResizeEnd` for a dedicated commit callback. */
  onResize?: (width: number) => void;
  /** Committed width on release, each keyboard step, and double-click auto-fit. */
  onResizeEnd?: (width: number) => void;
  /** Whether resizing is disabled — the grip stays rendered but inert (`aria-disabled`). */
  disabled?: boolean;
}

/**
 * The column resize grip — a focusable `role="slider"` on the header's trailing
 * edge. Dragging updates the host `<th>`'s width imperatively (no per-pixel React
 * re-render — the same trick the scroll-shadow handler uses); release / each
 * keyboard step fires `onResizeEnd` so the consumer commits the width. Arrow keys
 * resize (Home/End jump to the bounds) — the WAI-ARIA slider keyboard model; the grip
 * and the column's `aria-sort` are independent, so a header can be sortable AND
 * resizable. Double-click auto-fits the column to its content (a one-shot
 * measurement on the gesture, not a standing measuring context). `TableHead`
 * renders this for you from `onResizeEnd`; it's exported for bespoke headers.
 */
function TableColumnResizer({
  value,
  min = MIN_COLUMN_WIDTH,
  max,
  step = RESIZE_STEP,
  onResize,
  onResizeEnd,
  disabled,
  className,
  "aria-label": ariaLabel = "Resize column",
  ...props
}: TableColumnResizerProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef<{ startX: number; startWidth: number; rtl: boolean; width: number; moved: boolean } | null>(null);
  const hovering = React.useRef(false);

  const hostTh = React.useCallback(
    () => ref.current?.closest("th") as HTMLTableCellElement | null,
    []
  );
  const container = () =>
    ref.current?.closest('[data-slot="table-container"]') as HTMLElement | null;
  // Drive the container's full-height guideline: write the column's trailing edge
  // to `--resize-x` and reveal it (opacity + height) while the grip is engaged.
  const syncGuide = (active: boolean) => {
    const box = container();
    if (!box) return;
    const th = hostTh();
    if (active && th) {
      const x =
        th.getBoundingClientRect().right -
        box.getBoundingClientRect().left +
        box.scrollLeft;
      box.style.setProperty("--resize-x", `${x}px`);
    }
    // Reveal the guide by setting its opacity imperatively (the same imperative
    // idiom as `--resize-x` / the <th> width above). This overrides the base
    // `opacity-0` class and React never resets it (opacity isn't in the style
    // prop); `transition-opacity` still animates the fade. Avoids both the var()
    // -in-opacity quirk and the `:where()` specificity trap of a group variant.
    const guide = box.querySelector(
      '[data-slot="table-resize-guide"]'
    ) as HTMLElement | null;
    if (guide) {
      // Height = the full scrolled content (not `inset-y-0`, which is only the
      // client box anchored at content-top and scrolls out of view under a sticky
      // header). Set on activate so the line spans every row at any scroll offset.
      if (active) guide.style.height = `${box.scrollHeight}px`;
      guide.style.opacity = active ? "1" : "0";
    }
  };
  // A slider must carry aria-valuenow; when the column has no committed `value`
  // yet (fixed-layout auto distribution), measure the rendered header so the
  // control is still valid. Runs once after mount (ref is set) — effects fire
  // post-hydration, so there's no SSR mismatch.
  const [measured, setMeasured] = React.useState<number>();
  React.useLayoutEffect(() => {
    if (value !== undefined) return;
    const th = hostTh();
    if (th) setMeasured(Math.round(th.getBoundingClientRect().width));
  }, [value, hostTh]);
  // Keyboard/aria need a current width: prefer the committed `value`, else the
  // rendered header box (works before the column has ever been resized).
  const currentWidth = () => {
    if (value !== undefined) return value;
    const th = hostTh();
    return th ? Math.round(th.getBoundingClientRect().width) : min;
  };
  const setHostWidth = (width: number) => {
    const th = hostTh();
    if (th) th.style.width = `${width}px`;
  };
  // Imperative-during-drag, commit-on-release: write the DOM directly here, then
  // hand the clamped value to the consumer to commit (the controlled boundary).
  const commit = (width: number) => {
    const next = clampWidth(width, min, max);
    setHostWidth(next);
    syncGuide(true); // keep the guideline on the (now moved) column edge
    // In imperative/uncontrolled mode the consumer doesn't feed `width` back, so
    // the slider's aria-valuenow would stay frozen at its mount measurement.
    // Advance `measured` to the committed width so screen readers announce the
    // real value after each keyboard step / drag release.
    if (value === undefined) setMeasured(next);
    // A keyboard step / auto-fit is a discrete commit with no live stream before
    // it (unlike a pointer drag, which streams `onResize` from onPointerMove).
    // Notify `onResizeEnd`; if the consumer wired only `onResize` (the grip renders
    // for it alone), deliver the committed width there instead — so keyboard /
    // auto-fit changes aren't silently dropped. A both-wired consumer is unchanged.
    (onResizeEnd ?? onResize)?.(next);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation(); // never bubble to the column's sort button
    const th = hostTh();
    const rtl = !!th && getComputedStyle(th).direction === "rtl";
    drag.current = {
      startX: event.clientX,
      startWidth: th ? th.getBoundingClientRect().width : currentWidth(),
      rtl,
      width: currentWidth(),
      moved: false,
    };
    // setPointerCapture is missing in some environments (and can throw on stale ids) —
    // capture is a nicety, never load-bearing, so guard it.
    try {
      ref.current?.setPointerCapture(event.pointerId);
    } catch {
      /* no pointer capture available */
    }
    ref.current?.toggleAttribute("data-resizing", true);
    syncGuide(true);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state) return;
    const delta = (event.clientX - state.startX) * (state.rtl ? -1 : 1);
    const next = clampWidth(state.startWidth + delta, min, max);
    state.width = next;
    state.moved = true;
    setHostWidth(next); // no re-render mid-drag
    syncGuide(true); // guideline tracks the live edge
    onResize?.(next);
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state) return;
    drag.current = null;
    try {
      ref.current?.releasePointerCapture(event.pointerId);
    } catch {
      /* no pointer capture to release */
    }
    ref.current?.toggleAttribute("data-resizing", false);
    syncGuide(hovering.current); // keep it only if still hovering the grip
    // Only commit when the pointer actually moved: a bare click on the grip (and
    // the two down/up pairs a double-click auto-fit fires before onDoubleClick)
    // must not each fire an unclamped onResizeEnd. Route the final width through
    // the clamp, like the keyboard path.
    if (state.moved) {
      const next = clampWidth(state.width, min, max);
      if (value === undefined) setMeasured(next);
      onResizeEnd?.(next);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const big = event.shiftKey ? RESIZE_STEP_LARGE : step;
    const width = currentWidth();
    switch (event.key) {
      case "ArrowRight":
      case "ArrowUp":
        event.preventDefault();
        commit(width + big);
        break;
      case "ArrowLeft":
      case "ArrowDown":
        event.preventDefault();
        commit(width - big);
        break;
      case "PageUp":
        event.preventDefault();
        commit(width + RESIZE_STEP_LARGE);
        break;
      case "PageDown":
        event.preventDefault();
        commit(width - RESIZE_STEP_LARGE);
        break;
      case "Home":
        event.preventDefault();
        commit(min);
        break;
      case "End":
        if (max !== undefined) {
          event.preventDefault();
          commit(max);
        }
        break;
    }
  };

  // Auto-fit: collapse the column so its cells overflow, read the widest cell's
  // scrollWidth (content + padding), restore, then commit the clamped fit.
  const onDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    event.stopPropagation();
    const th = hostTh();
    const table = th?.closest("table");
    if (!th || !table) return;
    const column = th.cellIndex;
    const previous = th.style.width;
    th.style.width = "0px"; // force overflow so scrollWidth reflects content
    let widest = 0;
    for (const row of Array.from(table.rows)) {
      const cell = row.cells.item(column);
      // Skip full-width spanning cells (TableEmpty / TableExpandedRow): a
      // `colSpan` cell isn't part of a single column, and its scrollWidth is the
      // whole table's width — measuring it would blow the fit up to the full width.
      if (cell?.colSpan !== 1) continue;
      // Force single-line for the read: at width 0 an un-truncated cell (TableCell
      // doesn't nowrap) would wrap, so scrollWidth would report the widest *word*,
      // not the natural single-line content — snapping the fit to the min clamp.
      const prevWhiteSpace = cell.style.whiteSpace;
      cell.style.whiteSpace = "nowrap";
      widest = Math.max(widest, cell.scrollWidth);
      cell.style.whiteSpace = prevWhiteSpace;
    }
    th.style.width = previous;
    commit(widest);
  };

  return (
    <div
      ref={ref}
      aria-label={ariaLabel}
      aria-orientation="horizontal"
      aria-valuemax={max}
      aria-valuemin={min}
      // A slider must always carry a numeric aria-valuenow; fall back to the min
      // so the control is valid even before the mount measurement lands (or when
      // used outside a <th>, where there's no host box to measure).
      aria-valuenow={value ?? measured ?? min}
      // Column width is usually open-ended (no `max`), where a screen reader's
      // computed min→max percentage is meaningless (and inverts, since the ARIA
      // default max of 100 falls below `min`). Announce the pixel width instead.
      aria-valuetext={`${value ?? measured ?? min}px`}
      className={cn(
        // A slim grip straddling the column's trailing edge (logical `-me-1` keeps
        // it RTL-correct); full-height hit area, touch-safe, with a focus ring.
        "group/resizer absolute inset-y-0 end-0 -me-1 z-10 flex w-2 cursor-col-resize touch-none select-none items-stretch justify-center outline-hidden focus-visible:outline-hidden",
        className
      )}
      data-slot="table-column-resizer"
      onBlur={() => {
        if (!drag.current && !hovering.current) syncGuide(false);
      }}
      onDoubleClick={onDoubleClick}
      onFocus={() => {
        if (!disabled) syncGuide(true);
      }}
      onKeyDown={onKeyDown}
      onPointerCancel={endDrag}
      onPointerDown={onPointerDown}
      onPointerEnter={() => {
        hovering.current = true;
        if (!disabled) syncGuide(true);
      }}
      onPointerLeave={() => {
        hovering.current = false;
        if (!drag.current) syncGuide(false);
      }}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      {...props}
    >
      {/* The rest-state seam: a faint divider marking the column as resizable; the
       * full-height bg-brand-solid guideline (in the container) is the hover/drag/focus
       * highlight. */}
      <span
        aria-hidden="true"
        className="pointer-events-none w-px bg-border"
        data-slot="table-column-resizer-grip"
      />
    </div>
  );
}

// #endregion resize
// #region state-hooks — batched-update helper for the liftable state hooks
/* --------------------------------------------------------------- state --- */

// The shared `useControllableState` exposes only a value-setter, so a mutator that
// derives from the render-closure `state` (`const next = new Set(state); …`) loses
// all but the last write when several run in one React batch — a shift-range select
// looping `toggle` per id, or two `setWidth`s in one handler, would keep only the
// last. This mirrors the live state in a ref advanced synchronously per call, so
// each update in a tick composes on the previous one; onChange still fires per call
// with the composed value, and a single update is identical to before.
function useBatchedState<T>(
  state: T,
  setState: (next: T) => void
): (updater: (prev: T) => T) => void {
  const latest = React.useRef(state);
  // Re-sync to the committed state in a COMMIT-phase effect, not the render body:
  // a ref written during render can capture a value from a render that concurrent
  // React later discards (a `startTransition` update), leaving `latest` stale for
  // the next update. The setter still advances `latest` synchronously so a batch
  // composes; this effect only re-anchors it to what actually committed.
  React.useLayoutEffect(() => {
    latest.current = state;
  });
  return React.useCallback(
    (updater: (prev: T) => T) => {
      const next = updater(latest.current);
      latest.current = next;
      setState(next);
    },
    [setState]
  );
}

// #endregion state-hooks
// #region use-column-resize — liftable column-width state hook
export interface UseColumnResizeOptions {
  /** Uncontrolled initial widths (px), keyed by column id. */
  defaultWidths?: Record<string, number>;
  /** Controlled widths (px), keyed by column id. */
  widths?: Record<string, number>;
  onWidthsChange?: (widths: Record<string, number>) => void;
  /** Bounds applied by `setWidth` and spread onto each column. */
  min?: number;
  max?: number;
}

export interface ColumnResize {
  widths: Record<string, number>;
  /** Set one column's width (clamped to `[min, max]`). */
  setWidth: (id: string, width: number) => void;
  /** Clear a column's width — or all, with no id — back to the layout default. */
  reset: (id?: string) => void;
  /** Spread onto a `TableHead` to make it resizable + controlled. */
  column: (id: string) => {
    width: number | undefined;
    minWidth: number;
    maxWidth: number | undefined;
    onResizeEnd: (width: number) => void;
  };
}

/**
 * The liftable column-width state — the resize analogue of `useTableSelection`.
 * `column(id)` spreads the controlled width + bounds + commit handler onto a
 * `TableHead`; the cells stay controlled, so this also composes with a headless
 * table lib or hand-rolled width state. Commits land via `onResizeEnd` (once per
 * release / keypress), so widths never re-render per drag pixel.
 */
function useColumnResize(options: UseColumnResizeOptions = {}): ColumnResize {
  const {
    defaultWidths,
    widths,
    onWidthsChange,
    min = MIN_COLUMN_WIDTH,
    max,
  } = options;
  const [state, setState] = useControllableState<Record<string, number>>({
    value: widths,
    defaultValue: defaultWidths ?? {},
    onChange: onWidthsChange,
  });
  const update = useBatchedState(state, setState);

  const setWidth = (id: string, width: number) =>
    update((prev) => ({ ...prev, [id]: clampWidth(width, min, max) }));

  return {
    widths: state,
    setWidth,
    reset: (id) =>
      update((prev) => {
        if (id === undefined) return {};
        const next = { ...prev };
        delete next[id];
        return next;
      }),
    column: (id) => ({
      width: state[id],
      minWidth: min,
      maxWidth: max,
      onResizeEnd: (width) => setWidth(id, width),
    }),
  };
}

// #endregion use-column-resize
// #region use-table-selection — liftable selection state hook
/* ------------------------------------------------------------- selection --- */

export type TableRowId = string | number;

export interface UseTableSelectionOptions<Id extends TableRowId = string> {
  /** The selectable ids on the current page — drives select-all / indeterminate. */
  rowIds?: Id[];
  /** Controlled selection. */
  selected?: Set<Id>;
  /** Uncontrolled initial selection. */
  defaultSelected?: Iterable<Id>;
  onSelectionChange?: (selected: Set<Id>) => void;
}

export interface TableSelection<Id extends TableRowId = string> {
  selected: Set<Id>;
  isSelected: (id: Id) => boolean;
  toggle: (id: Id) => void;
  /**
   * Range-select from the last individually-toggled row (the anchor) to `id`,
   * inclusive — Gmail/Finder shift-click. Every row in the contiguous `rowIds`
   * span is set to the anchor's current state (selected → select the range;
   * deselected → clear it); the anchor is unchanged so the range can be regrown.
   * With no valid anchor on the page it falls back to a single {@link toggle}.
   */
  toggleRange: (id: Id) => void;
  /** Select all `rowIds` if not all selected; otherwise deselect them. */
  toggleAll: () => void;
  isAllSelected: boolean;
  isSomeSelected: boolean;
  clear: () => void;
  count: number;
}

/**
 * The liftable selection state. Returns `count` + `clear`, which drop straight
 * into app-shell's `<AppShellSelectionBar count={…} onClear={…}>`. Cells stay
 * controlled, so this also composes with a headless table lib or hand-rolled state.
 */
function useTableSelection<Id extends TableRowId = string>(
  options: UseTableSelectionOptions<Id> = {}
): TableSelection<Id> {
  const { rowIds, selected, defaultSelected, onSelectionChange } = options;
  const [state, setState] = useControllableState<Set<Id>>({
    value: selected,
    defaultValue: new Set(defaultSelected),
    onChange: onSelectionChange,
  });
  const update = useBatchedState(state, setState);
  // Shift-range state (refs — they steer the next range without a re-render):
  // `anchor` = the last row toggled on its own; `snapshot` = the selection AT that
  // moment. A shift-click REBUILDS from the snapshot (not the live state) so a
  // shrunk/reversed range deselects the rows that fell outside it — the Gmail/
  // Finder contract.
  const anchor = React.useRef<Id | null>(null);
  const snapshot = React.useRef<Set<Id>>(new Set());

  const toggleOne = (id: Id) =>
    update((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      anchor.current = id; // this row becomes the anchor for a later shift-click
      snapshot.current = next; // …and the baseline that range rebuilds from
      return next;
    });

  const ids = rowIds ?? [];
  const isAllSelected = ids.length > 0 && ids.every((id) => state.has(id));
  const isSomeSelected = !isAllSelected && ids.some((id) => state.has(id));

  return {
    selected: state,
    count: state.size,
    isAllSelected,
    isSomeSelected,
    isSelected: (id) => state.has(id),
    toggle: toggleOne,
    toggleRange: (id) => {
      const from = anchor.current;
      const a = from == null ? -1 : ids.indexOf(from);
      const b = ids.indexOf(id);
      // No valid anchor/target on the page → behave like a plain toggle.
      if (a === -1 || b === -1) {
        toggleOne(id);
        return;
      }
      const [lo, hi] = a <= b ? [a, b] : [b, a];
      update(() => {
        // Rebuild from the anchor-time snapshot, then set the current span to the
        // anchor's state. Rebuilding (vs mutating the live selection) is what lets a
        // narrowed or reversed range clear the rows now outside it.
        const base = snapshot.current;
        const select = from != null && base.has(from);
        const next = new Set(base);
        for (let i = lo; i <= hi; i++) {
          const rid = ids[i]!;
          if (select) next.add(rid);
          else next.delete(rid);
        }
        return next;
      });
    },
    toggleAll: () => {
      anchor.current = null; // a bulk change ends the current range anchor
      update((prev) => {
        // Recompute against `prev` (not the render-closure `isAllSelected`) so a
        // select-all batched after another change still reads the live state.
        const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
        const next = new Set(prev);
        for (const id of ids) {
          if (allSelected) next.delete(id);
          else next.add(id);
        }
        return next;
      });
    },
    clear: () => {
      anchor.current = null;
      update(() => new Set());
    },
  };
}

// #endregion use-table-selection
// #region selection-cells — per-row + select-all checkbox cells
export interface TableSelectionCellProps
  extends Omit<TableCellProps, "children"> {
  /** Whether this row is selected. */
  checked: boolean;
  /** Fires with the next checked state on a plain (modifier-free) toggle. */
  onCheckedChange?: (checked: boolean) => void;
  /** Row label for a distinct accessible name — the checkbox is named
   *  "Select {label}" (e.g. the row's primary text), so screen-reader users don't
   *  hear N identical "Select row" controls. An explicit `aria-label` still wins;
   *  omitting both keeps the generic "Select row". Mirrors {@link TableExpandToggle}. */
  label?: string;
  /**
   * Called instead of {@link onCheckedChange} when the checkbox is activated with
   * **Shift held** — wire it to a range selector (e.g. `useTableSelection`'s
   * `toggleRange(id)`) for Gmail/Finder contiguous selection. Works for both
   * Shift+click and Shift+Space (keyboard-accessible range select); the plain
   * toggle remains the modifier-free path.
   */
  onRangeChange?: (checked: boolean) => void;
}

/**
 * A per-row selection checkbox cell. Pair with `data-state="selected"` on the
 * owning `TableRow` for the selected-row highlight.
 */
function TableSelectionCell({
  checked,
  onCheckedChange,
  onRangeChange,
  label,
  className,
  "aria-label": ariaLabel,
  ...props
}: TableSelectionCellProps) {
  // Explicit aria-label wins; else derive a distinct name from `label`; else the
  // generic fallback (matches the pre-`label` default).
  const name = ariaLabel ?? (label ? `Select ${label}` : "Select row");
  // Radix's onCheckedChange carries no event, so capture the shift modifier from
  // the click (Radix composes our onClick before its own toggle handler) and read
  // it when the change fires. mousedown preventDefault kills the text-selection a
  // shift-click would otherwise start across rows.
  const shift = React.useRef(false);
  return (
    <TableCell className={cn("w-0", className)} data-slot="table-selection-cell" {...props}>
      <Checkbox
        aria-label={name}
        checked={checked}
        onCheckedChange={(value) => {
          const next = value === true;
          if (shift.current && onRangeChange) onRangeChange(next);
          else onCheckedChange?.(next);
          shift.current = false;
        }}
        onClick={(event) => {
          shift.current = event.shiftKey;
          // The mousedown preventDefault (below) suppressed the checkbox's own
          // focus; restore it so a follow-up Space still toggles THIS row.
          if (event.shiftKey) event.currentTarget.focus();
        }}
        onMouseDown={(event) => {
          if (event.shiftKey) event.preventDefault();
        }}
      />
    </TableCell>
  );
}

export interface TableSelectAllCellProps
  extends Omit<TableHeadProps, "children" | "sortDirection" | "onSort"> {
  /** The all-rows state; `"indeterminate"` when some but not all rows are selected. */
  checked: boolean | "indeterminate";
  /** Fires `true` to select all rows on the page, `false` to clear. */
  onCheckedChange?: (checked: boolean) => void;
}

/**
 * The header select-all checkbox — a `TableHead` with a checkbox. Pass
 * `"indeterminate"` for the some-but-not-all state (renders as a dash); Radix
 * maps it to `aria-checked="mixed"`.
 */
function TableSelectAllCell({
  checked,
  onCheckedChange,
  className,
  "aria-label": ariaLabel = "Select all",
  ...props
}: TableSelectAllCellProps) {
  return (
    <TableHead className={cn("w-0", className)} data-slot="table-select-all" {...props}>
      <Checkbox
        aria-label={ariaLabel}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange?.(value === true)}
      />
    </TableHead>
  );
}

// #endregion selection-cells
// #region use-table-expansion — liftable expandable-row state hook
/* ------------------------------------------------------------- expansion --- */

export interface UseTableExpansionOptions<Id extends TableRowId = string> {
  /** The expandable ids on the current page — drives expand-all / isAllExpanded. */
  expandableRowIds?: Id[];
  /** Controlled expanded set. */
  expanded?: Set<Id>;
  /** Uncontrolled initial expanded set. */
  defaultExpanded?: Iterable<Id>;
  onExpandedChange?: (expanded: Set<Id>) => void;
  /** Allow more than one row open at once. Default **false** (accordion: opening
   * a row closes the previously-open one). */
  allowMultiple?: boolean;
  /** Guard which ids may open — a row with no detail returns `false`, so its
   * toggle is inert (and it's excluded from expand-all). Omit to let every id expand. */
  expandable?: (id: Id) => boolean;
}

export interface TableExpansion<Id extends TableRowId = string> {
  expanded: Set<Id>;
  isExpanded: (id: Id) => boolean;
  toggle: (id: Id) => void;
  /** Expand every expandable row on the page. */
  expandAll: () => void;
  /** Collapse every expandable row on the page (leaves off-page ids untouched). */
  collapseAll: () => void;
  isAllExpanded: boolean;
  /** Collapse everything, including off-page ids. */
  clear: () => void;
  count: number;
}

/**
 * The liftable expandable-row state — the disclosure analogue of
 * `useTableSelection`, with the same controlled/uncontrolled contract and the
 * same page-scoped all-toggle math (`expandableRowIds` : `rowIds`), so it lifts
 * and composes the same way. Rows stay controlled (each `TableExpandToggle`
 * reads `isExpanded`; the consumer renders each detail row), so this also drives
 * a headless table lib or hand-rolled expansion state.
 */
function useTableExpansion<Id extends TableRowId = string>(
  options: UseTableExpansionOptions<Id> = {}
): TableExpansion<Id> {
  const {
    expandableRowIds,
    expanded,
    defaultExpanded,
    onExpandedChange,
    allowMultiple = false,
    expandable,
  } = options;
  const [state, setState] = useControllableState<Set<Id>>({
    value: expanded,
    defaultValue: new Set(defaultExpanded),
    onChange: onExpandedChange,
  });
  const update = useBatchedState(state, setState);

  const canExpand = (id: Id) => (expandable ? expandable(id) : true);
  const rawIds = expandableRowIds ?? [];
  // Predicate gates OPENING (and the all-calc), not the raw row set.
  const ids = rawIds.filter(canExpand);
  const isAllExpanded = ids.length > 0 && ids.every((id) => state.has(id));

  return {
    expanded: state,
    count: state.size,
    isAllExpanded,
    isExpanded: (id) => state.has(id),
    toggle: (id) => {
      if (!canExpand(id)) return;
      update((prev) => {
        // Accordion (default): opening a row starts from an empty set, so the
        // previously-open row closes; `allowMultiple` clones the set to keep it.
        const next = new Set<Id>(allowMultiple ? prev : []);
        if (prev.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    // expand/collapse-all are explicit bulk gestures over the current page's rows;
    // the accordion constraint governs only the per-row toggle.
    expandAll: () =>
      update((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.add(id); // opening → predicate-gated ids
        return next;
      }),
    collapseAll: () =>
      update((prev) => {
        const next = new Set(prev);
        // Collapse over the RAW ids (not predicate-filtered): a row that was open
        // when `expandable(id)` was true but has since flipped false must still be
        // collapsible via the bulk gesture, not stuck open.
        for (const id of rawIds) next.delete(id);
        return next;
      }),
    clear: () => update(() => new Set()),
  };
}

// #endregion use-table-expansion
// #region expansion-parts — expand toggle, expand-all header cell, detail row
/* ------------------------------------------------------ expandable rows --- */

export interface TableExpandToggleProps
  extends Omit<React.ComponentProps<typeof Button>, "children"> {
  /** Whether this row's detail is open — drives `aria-expanded` + chevron rotation. */
  expanded: boolean;
  /** `id` of the {@link TableExpandedRow} this controls — wires `aria-controls`
   * while the detail row is mounted. */
  controls?: string;
  /** Row-identifying text for the accessible name ("Expand details for {label}"). */
  label?: string;
}

/**
 * The per-row disclosure control: a chevron ghost `Button` for the row's leading
 * cell (the APG Disclosure pattern — a native `<button>`, so Enter/Space come free,
 * no roving tabindex). It owns `aria-expanded` + `aria-controls`.
 *
 * HARD RULE: the expanded state lives on the BUTTON, never the `<tr>`. A row's own
 * `aria-expanded` is the treegrid parent-node signal; keeping it off the row is
 * exactly what keeps this a disclosure over a native role="table" rather than a
 * treegrid (which would drag in aria-level/posinset/setsize + the arrow-key
 * composite-widget model). `aria-controls` points at the detail row only while
 * it's mounted (it renders on demand), so the reference never dangles.
 */
function TableExpandToggle({
  expanded,
  controls,
  label,
  className,
  "aria-label": ariaLabel,
  ...props
}: TableExpandToggleProps) {
  return (
    <Button
      aria-controls={expanded ? controls : undefined}
      aria-expanded={expanded}
      aria-label={
        ariaLabel ??
        `${expanded ? "Collapse" : "Expand"} details${label ? ` for ${label}` : ""}`
      }
      className={cn("text-muted-foreground", className)}
      data-slot="table-expand-toggle"
      data-state={expanded ? "open" : "closed"}
      size="icon-sm"
      type="button"
      variant="ghost"
      {...props}
    >
      {/* Chevron points → at rest, rotates to ▼ on open. The transition is a
       * control-speed token; the library-wide reduced-motion guard collapses it. */}
      <ChevronRight
        className={cn(
          "transition-transform duration-[var(--garn-motion-fast)]",
          expanded && "rotate-90"
        )}
      />
    </Button>
  );
}

export interface TableExpandAllCellProps
  extends Omit<TableHeadProps, "children" | "sortDirection" | "onSort"> {
  /** Whether every expandable row is open (from the hook's `isAllExpanded`). */
  expanded: boolean;
  /** Toggle all — wire to `expandAll` / `collapseAll`. */
  onToggle?: () => void;
}

/**
 * The header expand-all control — a `TableHead` holding an expand/collapse-all
 * toggle, the disclosure analogue of `TableSelectAllCell`. Meant for
 * `allowMultiple` tables; drive it from `isAllExpanded` + `expandAll`/`collapseAll`.
 * It controls many rows, so it carries no `aria-controls`.
 */
function TableExpandAllCell({
  expanded,
  onToggle,
  className,
  ...props
}: TableExpandAllCellProps) {
  return (
    <TableHead
      className={cn("w-0", className)}
      data-slot="table-expand-all"
      {...props}
    >
      <TableExpandToggle
        aria-label={expanded ? "Collapse all rows" : "Expand all rows"}
        expanded={expanded}
        onClick={onToggle}
      />
    </TableHead>
  );
}

export interface TableExpandedRowProps extends React.ComponentProps<"tr"> {
  /** Columns to span — usually your visible column count (explicit, like {@link TableEmpty}). */
  colSpan: number;
  /**
   * Opt into a **symmetric** open/close animation. Omit it (the default) and the
   * consumer conditionally renders the row — it animates open, and closing is an
   * instant unmount. **Provide `open`** and always render the row instead
   * (`<TableExpandedRow open={isExpanded(id)} …>`): the part manages its own
   * presence, staying mounted through the collapse so it animates *both* ways,
   * unmounting only once the close transition settles.
   */
  open?: boolean;
  /** Props for the inner detail `<td>` (e.g. a padding or background override). */
  cellProps?: React.ComponentProps<"td">;
}

// Parse a CSS transition-duration ("0.2s" / "200ms" / "0.01ms") to milliseconds.
function durationToMs(value: string): number {
  const v = (value.split(",")[0] ?? "").trim();
  if (v.endsWith("ms")) return Number.parseFloat(v) || 0;
  if (v.endsWith("s")) return (Number.parseFloat(v) || 0) * 1000;
  return 0;
}

/**
 * The detail panel: one full-width `<tr><td colSpan>` of arbitrary content. Its
 * `id` matches the toggle's `aria-controls`. The row stays `display: table-row`
 * (never `block`, which would break table semantics).
 *
 * A `<tr>`/`<td>` can't take a height transition (table display), so the motion runs
 * on an inner GRID wrapper — `grid-template-rows` animates 0fr↔1fr, clipping an
 * `overflow-hidden` child — not the row box. `@starting-style` supplies the entry
 * keyframe so the RESTING state is open (no JS/SSR flash on mount); it degrades to
 * an instant reveal without transition support or under the reduced-motion guard.
 *
 * Two presence modes:
 * - **uncontrolled (no `open`)** — the consumer conditionally renders; enter
 *   animates, exit is an instant unmount.
 * - **controlled (`open` set)** — the row stays mounted through the close so it
 *   animates BOTH ways, unmounting via a TIMER once the collapse settles (a reopen
 *   mid-close cancels the pending unmount). The consumer always renders it.
 *
 * Full width means it can't itself host pinned frozen columns — it scrolls with
 * the body (the toggle's own leading cell can still `pin`).
 */
function TableExpandedRow({
  open,
  colSpan,
  cellProps,
  className,
  children,
  ...props
}: TableExpandedRowProps) {
  const controlled = open !== undefined;
  // Presence: mounted while open, and kept mounted through the close transition.
  const [present, setPresent] = React.useState(!controlled || open === true);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  // Unmount is driven by a TIMER, not `transitionend`: browsers don't reliably
  // fire `transitionend` for a `grid-template-rows` transition (it can leave the
  // collapsed row stuck in the DOM). The delay is read off the element, so it
  // tracks `--garn-motion-fast` and the library-wide reduced-motion guard; a
  // reopen mid-close re-runs this effect and clears the pending unmount.
  // A LAYOUT effect (not passive): the open→mount flip must land before paint so
  // the toggle's `aria-controls` never points at a not-yet-inserted row for a
  // frame; it also reads the just-committed transition-duration in the same phase.
  React.useLayoutEffect(() => {
    if (!controlled) return;
    if (open) {
      setPresent(true);
      return;
    }
    const el = wrapperRef.current;
    const ms = el ? durationToMs(getComputedStyle(el).transitionDuration) : 0;
    const timer = setTimeout(() => setPresent(false), ms + 30);
    return () => clearTimeout(timer);
  }, [open, controlled]);

  if (controlled && !present) return null;

  const isOpen = open ?? true;
  const { className: cellClassName, ...cellRest } = cellProps ?? {};
  return (
    <tr
      className={cn("border-b", className)}
      data-slot="table-expanded-row"
      data-state={isOpen ? "open" : "closed"}
      {...props}
    >
      <td
        className={cn("p-0", cellClassName)}
        colSpan={colSpan}
        {...cellRest}
      >
        <div
          ref={wrapperRef}
          className={cn(
            "grid transition-[grid-template-rows] duration-[var(--garn-motion-fast)] ease-standard starting:grid-rows-[0fr]",
            isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          <div className="min-h-0 overflow-hidden">
            {/* Content padding sits on the innermost (clipped) box so it
             * animates with the reveal; `px-2` aligns the panel's inset with the
             * data cells (which are `px-2` too). The fill is the panel's own
             * slot — a detail sheet that wants to sit closer to (or further
             * from) the row above it restyles this, not the row. */}
            <div className="bg-muted/30 px-2 py-2" data-slot="table-expanded-panel">
              {children}
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

// #endregion expansion-parts
// #region reorder — the row drag handle (contexts live in the reorder-context region)
/* -------------------------------------------------------------- drag handle -- */

export interface TableDragHandleProps
  extends Omit<React.ComponentProps<typeof Button>, "value"> {
  /** Row key to grab. Omit inside a `TableRow value=…` (read from context); pass
   *  it explicitly only when rendering the handle outside a `TableRow`. */
  value?: string;
  /** Accessible name for the icon-only grip. */
  label?: string;
}

/**
 * The grip that drags a row when its {@link TableBody} is `reorderable`. Drop it
 * into a leading {@link TableCell}; ONLY the handle starts a drag, so the row keeps
 * its native `role="row"` and row clicks / selection / expansion stay intact (a
 * `role="button"` on a `<tr>` would break table semantics — the sortable
 * primitive's constraint for semantic rows). Space/Enter lift, ↑/↓ move,
 * Enter/Space drop, Esc cancels, with live-region announcements — all from
 * `sortable`. Renders nothing when the table isn't reorderable or no row `value` is
 * in scope.
 */
function TableDragHandle({
  value: valueProp,
  label = "Drag to reorder row",
  className,
  onPointerDown,
  onKeyDown,
  ...props
}: TableDragHandleProps) {
  const reorder = React.useContext(TableReorderContext);
  const rowValue = React.useContext(TableRowValueContext);
  const value = valueProp ?? rowValue;
  if (!reorder || value == null) return null;
  const handleProps = reorder.getHandleProps(value, { label });
  return (
    <Button
      // Residual consumer props first — the drag wiring below must not be
      // clobbered by a consumer's spread; their handlers compose instead.
      {...props}
      {...handleProps}
      onPointerDown={(e) => {
        onPointerDown?.(e);
        if (!e.defaultPrevented) handleProps.onPointerDown?.(e);
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (!e.defaultPrevented) handleProps.onKeyDown?.(e);
      }}
      className={cn("cursor-grab text-muted-foreground", className)}
      data-slot="table-drag-handle"
      size="icon-sm"
      type="button"
      variant="ghost"
    >
      <GripVertical aria-hidden />
    </Button>
  );
}

// #endregion reorder
// #region empty — full-width empty-state row
/* -------------------------------------------------------- empty / loading --- */

export interface TableEmptyProps extends React.ComponentProps<"td"> {
  /** Number of columns to span — usually your column count. */
  colSpan: number;
}

/**
 * A full-width empty-state row. Drop a plain message in, or nest garn `Empty`
 * for the rich icon/title/action version.
 */
function TableEmpty({ colSpan, className, children, ...props }: TableEmptyProps) {
  return (
    <TableRow className="hover:bg-transparent" data-slot="table-empty">
      <TableCell
        className={cn("h-24 text-center align-middle text-muted-foreground", className)}
        colSpan={colSpan}
        {...props}
      >
        {children}
      </TableCell>
    </TableRow>
  );
}

// #endregion empty
// #region skeleton — loading placeholder rows
export interface TableSkeletonRowsProps extends React.ComponentProps<"tr"> {
  /** How many placeholder rows to render. */
  rows?: number;
  /** How many cells per row — match your column count. */
  columns: number;
  /** Class applied to each cell's Skeleton bar. */
  cellClassName?: string;
}

/**
 * Loading placeholder rows. Marked aria-hidden so screen readers skip the
 * skeletons — set `aria-busy` on the surrounding region while loading.
 */
function TableSkeletonRows({
  rows = 5,
  columns,
  cellClassName,
  className,
  ...props
}: TableSkeletonRowsProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow
          // biome-ignore lint/suspicious/noArrayIndexKey: generated decorative skeleton rows (aria-hidden) — index IS the identity
          key={rowIndex}
          aria-hidden="true"
          className={cn("hover:bg-transparent", className)}
          data-slot="table-skeleton-row"
          {...props}
        >
          {Array.from({ length: columns }).map((_, cellIndex) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: generated decorative skeleton cells (aria-hidden) — index IS the identity
            <TableCell key={cellIndex}>
              <Skeleton className={cn("h-4 w-full", cellClassName)} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// #endregion skeleton
// #region pagination — data-table footer (paging + rows-per-page)
/* ------------------------------------------------------------ pagination --- */

export interface TablePaginationProps
  extends Omit<React.ComponentProps<"div">, "onChange"> {
  /** Current page, 1-based. */
  page: number;
  /** Total number of pages. */
  pageCount: number;
  /** Fires with the next 1-based page on prev/next/first/last. */
  onPageChange: (page: number) => void;
  /** Current rows-per-page; enables the rows-per-page Select with `pageSizeOptions`. */
  pageSize?: number;
  /** Choices for the rows-per-page Select (e.g. `[10, 25, 50]`). */
  pageSizeOptions?: number[];
  /** Fires with the chosen rows-per-page. */
  onPageSizeChange?: (pageSize: number) => void;
  /** Total row count — switches the indicator to "N–M of T". */
  total?: number;
  /** Whether the whole footer is inert (e.g. while a page fetch is in flight). */
  disabled?: boolean;
}

/**
 * The data-table footer. Composes garn `pagination` (the labeled nav landmark)
 * + an optional rows-per-page `select` + a row-range indicator. Controlled:
 * paging is an action (button), not URL navigation, so it owns no slicing.
 */
function TablePagination({
  page,
  pageCount,
  onPageChange,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
  total,
  disabled,
  className,
  ...props
}: TablePaginationProps) {
  const canPrev = page > 1 && !disabled;
  const canNext = page < pageCount && !disabled;

  let rangeText = `Page ${page} of ${Math.max(pageCount, 1)}`;
  if (total !== undefined && pageSize) {
    const end = Math.min(page * pageSize, total);
    // Clamp start to end so an out-of-range page (e.g. `total` shrank under a
    // stale `page`) can't render an inverted "11–5 of 5".
    const start = total === 0 ? 0 : Math.min((page - 1) * pageSize + 1, end);
    rangeText = `${start}–${end} of ${total}`;
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-[var(--garn-gap-inline)] py-[var(--garn-space-8)] text-sm text-muted-foreground",
        className
      )}
      data-slot="table-pagination"
      {...props}
    >
      <div className="flex items-center gap-[var(--garn-gap-inline)]">
        {pageSizeOptions && pageSize !== undefined ? (
          <div className="flex items-center gap-2">
            <span>Rows per page</span>
            <Select
              disabled={disabled}
              onValueChange={(value) => onPageSizeChange?.(Number(value))}
              value={String(pageSize)}
            >
              <SelectTrigger aria-label="Rows per page" className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <span className="tabular-nums">{rangeText}</span>
      </div>

      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent>
          <PaginationItem>
            <Button
              aria-label="Go to previous page"
              disabled={!canPrev}
              onClick={() => onPageChange(page - 1)}
              size="icon-sm"
              variant="outline"
            >
              <ChevronLeft className="size-4" />
            </Button>
          </PaginationItem>
          <PaginationItem>
            <Button
              aria-label="Go to next page"
              disabled={!canNext}
              onClick={() => onPageChange(page + 1)}
              size="icon-sm"
              variant="outline"
            >
              <ChevronRight className="size-4" />
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

// #endregion pagination
// #region exports — public surface
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  TableSortButton,
  TableColumnResizer,
  TableSelectionCell,
  TableSelectAllCell,
  TableExpandToggle,
  TableExpandAllCell,
  TableExpandedRow,
  TableDragHandle,
  TableEmpty,
  TableSkeletonRows,
  TablePagination,
  useTableSelection,
  useTableExpansion,
  useColumnResize,
};
// #endregion exports
