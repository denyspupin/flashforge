"use client";
// #region imports — React, DOM, icon, and lib imports

import * as React from "react";
import { createPortal } from "react-dom";
import { Slot } from "@radix-ui/react-slot";
import { GripVerticalIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useControllableState } from "@/lib/use-controllable-state";
import { useIsomorphicLayoutEffect } from "@/lib/use-isomorphic-layout-effect";
import { useAnnounce } from "@/lib/use-announce";
import {
  TOUCH_DELAY_MS,
  TOUCH_TOLERANCE,
  scrollableAncestor,
  edgeVelocity,
} from "@/lib/drag-gesture";
// #endregion imports
// #region types — overview doc, orientation, announcements vocabulary

/*
 * Shape: a `Sortable` container owns an ordered `value` (the item keys) and, when
 * standalone, the drag machine; `Sortable.Item` is a `value`-keyed cell that
 * becomes the drag activator (or defers to a nested `Sortable.Handle`). A single
 * vertical/horizontal list needs only `Sortable` + items. Wrap several `Sortable`s
 * in a `Sortable.Group` to build a Board — one machine hoists across columns so an
 * item can move between them. `Sortable.Overlay` renders a portal ghost that
 * follows the pointer (clip-free; required for Board).
 *
 * The keyboard drag model: Space/Enter lifts, arrows move (the cross-axis moves
 * between columns in a Board), Space/Enter drops, Esc cancels and restores — focus
 * follows the item throughout, and a polite live region announces every step. The
 * engine is zero-dependency: Pointer Events + rects measured at drag-start + a
 * sibling-gap shift, all ours.
 */

/** The reorder axis model. Exported: consumers type their own wrappers with it. */
export type SortableOrientation = "vertical" | "horizontal" | "grid";

/** How the projected drop index is computed. `pointer` (default) is the 1D main-axis
 *  midpoint crossing; `closest-center` is a 2D reading-order scan (auto for `grid`),
 *  robust for variable-size items and wrapping grids. */
export type CollisionStrategy = "pointer" | "closest-center";

/** Everything a screen reader hears — every message is overridable per domain. */
interface SortableAnnouncements {
  /** On pick-up. */
  onDragStart: (a: { label: string; position: number; count: number }) => string;
  /** On each keyboard/pointer move that changes the projected slot. */
  onDragMove: (a: {
    label: string;
    position: number;
    count: number;
    container: string | null;
  }) => string;
  /** On drop. */
  onDragEnd: (a: { label: string; position: number; count: number }) => string;
  /** On Escape / cancel. */
  onDragCancel: (a: { label: string; position: number }) => string;
}

const defaultAnnouncements: SortableAnnouncements = {
  onDragStart: ({ label, position, count }) =>
    `Picked up ${label}. Position ${position} of ${count}. Use the arrow keys to move, Space or Enter to drop, Escape to cancel.`,
  onDragMove: ({ label, position, count, container }) =>
    container
      ? `${label} is over ${container}, position ${position} of ${count}.`
      : `${label} is at position ${position} of ${count}.`,
  onDragEnd: ({ label, position, count }) =>
    `Dropped ${label}. Position ${position} of ${count}.`,
  onDragCancel: ({ label, position }) =>
    `Movement cancelled. ${label} returned to position ${position}.`,
};
// #endregion types
// #region model — machine model: containers, drag state, coordinator

/* ------------------------------------------------------------- machine ----- */

/** A registered droppable container (one per `Sortable`). */
interface ContainerReg {
  id: string;
  orientation: SortableOrientation;
  element: HTMLElement | null;
  /** Read the container's current ordered keys (live — not captured). */
  getValues: () => string[];
  /** Commit a new order for this container. */
  setValues: (next: string[], meta: ReorderMeta) => void;
}

export interface ReorderMeta {
  value: string;
  from: number;
  to: number;
  fromContainer: string;
  toContainer: string;
}

/** Fired whenever the projected drop slot changes (container and/or index). */
export interface DragOverEvent {
  value: string;
  container: string;
  index: number;
  fromContainer: string;
}

/** Fired on every pointer move during a drag (rAF-throttled). */
export interface DragMoveEvent {
  value: string;
  x: number;
  y: number;
}

/** The live drag, held in a ref so pointer moves never chase stale closures. */
interface DragState {
  /** The grabbed item (the one that follows the pointer). */
  value: string;
  /** All items being moved — `[value]` normally, or the whole selection when the
   *  grabbed item is part of it (multi-item drag), in source order. */
  values: string[];
  fromContainer: string;
  fromIndex: number;
  pointerId: number | null;
  originX: number;
  originY: number;
  /** The active item's main-axis extent + gap — how far siblings shift. Projection
   *  itself is measured live (transform-independent), so no rect snapshot is kept. */
  step: number;
}

/** The projected drop position, the only thing renders react to per move. */
interface Over {
  container: string;
  index: number;
}

interface Coordinator {
  orientation: SortableOrientation;
  disabled: boolean;
  activationDistance: number;
  /** Constrain the self-translate follow to the main axis (default true). */
  lockAxis: boolean;
  /** Reflect `data-drop-edge` + render a built-in insertion line (default false). */
  dropIndicator: boolean;
  /** Projection strategy for the drop index. */
  collision: CollisionStrategy;
  /** The active drag, or null when idle. */
  active: { value: string; fromContainer: string } | null;
  /** All values being dragged (multi-item drag) — `[]` when idle. */
  activeValues: string[];
  over: Over | null;
  mode: "pointer" | "keyboard" | null;
  /** Live pointer position (rAF-throttled) — drives the self/overlay follow. */
  pointer: { x: number; y: number } | null;
  /** Pointer position captured at pick-up — the follow transform's zero. */
  origin: { x: number; y: number } | null;
  /** True for the single commit frame after a drop, so items snap to their final
   *  slots instead of animating a stale transform against the reordered DOM. */
  dropping: boolean;
  /** Whether an overlay is mounted (source hides; ghost follows instead). */
  hasOverlay: boolean;
  registerContainer: (reg: ContainerReg) => () => void;
  registerItem: (value: string, el: HTMLElement | null) => void;
  /** A stable per-value ref callback (so headless prop-getters don't churn refs). */
  itemRef: (value: string) => (node: HTMLElement | null) => void;
  registerOverlay: () => () => void;
  /** Per-item transform offset (main axis) for the sibling-gap shift. */
  offsetFor: (container: string, index: number, value: string) => number;
  pointerStart: (e: React.PointerEvent, value: string, container: string) => void;
  keyDown: (e: React.KeyboardEvent, value: string, container: string) => void;
}
// #endregion model
// #region context — coordinator/container/item contexts and guard hook

const CoordinatorContext = React.createContext<Coordinator | null>(null);
const ContainerContext = React.createContext<{
  id: string;
  orientation: SortableOrientation;
  order: string[];
} | null>(null);
const ItemContext = React.createContext<{ value: string; disabled: boolean; active: boolean } | null>(null);

function useCoordinator(): Coordinator {
  const ctx = React.useContext(CoordinatorContext);
  if (!ctx) throw new Error("Sortable parts must render inside a <Sortable> or <Sortable.Group>.");
  return ctx;
}
// #endregion context
// #region utils — reorder, activation guard, keyboard instructions node

/* ------------------------------------------------------------- helpers ----- */

const isVertical = (o: SortableOrientation) => o === "vertical";
const isGrid = (o: SortableOrientation) => o === "grid";

/** Move `arr[from]` to index `to`, returning a new array. */
function reorder<T>(arr: readonly T[], from: number, to: number): T[] {
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
}

/** True when the pointerdown lands on an interactive element *other than* the
 *  activator itself — those should click, not start a drag. The activator (a
 *  bare item) is itself `role="button"`, so it must be excluded from the match. */
function isInteractiveTarget(target: EventTarget | null, activator: Element): boolean {
  if (!(target instanceof Element)) return false;
  const hit = target.closest(
    'a,button,input,select,textarea,[role="button"],[contenteditable="true"]',
  );
  return !!hit && hit !== activator;
}

/* ---- Bundle A: touch sensor + edge auto-scroll — shared physics live in
 * lib/drag-gesture so every drag surface (sortable, scheduler) feels the same. --- */

const INSTRUCTIONS_ID = "garn-sortable-instructions";
const INSTRUCTIONS_TEXT =
  "To reorder, press Space or Enter to pick up an item, use the arrow keys to move it, then Space or Enter to drop, or Escape to cancel.";

/** Ensure one shared visually-hidden keyboard-instructions node exists (idempotent
 *  by id, like the live region) so every activator's `aria-describedby` resolves —
 *  whether it came from a component or the headless hook. */
function ensureInstructions(): void {
  if (typeof document === "undefined" || document.getElementById(INSTRUCTIONS_ID)) return;
  const el = document.createElement("span");
  el.id = INSTRUCTIONS_ID;
  el.className = "sr-only";
  el.textContent = INSTRUCTIONS_TEXT;
  document.body.appendChild(el);
}
// #endregion utils
// #region prop-builders — shared item/handle DOM prop builders

/** Spreadable DOM props that carry `data-*` keys the base HTMLAttributes omits. */
type DragDomProps = React.HTMLAttributes<HTMLElement> & {
  ref: (node: HTMLElement | null) => void;
  [key: `data-${string}`]: unknown;
};

interface ItemPropsInput {
  coordinator: Coordinator;
  containerId: string;
  orientation: SortableOrientation;
  order: string[];
  value: string;
  disabled: boolean;
  /** When a dedicated handle is present the item is not itself the activator. */
  hasHandle: boolean;
}

/** The DOM props for one reorderable item — the single source of truth shared by
 *  `<Sortable.Item>` and `useSortable().getItemProps`, so the component and headless
 *  paths can never drift. Pure (no hooks): safe to call in a render loop. */

/** The order with the dragged run removed, as O(1) per-item lookups. Computed
 *  once per (order, activeValues) pair — every item re-deriving it with a fresh
 *  `filter()` made the drop-edge pass O(n²) allocations per drag frame. */
const restOrderCache = new WeakMap<
  readonly string[],
  { actives: readonly string[]; index: Map<string, number>; length: number }
>();
function restOrderInfo(order: string[], actives: string[]) {
  let entry = restOrderCache.get(order);
  if (!entry || entry.actives !== actives) {
    const index = new Map<string, number>();
    let i = 0;
    for (const v of order) if (!actives.includes(v)) index.set(v, i++);
    entry = { actives, index, length: i };
    restOrderCache.set(order, entry);
  }
  return entry;
}

function buildItemProps(input: ItemPropsInput) {
  const { coordinator, containerId, orientation, order, value, disabled, hasHandle } = input;
  const vertical = isVertical(orientation);
  const grid = isGrid(orientation);
  // `active` = the grabbed item (follows the cursor). In a multi-item drag the other
  // selected items ride along invisibly and gather at the drop — `following` marks them.
  const active = coordinator.active?.value === value;
  const following = !active && coordinator.activeValues.includes(value);
  const dragCount = active ? coordinator.activeValues.length : 0;
  const index = order.indexOf(value);
  const offset = coordinator.offsetFor(containerId, index, value);
  // The active item under pointer drag follows the cursor; otherwise it (and its
  // siblings) glide by the sibling-gap offset. `lockAxis` pins the self-follow to the
  // main axis (a 1D list shouldn't drift sideways); a grid follows 2D, and the overlay
  // stays free (2D) so a Board drag can cross into another column.
  const lockMain = coordinator.lockAxis && !grid;
  const follow =
    active && coordinator.mode === "pointer" && !coordinator.hasOverlay && coordinator.pointer && coordinator.origin
      ? {
          dx: lockMain && vertical ? 0 : coordinator.pointer.x - coordinator.origin.x,
          dy: lockMain && !vertical ? 0 : coordinator.pointer.y - coordinator.origin.y,
        }
      : null;
  // Source hides when the overlay shows the ghost; multi-item followers always hide.
  // The overlay renders only for pointer drags (it needs a pointer to follow), so a
  // keyboard lift must keep the source visible — hiding it would leave a sighted
  // keyboard user moving an invisible item by live-region audio alone.
  const hidden = (active && coordinator.hasOverlay && coordinator.mode === "pointer") || following;
  const transform = follow
    ? `translate(${follow.dx.toFixed(1)}px, ${follow.dy.toFixed(1)}px)`
    : offset
      ? vertical
        ? `translateY(${offset.toFixed(1)}px)`
        : `translateX(${offset.toFixed(1)}px)`
      : undefined;
  const isActivator = !hasHandle && !disabled;

  // Insertion edge: which side of THIS item the drop line sits on, when a drag is
  // over this container. `over.index` counts the order without the active item.
  let dropEdge: "start" | "end" | undefined;
  const over = coordinator.over;
  if (!active && !following && over && over.container === containerId && coordinator.active) {
    const rest = restOrderInfo(order, coordinator.activeValues);
    const restIndex = rest.index.get(value);
    if (restIndex === over.index) dropEdge = "start";
    else if (over.index >= rest.length && restIndex === rest.length - 1) dropEdge = "end";
  }

  // No `touch-action: none` here: a whole-item touch drag uses long-press, so the
  // list must stay touch-scrollable pre-drag; the machine blocks native scroll only
  // once the drag commits. (A dedicated handle keeps touch-action:none for a grab.)
  const style: React.CSSProperties = {};
  if (transform) style.transform = transform;

  const props: DragDomProps = {
    ref: coordinator.itemRef(value),
    "data-slot": "sortable-item",
    "data-orientation": orientation,
    "data-dragging": active || undefined,
    "data-dropping": coordinator.dropping || undefined,
    "data-placeholder": hidden || undefined,
    "data-disabled": disabled || undefined,
    "data-drop-edge": coordinator.dropIndicator ? dropEdge : undefined,
    style,
    ...(isActivator
      ? {
          role: "button",
          tabIndex: 0,
          "aria-roledescription": "sortable",
          "aria-describedby": INSTRUCTIONS_ID,
          onPointerDown: (e: React.PointerEvent) => coordinator.pointerStart(e, value, containerId),
          onKeyDown: (e: React.KeyboardEvent) => coordinator.keyDown(e, value, containerId),
        }
      : {}),
  };
  return { active, hidden, dropEdge, dragCount, props };
}

/** The DOM props for a drag handle — shared by `<Sortable.Handle>` and
 *  `useSortable().getHandleProps`. Pure (no hooks). */
function buildHandleProps(input: {
  coordinator: Coordinator;
  containerId: string;
  value: string;
  disabled: boolean;
  label: string;
}) {
  const { coordinator, containerId, value, disabled, label } = input;
  return {
    "data-slot": "sortable-handle",
    // A STABLE handle marker, distinct from `data-slot`: headless consumers
    // (list/table) rebrand `data-slot` to their own value, which used to defeat the
    // `dataset.slot === "sortable-handle"` handle check in `pointerStart` (making a
    // handle touch-drag fall back to whole-item long-press). This attribute they
    // don't override, so handle detection survives the rename.
    "data-sortable-handle": "",
    "data-disabled": disabled || undefined,
    "aria-label": label,
    "aria-roledescription": "sortable",
    "aria-describedby": INSTRUCTIONS_ID,
    tabIndex: disabled ? -1 : 0,
    onPointerDown: (e: React.PointerEvent) => {
      coordinator.pointerStart(e, value, containerId);
    },
    onKeyDown: (e: React.KeyboardEvent) => coordinator.keyDown(e, value, containerId),
    style: { touchAction: disabled ? undefined : "none" } as React.CSSProperties,
  };
}
// #endregion prop-builders
// #region options — machine options, defaults, prop splitting

/* ------------------------------------------------------- machine options --- */

/** Every drag-machine option shared by the three entry points (`Sortable`,
 *  `Sortable.Group`, `useSortable`). The public interfaces re-declare these
 *  members inline; `splitMachineProps` below is the single RUNTIME path, so the
 *  default/split/strip logic lives in exactly one place. Adding an option =
 *  add it here + to the three public interfaces. */
interface SortableMachineOptions {
  orientation?: SortableOrientation;
  disabled?: boolean;
  announcements?: Partial<SortableAnnouncements>;
  getItemLabel?: (value: string) => string;
  onDragStart?: (e: { value: string }) => void;
  onDragEnd?: (e: ReorderMeta) => void;
  onDragCancel?: (e: { value: string }) => void;
  activationDistance?: number;
  touchDelay?: number;
  autoScroll?: boolean;
  lockAxis?: boolean;
  dropIndicator?: boolean;
  collision?: CollisionStrategy;
  selectedValues?: string[];
  onDragOver?: (e: DragOverEvent) => void;
  onDragMove?: (e: DragMoveEvent) => void;
}

/** Machine options with defaults applied — what `useCoordinatorMachine` takes. */
type ResolvedMachineOptions = Required<
  Pick<
    SortableMachineOptions,
    | "orientation"
    | "disabled"
    | "activationDistance"
    | "touchDelay"
    | "autoScroll"
    | "lockAxis"
    | "dropIndicator"
    | "collision"
    | "selectedValues"
  >
> &
  Pick<
    SortableMachineOptions,
    | "announcements"
    | "getItemLabel"
    | "onDragStart"
    | "onDragEnd"
    | "onDragCancel"
    | "onDragOver"
    | "onDragMove"
  >;

/** Split any entry point's props into resolved machine options + the residue
 *  (DOM/own props) — so no entry point can silently drop an option and no
 *  machine option can leak onto a DOM element. */
function splitMachineProps<P extends SortableMachineOptions>(
  props: P
): { machine: ResolvedMachineOptions; rest: Omit<P, keyof SortableMachineOptions> } {
  const {
    orientation = "vertical",
    disabled = false,
    announcements,
    getItemLabel,
    onDragStart,
    onDragEnd,
    onDragCancel,
    activationDistance = 4,
    touchDelay = TOUCH_DELAY_MS,
    autoScroll = true,
    lockAxis = true,
    dropIndicator = false,
    collision = "pointer",
    selectedValues = [],
    onDragOver,
    onDragMove,
    ...rest
  } = props;
  return {
    machine: {
      orientation,
      disabled,
      announcements,
      getItemLabel,
      onDragStart,
      onDragEnd,
      onDragCancel,
      activationDistance,
      touchDelay,
      autoScroll,
      lockAxis,
      dropIndicator,
      collision,
      selectedValues,
      onDragOver,
      onDragMove,
    },
    rest: rest as Omit<P, keyof SortableMachineOptions>,
  };
}
// #endregion options
// #region machine — drag machine: projection, auto-scroll, pointer, keyboard

/** The reducer-free machine: refs for the hot path, state for what renders. */
function useCoordinatorMachine(opts: ResolvedMachineOptions): Coordinator {
  const { orientation, disabled, activationDistance, touchDelay, lockAxis, dropIndicator, collision } = opts;
  const announce = useAnnounce();

  const containersRef = React.useRef(new Map<string, ContainerReg>());
  const elementsRef = React.useRef(new Map<string, HTMLElement>());
  // The dragged element's on-screen rect captured AT drop, for a FLIP settle: the
  // drop reorders the DOM, so without this the item teleports from where it was
  // released to its final slot (the "drop jump"). `flipCleanupRef` cancels an
  // in-flight settle if a new drop lands (or on unmount).
  const dropFlipRef = React.useRef<{ value: string; first: DOMRect } | null>(null);
  const flipCleanupRef = React.useRef<(() => void) | null>(null);
  const dragRef = React.useRef<DragState | null>(null);
  const rafRef = React.useRef<number | null>(null);
  // Pre-activation watch phase (pointerStart) lives in closure-local listeners;
  // this ref lets the unmount cleanup reach them, and the flag stops a queued
  // long-press from activating a drag after unmount.
  const watchDetachRef = React.useRef<(() => void) | null>(null);
  // Window-level Escape for the duration of a pointer drag: Safari doesn't focus
  // buttons on mousedown, so the activator's own onKeyDown never sees Escape —
  // without this, a Safari mouse drag is uncancellable (drop-outside commits).
  const dragKeydownRef = React.useRef<((e: KeyboardEvent) => void) | null>(null);
  const unmountedRef = React.useRef(false);
  const overlayCountRef = React.useRef(0);
  // Latest rAF-throttled pointer, for the auto-scroll loop's re-projection.
  const lastPointerRef = React.useRef<{ x: number; y: number } | null>(null);
  // The running edge auto-scroll: which element, at what per-frame velocity.
  const autoScrollRef = React.useRef<{
    raf: number | null;
    vx: number;
    vy: number;
    el: Element | null;
    /** Container the cached scroller was resolved for — the scrollable ancestor
     *  is stable while hovering one container, so skip the per-frame hit-test. */
    scrollerFor: string | null;
  }>({
    raf: null,
    vx: 0,
    vy: 0,
    scrollerFor: null,
    el: null,
  });

  const [active, setActive] = React.useState<Coordinator["active"]>(null);
  const [activeValues, setActiveValues] = React.useState<string[]>([]);
  const [over, setOver] = React.useState<Over | null>(null);
  const [mode, setMode] = React.useState<Coordinator["mode"]>(null);
  const [pointer, setPointer] = React.useState<{ x: number; y: number } | null>(null);
  const [origin, setOrigin] = React.useState<{ x: number; y: number } | null>(null);
  const [dropping, setDropping] = React.useState(false);
  const [hasOverlay, setHasOverlay] = React.useState(false);

  // Keep the latest option callbacks reachable from stable event handlers.
  const optsRef = React.useRef(opts);
  optsRef.current = opts;

  const msg = React.useCallback((): SortableAnnouncements => {
    return { ...defaultAnnouncements, ...optsRef.current.announcements };
  }, []);
  const labelOf = React.useCallback(
    (value: string) => optsRef.current.getItemLabel?.(value) ?? value,
    [],
  );

  const registerContainer = React.useCallback((reg: ContainerReg) => {
    containersRef.current.set(reg.id, reg);
    return () => {
      containersRef.current.delete(reg.id);
    };
  }, []);

  const registerItem = React.useCallback((value: string, el: HTMLElement | null) => {
    if (el) elementsRef.current.set(value, el);
    else elementsRef.current.delete(value);
  }, []);

  // One stable ref callback per value, so prop-getters called in a render loop
  // don't hand React a fresh ref every render (which would churn registration).
  const itemRefsRef = React.useRef(new Map<string, (node: HTMLElement | null) => void>());
  const itemRef = React.useCallback(
    (value: string) => {
      let cb = itemRefsRef.current.get(value);
      if (!cb) {
        cb = (node: HTMLElement | null) => registerItem(value, node);
        itemRefsRef.current.set(value, cb);
      }
      return cb;
    },
    [registerItem],
  );

  const registerOverlay = React.useCallback(() => {
    overlayCountRef.current += 1;
    setHasOverlay(true);
    return () => {
      overlayCountRef.current -= 1;
      if (overlayCountRef.current <= 0) setHasOverlay(false);
    };
  }, []);

  /** The sibling-shift distance for a value: its own extent + the gap to a
   *  neighbour. Read from layout offsets (transform-independent) at pick-up. */
  const stepFor = React.useCallback(
    (value: string, siblings: string[]): number => {
      const vertical = isVertical(orientation);
      const el = elementsRef.current.get(value);
      if (!el) return 0;
      const self = siblings.indexOf(value);
      const neighbour = elementsRef.current.get(siblings[self + 1] ?? siblings[self - 1] ?? "");
      const off = (n: HTMLElement) => (vertical ? n.offsetTop : n.offsetLeft);
      if (neighbour) return Math.abs(off(neighbour) - off(el));
      return vertical ? el.offsetHeight : el.offsetWidth;
    },
    [orientation],
  );

  /** Column count of a grid container — items sharing the first row's `offsetTop`.
   *  Drives the grid keyboard model (up/down move a whole row). */
  const gridColumns = React.useCallback((container: string): number => {
    const reg = containersRef.current.get(container);
    const values = reg?.getValues() ?? [];
    const first = elementsRef.current.get(values[0] ?? "");
    if (!first) return 1;
    const top0 = first.offsetTop;
    const tol = first.offsetHeight / 2;
    let cols = 0;
    for (const v of values) {
      const el = elementsRef.current.get(v);
      if (!el) continue;
      if (Math.abs(el.offsetTop - top0) <= tol) cols++;
      else break; // first item of the next row
    }
    return Math.max(1, cols);
  }, []);

  /** Compute {container,index} under a point — measured LIVE from each item's layout
   *  offset (`offsetTop`/`offsetLeft`, which ignore the drag transforms) plus the
   *  container's live rect + scroll. Stays correct as the container scrolls (manual or
   *  auto-scroll) and as siblings shift, with no stale snapshot. */
  const project = React.useCallback(
    (drag: DragState, x: number, y: number): Over => {
      const vertical = isVertical(orientation);
      const grid = isGrid(orientation);
      // Which container is the pointer over? (Containers aren't transformed → live rect.)
      let targetContainer = drag.fromContainer;
      for (const [id, reg] of containersRef.current) {
        if (!reg.element) continue;
        const r = reg.element.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
          targetContainer = id;
          break;
        }
      }
      const reg = containersRef.current.get(targetContainer);
      if (!reg?.element) return { container: targetContainer, index: 0 };
      const cr = reg.element.getBoundingClientRect();
      // Content-origin in viewport coords, per axis (border edge minus own scroll — 0
      // when an ancestor is the scroller, since `cr` already reflects that).
      const originX = cr.left + reg.element.clientLeft - reg.element.scrollLeft;
      const originY = cr.top + reg.element.clientTop - reg.element.scrollTop;
      const moving = new Set(drag.values);
      const values = reg.getValues().filter((v) => !moving.has(v));

      // Grid or closest-center → a 2D reading-order scan: the insert index is the count
      // of items whose row is above the pointer, or same-row and left of it. Robust for
      // wrapping grids and variable-size rows where a 1D midpoint is jumpy.
      if (grid || collision === "closest-center") {
        let index = 0;
        for (const v of values) {
          const el = elementsRef.current.get(v);
          if (!el) continue;
          const cx = originX + el.offsetLeft + el.offsetWidth / 2;
          const cy = originY + el.offsetTop + el.offsetHeight / 2;
          const rowTol = el.offsetHeight / 2;
          const aboveRow = cy < y - rowTol;
          const sameRow = Math.abs(cy - y) <= rowTol;
          if (aboveRow || (sameRow && cx < x)) index++;
        }
        return { container: targetContainer, index };
      }

      // Default 1D pointer strategy: first item whose main-axis center the pointer passed.
      const main = vertical ? y : x;
      const base = vertical ? originY : originX;
      let index = values.length;
      for (let i = 0; i < values.length; i++) {
        const el = elementsRef.current.get(values[i]!);
        if (!el) continue;
        const center =
          base + (vertical ? el.offsetTop : el.offsetLeft) + (vertical ? el.offsetHeight : el.offsetWidth) / 2;
        if (main < center) {
          index = i;
          break;
        }
      }
      return { container: targetContainer, index };
    },
    [collision, orientation],
  );

  const clearRaf = React.useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  /** Announce a projected position (1-based) for the current `over`. */
  const announceMove = React.useCallback(
    (drag: DragState, next: Over) => {
      const reg = containersRef.current.get(next.container);
      const count = (reg?.getValues().length ?? 1);
      const across = next.container !== drag.fromContainer ? next.container : null;
      announce(
        msg().onDragMove({ label: labelOf(drag.value), position: next.index + 1, count, container: across }),
      );
      optsRef.current.onDragOver?.({
        value: drag.value,
        container: next.container,
        index: next.index,
        fromContainer: drag.fromContainer,
      });
    },
    [announce, msg, labelOf],
  );

  // A synchronous mirror of `over`, so move handlers can diff the projection without
  // reading (stale) state — and so side effects (announce, onDragOver) run OUTSIDE
  // the `setOver` updater (a setState-in-render violation otherwise).
  const overRef = React.useRef<Over | null>(null);
  const commitOver = React.useCallback(
    (drag: DragState, next: Over) => {
      const prev = overRef.current;
      if (prev && prev.container === next.container && prev.index === next.index) return;
      overRef.current = next;
      setOver(next);
      announceMove(drag, next);
    },
    [announceMove],
  );

  /* --------------------------------------------------- edge auto-scroll --- */

  const stopAutoScroll = React.useCallback(() => {
    const s = autoScrollRef.current;
    if (s.raf != null) cancelAnimationFrame(s.raf);
    s.raf = null;
    s.vx = 0;
    s.vy = 0;
    s.el = null;
    s.scrollerFor = null;
  }, []);

  const tickAutoScroll = React.useCallback(() => {
    const s = autoScrollRef.current;
    const drag = dragRef.current;
    if (!drag || !s.el || (s.vx === 0 && s.vy === 0)) {
      s.raf = null;
      return;
    }
    s.el.scrollBy(s.vx, s.vy);
    // The container moved under a stationary pointer → re-project at the last point.
    const p = lastPointerRef.current;
    if (p) {
      commitOver(drag, project(drag, p.x, p.y));
      // Consumers running their own projection (Tree's 3-way zones) re-project too.
      optsRef.current.onDragMove?.({ value: drag.value, x: p.x, y: p.y });
    }
    s.raf = requestAnimationFrame(tickAutoScroll);
  }, [commitOver, project]);

  /** Recompute the auto-scroll velocity for the current pointer; (re)start the loop. */
  const updateAutoScroll = React.useCallback(
    (x: number, y: number) => {
      const s = autoScrollRef.current;
      if (!optsRef.current.autoScroll || typeof document === "undefined") {
        s.vx = 0;
        s.vy = 0;
        return;
      }
      // The scrollable ancestor only changes when the projected container does —
      // reuse it instead of paying elementFromPoint + a computed-style ancestor
      // walk on every rAF-throttled move.
      const container = overRef.current?.container ?? dragRef.current?.fromContainer ?? null;
      let el = container != null && s.scrollerFor === container ? s.el : null;
      if (!el) {
        el = scrollableAncestor(document.elementFromPoint(x, y));
        s.scrollerFor = el ? container : null;
      }
      if (!el) {
        s.el = null;
        s.vx = 0;
        s.vy = 0;
        return;
      }
      const { vx, vy } = edgeVelocity(el, x, y);
      s.el = el;
      s.vx = vx;
      s.vy = vy;
      if ((vx !== 0 || vy !== 0) && s.raf == null) s.raf = requestAnimationFrame(tickAutoScroll);
    },
    [tickAutoScroll],
  );

  // While an active touch drag is in flight, block native scrolling (our edge
  // auto-scroll takes over). Non-passive listener, attached only for touch drags.
  const preventTouchScroll = React.useCallback((e: Event) => {
    if (dragRef.current) e.preventDefault();
  }, []);

  const endDrag = React.useCallback(() => {
    clearRaf();
    stopAutoScroll();
    if (typeof document !== "undefined") document.removeEventListener("touchmove", preventTouchScroll);
    if (dragKeydownRef.current) {
      window.removeEventListener("keydown", dragKeydownRef.current, true);
      dragKeydownRef.current = null;
    }
    lastPointerRef.current = null;
    overRef.current = null;
    dragRef.current = null;
    setActive(null);
    setActiveValues([]);
    setOver(null);
    setMode(null);
    setPointer(null);
    setOrigin(null);
  }, [clearRaf, preventTouchScroll, stopAutoScroll]);

  /** Commit the current projection, moving the dragged item(s) within/across
   *  containers. For a multi-item drag, all `drag.values` gather contiguously at the
   *  target index (in source order), removed from wherever they were. */
  const commit = React.useCallback(
    (drag: DragState, target: Over) => {
      const from = containersRef.current.get(drag.fromContainer);
      const to = containersRef.current.get(target.container);
      if (!from) return;
      // FLIP "First": the dragged element's on-screen box while still lifted at the
      // release point, snapshotted BEFORE `setValues` reorders the DOM. The drop
      // layout effect measures "Last" (its final slot) and glides between them.
      const activeEl = elementsRef.current.get(drag.value);
      dropFlipRef.current = activeEl
        ? { value: drag.value, first: activeEl.getBoundingClientRect() }
        : null;
      const moving = new Set(drag.values);
      const meta: ReorderMeta = {
        value: drag.value,
        from: from.getValues().indexOf(drag.value),
        to: target.index,
        fromContainer: drag.fromContainer,
        toContainer: target.container,
      };
      if (target.container === drag.fromContainer) {
        const values = from.getValues();
        if (drag.values.length === 1) {
          from.setValues(reorder(values, values.indexOf(drag.value), target.index), meta);
        } else {
          // Insert-point marker survives the removal so we splice at the right place.
          const kept = values.filter((v) => !moving.has(v));
          const insertAt = Math.min(target.index, kept.length);
          kept.splice(insertAt, 0, ...drag.values);
          from.setValues(kept, meta);
        }
        optsRef.current.onDragEnd?.(meta);
      } else if (to) {
        const nextFrom = from.getValues().filter((v) => !moving.has(v));
        const nextTo = to.getValues().filter((v) => !moving.has(v));
        nextTo.splice(Math.min(target.index, nextTo.length), 0, ...drag.values);
        from.setValues(nextFrom, meta);
        to.setValues(nextTo, meta);
        optsRef.current.onDragEnd?.(meta);
      }
      const count = (to ?? from).getValues().length;
      const label = drag.values.length > 1 ? `${drag.values.length} items` : labelOf(drag.value);
      announce(msg().onDragEnd({ label, position: target.index + 1, count }));
      // Snap-settle: the DOM reorders this frame, so suppress transforms/transitions
      // for it (else the item animates a stale offset against its new slot — the
      // "drop glitch"). Cleared on the next paint by the effect below.
      setDropping(true);
    },
    [announce, msg, labelOf],
  );

  /* ------------------------------------------------ pointer interaction --- */

  const beginDrag = React.useCallback(
    (value: string, container: string, x: number, y: number, kind: "pointer" | "keyboard", pointerId: number | null) => {
      const reg = containersRef.current.get(container);
      const siblings = reg?.getValues() ?? [];
      const fromIndex = siblings.indexOf(value);
      // Grabbing a selected item drags the whole selection (in source order); grabbing
      // an unselected item drags just it.
      const selected = optsRef.current.selectedValues ?? [];
      const values =
        selected.length > 1 && selected.includes(value)
          ? siblings.filter((v) => selected.includes(v))
          : [value];
      const drag: DragState = {
        value,
        values,
        fromContainer: container,
        fromIndex: fromIndex < 0 ? 0 : fromIndex,
        pointerId,
        originX: x,
        originY: y,
        step: stepFor(value, siblings),
      };
      dragRef.current = drag;
      if (kind === "pointer") lastPointerRef.current = { x, y };
      overRef.current = { container, index: drag.fromIndex };
      setActive({ value, fromContainer: container });
      setActiveValues(values);
      setMode(kind);
      setOver({ container, index: drag.fromIndex });
      setOrigin({ x, y });
      if (kind === "pointer") setPointer({ x, y });
      optsRef.current.onDragStart?.({ value });
      const label = values.length > 1 ? `${values.length} items` : labelOf(value);
      announce(msg().onDragStart({ label, position: drag.fromIndex + 1, count: siblings.length }));
    },
    [announce, labelOf, msg, stepFor],
  );

  const onPointerMove = React.useCallback(
    (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      // A second touch point must not steer the active drag.
      if (drag.pointerId != null && e.pointerId !== drag.pointerId) return;
      const { clientX: x, clientY: y } = e;
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const d = dragRef.current;
        if (!d) return;
        lastPointerRef.current = { x, y };
        setPointer({ x, y });
        optsRef.current.onDragMove?.({ value: d.value, x, y });
        commitOver(d, project(d, x, y));
        updateAutoScroll(x, y);
      });
    },
    [commitOver, project, updateAutoScroll],
  );

  const onPointerUp = React.useCallback(
    (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      // Only the originating pointer may drop-commit the drag.
      if (drag.pointerId != null && e.pointerId !== drag.pointerId) return;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancelRef.current);
      clearRaf();
      // Final synchronous move at the drop point: rAF throttling may have left a
      // consumer's own projection (onDragMove) one frame behind on a fast drop.
      optsRef.current.onDragMove?.({ value: drag.value, x: e.clientX, y: e.clientY });
      const target = project(drag, e.clientX, e.clientY);
      commit(drag, target);
      endDrag();
    },
    [clearRaf, commit, endDrag, onPointerMove, project],
  );

  const onPointerCancel = React.useCallback(() => {
    const drag = dragRef.current;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerCancelRef.current);
    if (drag) {
      announce(msg().onDragCancel({ label: labelOf(drag.value), position: drag.fromIndex + 1 }));
      optsRef.current.onDragCancel?.({ value: drag.value });
    }
    endDrag();
  }, [announce, endDrag, labelOf, msg, onPointerMove, onPointerUp]);
  const onPointerCancelRef = React.useRef(onPointerCancel);
  onPointerCancelRef.current = onPointerCancel;

  const pointerStart = React.useCallback(
    (e: React.PointerEvent, value: string, container: string) => {
      if (disabled || e.button !== 0 || dragRef.current) return;
      // A bare-item activator must not hijack clicks on interactive children.
      // Detect a dedicated handle by the stable marker (not `data-slot`, which
      // headless consumers rebrand): a handle activates on travel distance for
      // touch too, a bare item long-presses.
      const handleEl = e.currentTarget as HTMLElement;
      const onHandle =
        handleEl.dataset.slot === "sortable-handle" ||
        handleEl.hasAttribute("data-sortable-handle");
      if (!onHandle && isInteractiveTarget(e.target, e.currentTarget as Element)) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const pointerId = e.pointerId;
      // Whole-item touch uses long-press (a quick swipe scrolls the list instead);
      // a handle, mouse, or pen activates on travel distance.
      const longPress = e.pointerType === "touch" && !onHandle;
      let delayTimer: ReturnType<typeof setTimeout> | null = null;

      const detach = (ev?: PointerEvent) => {
        // pointerup/pointercancel from another touch must not abort the gesture.
        if (ev && ev.pointerId !== pointerId) return;
        if (delayTimer != null) {
          clearTimeout(delayTimer);
          delayTimer = null;
        }
        window.removeEventListener("pointermove", onWatchMove);
        window.removeEventListener("pointerup", detach);
        window.removeEventListener("pointercancel", detach);
        watchDetachRef.current = null;
      };
      const activate = (x: number, y: number, thenMove?: PointerEvent) => {
        detach();
        // A queued long-press may fire after unmount — never start a drag then.
        if (unmountedRef.current) return;
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
        window.addEventListener("pointercancel", onPointerCancelRef.current);
        // Capture-phase so mid-drag Escape cancels the drag before a host
        // dialog/popover can act on the same keystroke. Removed by `endDrag`.
        const onDragKeydown = (ev: KeyboardEvent) => {
          if (ev.key !== "Escape") return;
          ev.preventDefault();
          ev.stopPropagation();
          onPointerCancelRef.current();
        };
        dragKeydownRef.current = onDragKeydown;
        window.addEventListener("keydown", onDragKeydown, true);
        // Touch drags block native scroll for the rest of the gesture (auto-scroll
        // takes over); nothing has scrolled yet because the finger was held still.
        if (longPress && typeof document !== "undefined")
          document.addEventListener("touchmove", preventTouchScroll, { passive: false });
        beginDrag(value, container, x, y, "pointer", pointerId);
        if (thenMove) onPointerMove(thenMove);
      };
      const onWatchMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        const travelled = Math.hypot(ev.clientX - startX, ev.clientY - startY);
        if (longPress) {
          // Movement before the delay = scroll intent → abort (let the list scroll).
          if (travelled > TOUCH_TOLERANCE) detach();
        } else if (travelled >= activationDistance) {
          activate(ev.clientX, ev.clientY, ev);
        }
      };

      window.addEventListener("pointermove", onWatchMove);
      window.addEventListener("pointerup", detach);
      window.addEventListener("pointercancel", detach);
      watchDetachRef.current = detach;
      if (longPress) delayTimer = setTimeout(() => activate(startX, startY), touchDelay);
    },
    [activationDistance, beginDrag, disabled, onPointerMove, onPointerUp, preventTouchScroll, touchDelay],
  );

  /* ----------------------------------------------- keyboard interaction --- */

  const moveKeyboard = React.useCallback(
    (delta: number, axis: "main" | "cross") => {
      const drag = dragRef.current;
      const prev = overRef.current;
      if (!drag || !prev) return;
      if (axis === "main") {
        const reg = containersRef.current.get(prev.container);
        const len = reg?.getValues().filter((v) => !drag.values.includes(v)).length ?? 0;
        const index = Math.max(0, Math.min(len, prev.index + delta));
        if (index === prev.index) return;
        commitOver(drag, { container: prev.container, index });
        return;
      }
      // Cross axis: hop to the previous/next container (Board).
      const ids = [...containersRef.current.keys()];
      const ci = ids.indexOf(prev.container);
      const nextC = ids[Math.max(0, Math.min(ids.length - 1, ci + delta))];
      if (!nextC || nextC === prev.container) return;
      const reg = containersRef.current.get(nextC);
      const len = reg?.getValues().filter((v) => !drag.values.includes(v)).length ?? 0;
      commitOver(drag, { container: nextC, index: Math.min(prev.index, len) });
    },
    [commitOver],
  );

  const keyDown = React.useCallback(
    (e: React.KeyboardEvent, value: string, container: string) => {
      if (disabled) return;
      const drag = dragRef.current;
      const vertical = isVertical(orientation);
      const grid = isGrid(orientation);
      // RTL flips the horizontal arrow mapping (visual-left = logical-next).
      const rtl =
        !vertical &&
        typeof document !== "undefined" &&
        getComputedStyle(containersRef.current.get(container)?.element ?? document.body).direction === "rtl";
      // Handled keys are also stopped from bubbling, so a host with its own roving
      // keyboard (List/Tree/Table) doesn't *also* act on the same key mid-drag.
      if (!drag) {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          const el = elementsRef.current.get(value);
          const r = el?.getBoundingClientRect();
          beginDrag(value, container, r?.left ?? 0, r?.top ?? 0, "keyboard", null);
        }
        return;
      }
      // Dragging (keyboard mode).
      switch (e.key) {
        case " ":
        case "Enter": {
          e.preventDefault();
          e.stopPropagation();
          // Read the synchronous overRef mirror, not last render's state: key-repeat
          // can deliver a move and the drop in the same frame, and the state copy
          // would commit one slot behind the announced position.
          const target = overRef.current ?? over ?? { container, index: drag.fromIndex };
          commit(drag, target);
          endDrag();
          break;
        }
        case "Escape": {
          e.preventDefault();
          e.stopPropagation();
          announce(msg().onDragCancel({ label: labelOf(drag.value), position: drag.fromIndex + 1 }));
          optsRef.current.onDragCancel?.({ value: drag.value });
          endDrag();
          break;
        }
        case "Home":
          e.preventDefault();
          e.stopPropagation();
          moveKeyboard(-Number.POSITIVE_INFINITY, "main"); // jump to the first slot
          break;
        case "End":
          e.preventDefault();
          e.stopPropagation();
          moveKeyboard(Number.POSITIVE_INFINITY, "main"); // jump to the last slot
          break;
        case "ArrowDown":
          e.preventDefault();
          e.stopPropagation();
          // In a grid, down moves a whole row (± column count).
          moveKeyboard(grid ? gridColumns(container) : 1, vertical || grid ? "main" : "cross");
          break;
        case "ArrowUp":
          e.preventDefault();
          e.stopPropagation();
          moveKeyboard(grid ? -gridColumns(container) : -1, vertical || grid ? "main" : "cross");
          break;
        case "ArrowRight":
          e.preventDefault();
          e.stopPropagation();
          // In an RTL horizontal list, visual-right is the logical *previous* slot.
          moveKeyboard(grid ? 1 : vertical ? 1 : rtl ? -1 : 1, vertical && !grid ? "cross" : "main");
          break;
        case "ArrowLeft":
          e.preventDefault();
          e.stopPropagation();
          moveKeyboard(grid ? -1 : vertical ? -1 : rtl ? 1 : -1, vertical && !grid ? "cross" : "main");
          break;
        case "Tab":
          // Leaving the activator cancels an in-flight keyboard drag.
          announce(msg().onDragCancel({ label: labelOf(drag.value), position: drag.fromIndex + 1 }));
          endDrag();
          break;
        default:
          break;
      }
    },
    [announce, beginDrag, commit, disabled, endDrag, gridColumns, labelOf, moveKeyboard, msg, orientation, over],
  );

  /** Per-item sibling-gap offset (main axis, px) for the current projection. */
  const offsetFor = React.useCallback(
    (containerId: string, index: number, value: string): number => {
      const drag = dragRef.current;
      if (!drag || !over || !active) return 0;
      // A wrapping grid can't model its gap as a 1D translate (a shift wraps rows), and a
      // multi-item drag pulls items from scattered positions — both skip the animated
      // sibling-gap; feedback is the drop indicator + follow.
      if (isGrid(orientation) || drag.values.length > 1) return 0;
      const step = drag.step;
      // The active item itself: in keyboard mode, glide to its projected slot;
      // in pointer mode it follows the cursor (handled in render), so 0 here.
      if (value === active.value) {
        if (mode !== "keyboard") return 0;
        if (over.container !== drag.fromContainer) return 0; // crossing → overlay/glide handled by ghost
        const slots = over.index - drag.fromIndex;
        return slots * step;
      }
      // Same container as the drag source: close the gap left behind, open one
      // at the target — items between the two indices shift by one step.
      if (containerId === drag.fromContainer && over.container === drag.fromContainer) {
        if (index > drag.fromIndex && index <= over.index) return -step;
        if (index < drag.fromIndex && index >= over.index) return step;
        return 0;
      }
      // The source container after the item left: everything past it closes up.
      if (containerId === drag.fromContainer && over.container !== drag.fromContainer) {
        return index > drag.fromIndex ? -step : 0;
      }
      // The target container: open a gap at/after the insertion index.
      if (containerId === over.container) {
        return index >= over.index ? step : 0;
      }
      return 0;
    },
    [active, mode, over, orientation],
  );

  // The shared keyboard-instructions node backs every activator's describedby.
  React.useEffect(() => ensureInstructions(), []);

  // On the reordered drop frame, glide the dragged element from where it was
  // released to its final slot (FLIP) instead of teleporting — then release the
  // one-frame snap that keeps the *peers* from animating a stale offset. A layout
  // effect so the measure + inverse transform land before paint (no flash at the
  // final slot first). The item's React style is `{}` here (drag state cleared), so
  // the inline transform/transition we drive won't be clobbered by a re-render.
  useIsomorphicLayoutEffect(() => {
    if (!dropping) return;
    const flip = dropFlipRef.current;
    dropFlipRef.current = null;
    flipCleanupRef.current?.(); // cancel any settle still in flight
    flipCleanupRef.current = null;
    const el = flip ? elementsRef.current.get(flip.value) : null;
    const reduce =
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (flip && el && !reduce) {
      const last = el.getBoundingClientRect();
      const dx = flip.first.left - last.left;
      const dy = flip.first.top - last.top;
      // Sub-pixel deltas aren't worth a transition (keyboard drops land here with
      // ~0, since the active item was already translated to its projected slot).
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        // Invert to the release point with no transition…
        el.style.transition = "none";
        el.style.transform = `translate(${dx}px, ${dy}px)`;
        void el.offsetWidth; // commit the start frame before playing
        // …then play to the slot with a gentle overshoot — the item glides in,
        // barely past its slot, and settles: the "drop-to-place" landing.
        el.style.transition =
          "transform var(--garn-motion-fast) var(--garn-ease-out-back)";
        el.style.transform = "";
        const done = (ev?: TransitionEvent) => {
          if (ev && ev.propertyName !== "transform") return;
          el.style.transition = "";
          el.style.transform = "";
          el.removeEventListener("transitionend", done);
          flipCleanupRef.current = null;
        };
        el.addEventListener("transitionend", done);
        flipCleanupRef.current = done; // idempotent hard-stop
      }
    }
    setDropping(false);
  }, [dropping]);

  React.useEffect(() => {
    // Reset on every (re)mount — React StrictMode mounts, runs this cleanup (which
    // sets `unmountedRef = true`), then re-mounts WITHOUT re-initializing the ref,
    // so without this the flag stays `true` for the real lifetime and `activate`'s
    // post-unmount guard kills every pointer drag in dev. (Keyboard reorder skips
    // `activate`, which is why only pointer drag was affected.)
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      watchDetachRef.current?.();
      flipCleanupRef.current?.();
      clearRaf();
      stopAutoScroll();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancelRef.current);
      if (dragKeydownRef.current) {
        window.removeEventListener("keydown", dragKeydownRef.current, true);
        dragKeydownRef.current = null;
      }
      if (typeof document !== "undefined") document.removeEventListener("touchmove", preventTouchScroll);
    };
  }, [clearRaf, onPointerMove, onPointerUp, preventTouchScroll, stopAutoScroll]);

  return React.useMemo<Coordinator>(
    () => ({
      orientation,
      disabled,
      activationDistance,
      lockAxis,
      dropIndicator,
      collision,
      active,
      activeValues,
      over,
      mode,
      pointer,
      origin,
      dropping,
      hasOverlay,
      registerContainer,
      registerItem,
      itemRef,
      registerOverlay,
      offsetFor,
      pointerStart,
      keyDown,
    }),
    [
      orientation, disabled, activationDistance, lockAxis, dropIndicator, collision, active, activeValues, over, mode, pointer, origin, dropping, hasOverlay,
      registerContainer, registerItem, itemRef, registerOverlay, offsetFor, pointerStart, keyDown,
    ],
  );
}
// #endregion machine
// #region root — Sortable root, standalone machine, droppable container

/* --------------------------------------------------------------- Sortable -- */

export interface SortableProps
  extends Omit<
    React.ComponentProps<"div">,
    "id" | "defaultValue" | "onDragStart" | "onDragEnd" | "onDragOver"
  > {
  /** Ordered item keys (controlled). */
  value?: string[];
  /** Ordered item keys (uncontrolled initial). */
  defaultValue?: string[];
  /** Fires with the next order and what moved. */
  onValueChange?: (value: string[], meta: ReorderMeta) => void;
  /**
   * Layout + axis: `vertical`, `horizontal`, or a wrapping 2D `grid`.
   * @default "vertical"
   */
  orientation?: "vertical" | "horizontal" | "grid";
  /**
   * Turn dragging off entirely — items stay in place and lose their activator.
   * @default false
   */
  disabled?: boolean;
  /** Container id — auto-generated; set it when composing a Board by hand. */
  id?: string;
  /** Override the screen-reader announcements (pick-up / move / drop / cancel); merged over the defaults, so pass only the messages you want to change. */
  announcements?: Partial<SortableAnnouncements>;
  /** Map an item key to the label screen readers announce. */
  getItemLabel?: (value: string) => string;
  /** Fires when a drag lifts an item. */
  onDragStart?: (e: { value: string }) => void;
  /** Fires when a drag commits — the reorder, with the moved value and its from/to. */
  onDragEnd?: (e: ReorderMeta) => void;
  /** Fires when a drag is cancelled (Escape / pointer cancel) and the item returns. */
  onDragCancel?: (e: { value: string }) => void;
  /**
   * Pointer travel (px) before a mouse/pen drag begins — guards clicks.
   * @default 4
   */
  activationDistance?: number;
  /**
   * Long-press (ms) before a *touch* drag begins — a quick swipe scrolls instead.
   * @default 140
   */
  touchDelay?: number;
  /**
   * Auto-scroll the nearest scroll container when dragging near its edge.
   * @default true
   */
  autoScroll?: boolean;
  /**
   * Constrain the self-translate follow to the main axis.
   * @default true
   */
  lockAxis?: boolean;
  /**
   * Show a built-in insertion line at the drop position.
   * @default false
   */
  dropIndicator?: boolean;
  /**
   * Drop-index projection: `pointer` (1D main-axis) or `closest-center` (2D reading order).
   * @default "pointer"
   */
  collision?: "pointer" | "closest-center";
  /** Selected item values — dragging one moves the whole set (multi-item drag). */
  selectedValues?: string[];
  /** Fires when the projected drop slot (container/index) changes. */
  onDragOver?: (e: DragOverEvent) => void;
  /** Fires for every drag point: rAF-throttled moves, auto-scroll re-projections, and a synchronous final point at the drop. */
  onDragMove?: (e: DragMoveEvent) => void;
  /**
   * Render as the child element (merging props) instead of a `div`.
   * @default false
   */
  asChild?: boolean;
}

/**
 * An accessible, zero-dependency reorder container — the drag-and-drop primitive
 * behind List, Tree, Table, and Board. Standalone it owns the drag machine (a
 * single list); inside a `Sortable.Group` it registers as one Board column and
 * defers the machine to the group. Keyboard-drivable and screen-reader-announced
 * by default.
 *
 * Documentation: https://garn.ohuba.com/components/sortable
 */
function Sortable(props: SortableProps) {
  const parent = React.useContext(CoordinatorContext);
  return parent ? (
    <SortableContainer coordinator={parent} {...props} />
  ) : (
    <SortableStandalone {...props} />
  );
}

/** Standalone list: create a one-container coordinator, then render as a column. */
function SortableStandalone(props: SortableProps) {
  const { machine, rest } = splitMachineProps(props);
  const coordinator = useCoordinatorMachine(machine);
  return (
    <CoordinatorContext.Provider value={coordinator}>
      <SortableContainer
        coordinator={coordinator}
        orientation={machine.orientation}
        disabled={machine.disabled}
        {...rest}
      />
    </CoordinatorContext.Provider>
  );
}

/** The droppable region: registers itself + owns this container's ordered keys. */
function SortableContainer(
  props: SortableProps & { coordinator: Coordinator },
) {
  // One-shot strip of every machine option (consumed by whoever owns the
  // machine) — a newly added option can never leak onto the DOM div.
  const { rest: ownProps } = splitMachineProps(props);
  const {
    coordinator,
    value,
    defaultValue = [],
    onValueChange,
    id: idProp,
    asChild,
    className,
    ...rest
  } = ownProps;
  const orientation = props.orientation ?? coordinator.orientation;
  const disabled = props.disabled ?? coordinator.disabled;

  const reactId = React.useId();
  const id = idProp ?? reactId;
  const elRef = React.useRef<HTMLDivElement>(null);
  const [order, setOrder] = useControllableState<string[]>({
    value,
    defaultValue,
    onChange: () => {},
  });
  const orderRef = React.useRef(order);
  orderRef.current = order;

  const commit = React.useCallback(
    (next: string[], meta: ReorderMeta) => {
      setOrder(next);
      onValueChange?.(next, meta);
    },
    [onValueChange, setOrder],
  );

  // Register this droppable with the coordinator. The element ref is live
  // (attached before effects run) so `measure()` can read the container rect.
  React.useEffect(() => {
    return coordinator.registerContainer({
      id,
      orientation,
      element: elRef.current,
      getValues: () => orderRef.current,
      setValues: commit,
    });
  }, [coordinator, id, orientation, commit]);

  const dragging = coordinator.active?.fromContainer === id || coordinator.over?.container === id;
  const Comp = asChild ? Slot : "div";

  return (
    <ContainerContext.Provider value={{ id, orientation, order }}>
      <Comp
        ref={elRef}
        data-slot="sortable"
        data-orientation={orientation}
        data-dragging={dragging || undefined}
        data-disabled={disabled || undefined}
        className={cn(
          "relative flex gap-[var(--garn-gap-stack)]",
          isVertical(orientation) && "flex-col",
          orientation === "horizontal" && "flex-row",
          isGrid(orientation) && "flex-row flex-wrap",
          className,
        )}
        {...rest}
      />
    </ContainerContext.Provider>
  );
}
// #endregion root
// #region group — Sortable.Group: cross-column Board coordinator

/* ----------------------------------------------------------- SortableGroup - */

export interface SortableGroupProps
  extends Omit<React.ComponentProps<"div">, "onDragStart" | "onDragEnd" | "onDragOver"> {
  /**
   * Layout + axis for the columns' items: `vertical`, `horizontal`, or `grid`.
   * @default "vertical"
   */
  orientation?: "vertical" | "horizontal" | "grid";
  /**
   * Turn dragging off across every column.
   * @default false
   */
  disabled?: boolean;
  /**
   * Pointer travel (px) before a mouse/pen drag begins.
   * @default 4
   */
  activationDistance?: number;
  /**
   * Long-press (ms) before a touch drag begins.
   * @default 140
   */
  touchDelay?: number;
  /**
   * Auto-scroll the nearest scroll container when dragging near its edge.
   * @default true
   */
  autoScroll?: boolean;
  /**
   * Constrain the self-translate follow to the main axis.
   * @default true
   */
  lockAxis?: boolean;
  /**
   * Show a built-in insertion line at the drop position.
   * @default false
   */
  dropIndicator?: boolean;
  /**
   * Drop-index projection: `pointer` (1D) or `closest-center` (2D reading order).
   * @default "pointer"
   */
  collision?: "pointer" | "closest-center";
  /** Selected item values — dragging one moves the whole set (multi-item drag). */
  selectedValues?: string[];
  /** Fires when the projected drop slot (container/index) changes. */
  onDragOver?: (e: DragOverEvent) => void;
  /** Fires for every drag point: rAF-throttled moves, auto-scroll re-projections, and a synchronous final point at the drop. */
  onDragMove?: (e: DragMoveEvent) => void;
  /** Override the screen-reader announcements; merged over the defaults. */
  announcements?: Partial<SortableAnnouncements>;
  /** Map an item key to the label screen readers announce. */
  getItemLabel?: (value: string) => string;
  /** Fires when a drag lifts an item in any column. */
  onDragStart?: (e: { value: string }) => void;
  /** Fires when a drag commits — the reorder, with the moved value and its from/to (across columns). */
  onDragEnd?: (e: ReorderMeta) => void;
  /** Fires when a drag is cancelled and the item returns. */
  onDragCancel?: (e: { value: string }) => void;
  /**
   * Render as the child element (merging props) instead of a `div`.
   * @default false
   */
  asChild?: boolean;
}

/**
 * A Board coordinator — hoists one drag machine across the child `Sortable`
 * columns so an item can move between them. Pair with a `Sortable.Overlay` so
 * the dragged item escapes each column's clipping.
 */
function SortableGroup(props: SortableGroupProps) {
  const { machine, rest } = splitMachineProps(props);
  const { asChild, className, ...domProps } = rest;
  const coordinator = useCoordinatorMachine(machine);
  const Comp = asChild ? Slot : "div";
  return (
    <CoordinatorContext.Provider value={coordinator}>
      <Comp
        data-slot="sortable-group"
        data-orientation={machine.orientation}
        data-dragging={coordinator.active ? true : undefined}
        className={cn("flex gap-[var(--garn-gap-inline)]", className)}
        {...domProps}
      />
    </CoordinatorContext.Provider>
  );
}
// #endregion group
// #region item — Sortable.Item, drop line, handle detection

/* ------------------------------------------------------------ SortableItem - */

export interface SortableItemProps extends React.ComponentProps<"div"> {
  /** The item's stable key — its identity in the ordered `value`. */
  value: string;
  /**
   * Make this item non-draggable (a pinned/locked row).
   * @default false
   */
  disabled?: boolean;
  /** Declare that a `Sortable.Handle` lives somewhere in this item's rendered
   *  output. The automatic detection only walks the JSX you pass as children —
   *  a handle rendered *inside* one of your own components is invisible to it,
   *  which would silently make the whole item the activator. */
  hasHandle?: boolean;
  /**
   * Render as the child element (merging props) instead of a `div`.
   * @default false
   */
  asChild?: boolean;
}

/** A `value`-keyed reorderable cell. The activator when it holds no Handle. */
function SortableItem(props: SortableItemProps) {
  const {
    value,
    disabled: itemDisabled = false,
    hasHandle: hasHandleProp,
    asChild,
    className,
    style,
    children,
    onPointerDown,
    onKeyDown,
    ...rest
  } = props;
  const coordinator = useCoordinator();
  const container = React.useContext(ContainerContext);
  if (!container) throw new Error("<Sortable.Item> must render inside a <Sortable>.");

  const disabled = coordinator.disabled || itemDisabled;
  const walkedHandle = React.useMemo(() => containsHandle(children), [children]);
  const hasHandle = hasHandleProp ?? walkedHandle;
  const isActivator = !hasHandle && !disabled;

  const { active, hidden, dropEdge, dragCount, props: itemProps } = buildItemProps({
    coordinator,
    containerId: container.id,
    orientation: container.orientation,
    order: container.order,
    value,
    disabled,
    hasHandle,
  });

  const Comp = asChild ? Slot : "div";
  return (
    <ItemContext.Provider value={{ value, disabled, active }}>
      <Comp
        // Residual consumer props first — the drag wiring below must not be
        // clobbered by a consumer's spread; their handlers compose instead.
        {...rest}
        {...itemProps}
        onPointerDown={(e: React.PointerEvent<HTMLDivElement>) => {
          onPointerDown?.(e);
          if (!e.defaultPrevented) itemProps.onPointerDown?.(e);
        }}
        onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
          onKeyDown?.(e);
          if (!e.defaultPrevented) itemProps.onKeyDown?.(e);
        }}
        style={{ ...style, ...itemProps.style }}
        className={cn(
          "relative outline-none",
          // The lifted card rides above its peers with elevation; peers glide to
          // open the gap. The active item skips the transition so it tracks the
          // pointer 1:1 (only the smoothing on peers is motion; the drag is not).
          active
            ? "z-10 cursor-grabbing shadow-lg"
            : "z-0 transition-transform ease-standard duration-[var(--garn-motion-fast)] motion-reduce:transition-none",
          // The commit frame reorders the DOM — snap, don't animate the stale offset.
          coordinator.dropping && "transition-none",
          isActivator && "cursor-grab focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring",
          hidden && "opacity-0 shadow-none",
          disabled && "cursor-default",
          className,
        )}
      >
        {children}
        {dropEdge ? <SortableDropLine edge={dropEdge} orientation={container.orientation} /> : null}
        {dragCount > 1 ? (
          <span
            data-slot="sortable-drag-count"
            aria-hidden
            className="absolute -right-2 -top-2 z-20 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-solid px-1 text-xs font-medium text-brand-solid-foreground shadow-sm"
          >
            {dragCount}
          </span>
        ) : null}
      </Comp>
    </ItemContext.Provider>
  );
}

/** The built-in insertion line drawn at a `Sortable.Item`'s drop edge when the root
 *  `dropIndicator` is on. A token-styled rule with a leading dot, centered in the gap
 *  on the main-axis start/end edge (top/bottom for a column, inline-start/end for a row). */
function SortableDropLine({ edge, orientation }: { edge: "start" | "end"; orientation: SortableOrientation }) {
  const vertical = isVertical(orientation);
  return (
    <span
      data-slot="sortable-drop-indicator"
      aria-hidden
      className={cn(
        "pointer-events-none absolute z-20 rounded-full bg-brand-solid before:absolute before:size-1.5 before:rounded-full before:bg-brand-solid",
        vertical
          ? "inset-x-0 h-0.5 before:top-1/2 before:-left-0.5 before:-translate-y-1/2"
          : "inset-y-0 w-0.5 before:left-1/2 before:-top-0.5 before:-translate-x-1/2",
        vertical && edge === "start" && "-top-[calc(var(--garn-gap-stack)/2)]",
        vertical && edge === "end" && "-bottom-[calc(var(--garn-gap-stack)/2)]",
        !vertical && edge === "start" && "-left-[calc(var(--garn-gap-inline)/2)]",
        !vertical && edge === "end" && "-right-[calc(var(--garn-gap-inline)/2)]",
      )}
    />
  );
}

/** Does this item's subtree contain a `Sortable.Handle`? (walks elements) */
function containsHandle(children: React.ReactNode): boolean {
  let found = false;
  const walk = (node: React.ReactNode) => {
    React.Children.forEach(node, (child) => {
      if (found || !React.isValidElement(child)) return;
      if ((child.type as { __garnSlot?: string }).__garnSlot === "sortable-handle") {
        found = true;
        return;
      }
      const kids = (child.props as { children?: React.ReactNode }).children;
      if (kids) walk(kids);
    });
  };
  walk(children);
  return found;
}
// #endregion item
// #region handle — Sortable.Handle drag-affordance button

/* ---------------------------------------------------------- SortableHandle - */

export interface SortableHandleProps extends React.ComponentProps<"button"> {
  /**
   * Accessible name for the icon-only handle.
   * @default "Drag to reorder"
   */
  label?: string;
  /**
   * Render as the child element (merging props) instead of a `button`.
   * @default false
   */
  asChild?: boolean;
}

/** The drag affordance. When present, only it starts a drag (not the row). */
function SortableHandle(props: SortableHandleProps) {
  const { label = "Drag to reorder", asChild, className, children, onPointerDown, onKeyDown, ...rest } = props;
  const coordinator = useCoordinator();
  const container = React.useContext(ContainerContext);
  const item = React.useContext(ItemContext);
  if (!container || !item) throw new Error("<Sortable.Handle> must render inside a <Sortable.Item>.");
  const disabled = item.disabled;
  const handleProps = buildHandleProps({
    coordinator,
    containerId: container.id,
    value: item.value,
    disabled,
    label,
  });
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      // Residual consumer props first — the drag wiring below must not be
      // clobbered by a consumer's spread; their handlers compose instead.
      {...rest}
      {...handleProps}
      onPointerDown={(e: React.PointerEvent<HTMLButtonElement>) => {
        onPointerDown?.(e);
        if (!e.defaultPrevented) handleProps.onPointerDown?.(e);
      }}
      onKeyDown={(e: React.KeyboardEvent<HTMLButtonElement>) => {
        onKeyDown?.(e);
        if (!e.defaultPrevented) handleProps.onKeyDown?.(e);
      }}
      type={asChild ? undefined : "button"}
      disabled={asChild ? undefined : disabled}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none",
        "size-[var(--garn-control-h-sm)]",
        "cursor-grab hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
        "data-[disabled]:cursor-default data-[disabled]:opacity-50",
        "[&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
    >
      {children ?? <GripVerticalIcon aria-hidden />}
    </Comp>
  );
}
(SortableHandle as unknown as { __garnSlot: string }).__garnSlot = "sortable-handle";
// #endregion handle
// #region overlay — Sortable.Overlay portal ghost

/* --------------------------------------------------------- SortableOverlay - */

export interface SortableOverlayProps {
  /** Render the ghost for the active key (clip-free; follows the pointer). */
  children: (activeValue: string) => React.ReactNode;
  className?: string;
}

/** A portal ghost that follows the pointer. Enables Board / clipping-proof drag. */
function SortableOverlay({ children, className }: SortableOverlayProps) {
  const coordinator = useCoordinator();
  const { registerOverlay } = coordinator;
  React.useEffect(() => registerOverlay(), [registerOverlay]);

  const active = coordinator.active;
  const pointer = coordinator.pointer;
  if (typeof document === "undefined" || !active || !pointer) return null;

  return createPortal(
    <div
      data-slot="sortable-overlay"
      data-orientation={coordinator.orientation}
      aria-hidden
      className={cn("pointer-events-none fixed left-0 top-0 z-50 shadow-lg", className)}
      style={{ transform: `translate(${pointer.x}px, ${pointer.y}px)` }}
    >
      {children(active.value)}
    </div>,
    document.body,
  );
}
// #endregion overlay
// #region use-sortable — headless useSortable core: order + prop getters

/* ---------------------------------------------------------- useSortable ---- */

export interface UseSortableOptions {
  /** Ordered item keys (controlled). */
  value?: string[];
  /** Ordered item keys (uncontrolled initial). */
  defaultValue?: string[];
  /** Fires with the next order and what moved. */
  onValueChange?: (value: string[], meta: ReorderMeta) => void;
  /**
   * Reorder axis: `vertical`, `horizontal`, or a wrapping 2D `grid`.
   * @default "vertical"
   */
  orientation?: SortableOrientation;
  /**
   * Turn dragging off entirely.
   * @default false
   */
  disabled?: boolean;
  /** Container id — auto-generated when omitted. */
  id?: string;
  /** Override the screen-reader announcements; merged over the defaults. */
  announcements?: Partial<SortableAnnouncements>;
  /** Map an item key to the label screen readers announce. */
  getItemLabel?: (value: string) => string;
  /** Fires when a drag lifts an item. */
  onDragStart?: (e: { value: string }) => void;
  /** Fires when a drag commits — the reorder, with the moved value and its from/to. */
  onDragEnd?: (e: ReorderMeta) => void;
  /** Fires when a drag is cancelled and the item returns. */
  onDragCancel?: (e: { value: string }) => void;
  /**
   * Pointer travel (px) before a mouse/pen drag begins.
   * @default 4
   */
  activationDistance?: number;
  /**
   * Long-press (ms) before a touch drag begins.
   * @default 140
   */
  touchDelay?: number;
  /**
   * Auto-scroll the nearest scroll container when dragging near its edge.
   * @default true
   */
  autoScroll?: boolean;
  /**
   * Constrain the self-translate follow to the main axis.
   * @default true
   */
  lockAxis?: boolean;
  /**
   * Show a built-in insertion line at the drop position.
   * @default false
   */
  dropIndicator?: boolean;
  /**
   * Drop-index projection: `pointer` (1D) or `closest-center` (2D reading order).
   * @default "pointer"
   */
  collision?: CollisionStrategy;
  /** Selected item values — dragging one moves the whole set (multi-item drag). */
  selectedValues?: string[];
  /** Fires when the projected drop slot (container/index) changes. */
  onDragOver?: (e: DragOverEvent) => void;
  /** Fires for every drag point: rAF-throttled moves, auto-scroll re-projections, and a synchronous final point at the drop. */
  onDragMove?: (e: DragMoveEvent) => void;
}

export interface UseSortableReturn {
  /** The live order (drives your row `.map`). */
  order: string[];
  /** The key currently being dragged, or null. */
  activeValue: string | null;
  isDragging: boolean;
  /** Spread on the list root — attaches the measured-container ref + data-attrs. */
  getContainerProps: () => DragDomProps;
  /** Spread on each row element (an `<li>`, `<tr>`, node div). Pass `handle:true`
   *  when a dedicated handle drives the drag, so the row itself is not the activator
   *  (keep this for semantic `<ul>`/`<li>` / `<tr>` rows — a `role="button"` on them
   *  would break their list/grid semantics). */
  getItemProps: (
    value: string,
    opts?: { disabled?: boolean; handle?: boolean },
  ) => DragDomProps;
  /** Spread on a handle `<button>` inside a row. */
  getHandleProps: (
    value: string,
    opts?: { disabled?: boolean; label?: string },
  ) => ReturnType<typeof buildHandleProps>;
}

/**
 * The headless engine behind `Sortable` — for wiring accessible single-list reorder
 * into a component that already owns its row element (`list`, `tree`, `table`). Call
 * it where you render the rows, then spread the prop-getters onto your own markup:
 *
 * ```tsx
 * const s = useSortable({ value: ids, onValueChange: setIds });
 * return (
 *   <ul {...s.getContainerProps()}>
 *     {s.order.map((id) => <li key={id} {...s.getItemProps(id)}>{label(id)}</li>)}
 *   </ul>
 * );
 * ```
 *
 * Single-container only (the row-integration case). For a Board, use the
 * `Sortable.Group` components — cross-container coordination needs the shared context.
 */
export function useSortable(options: UseSortableOptions = {}): UseSortableReturn {
  const { machine } = splitMachineProps(options);
  const { orientation, disabled } = machine;
  const { value, defaultValue = [], onValueChange, id: idProp } = options;

  const coordinator = useCoordinatorMachine(machine);

  const reactId = React.useId();
  const id = idProp ?? reactId;
  const elRef = React.useRef<HTMLElement | null>(null);
  const [order, setOrder] = useControllableState<string[]>({
    value,
    defaultValue,
    onChange: () => {},
  });
  const orderRef = React.useRef(order);
  orderRef.current = order;

  const commit = React.useCallback(
    (next: string[], meta: ReorderMeta) => {
      setOrder(next);
      onValueChange?.(next, meta);
    },
    [onValueChange, setOrder],
  );

  React.useEffect(() => {
    return coordinator.registerContainer({
      id,
      orientation,
      element: elRef.current,
      getValues: () => orderRef.current,
      setValues: commit,
    });
  }, [coordinator, id, orientation, commit]);

  const containerRef = React.useCallback((node: HTMLElement | null) => {
    elRef.current = node;
  }, []);

  const dragging = coordinator.active?.fromContainer === id || coordinator.over?.container === id;

  const getContainerProps = React.useCallback(
    () => ({
      ref: containerRef,
      // project() measures items via offsetTop relative to the container — the
      // container must be the offsetParent or pointer projection lands wrong.
      style: { position: "relative" } as const,
      "data-slot": "sortable",
      "data-orientation": orientation,
      "data-dragging": dragging || undefined,
    }),
    [containerRef, orientation, dragging],
  );

  const getItemProps = React.useCallback(
    (itemValue: string, opts: { disabled?: boolean; handle?: boolean } = {}) =>
      buildItemProps({
        coordinator,
        containerId: id,
        orientation,
        order: orderRef.current,
        value: itemValue,
        disabled: disabled || !!opts.disabled,
        hasHandle: !!opts.handle,
      }).props,
    [coordinator, id, orientation, disabled],
  );

  const getHandleProps = React.useCallback(
    (itemValue: string, opts: { disabled?: boolean; label?: string } = {}) =>
      buildHandleProps({
        coordinator,
        containerId: id,
        value: itemValue,
        disabled: disabled || !!opts.disabled,
        label: opts.label ?? "Drag to reorder",
      }),
    [coordinator, id, disabled],
  );

  return {
    order,
    activeValue: coordinator.active?.value ?? null,
    isDragging: !!coordinator.active,
    getContainerProps,
    getItemProps,
    getHandleProps,
  };
}
// #endregion use-sortable
// #region exports — compound component assembly and exports

/* --------------------------------------------------------------- exports --- */

type SortableComponent = typeof Sortable & {
  Item: typeof SortableItem;
  Handle: typeof SortableHandle;
  Overlay: typeof SortableOverlay;
  Group: typeof SortableGroup;
};

const SortableRoot = Sortable as SortableComponent;
SortableRoot.Item = SortableItem;
SortableRoot.Handle = SortableHandle;
SortableRoot.Overlay = SortableOverlay;
SortableRoot.Group = SortableGroup;

export {
  SortableRoot as Sortable,
  SortableItem,
  SortableHandle,
  SortableOverlay,
  SortableGroup,
};
export type { SortableAnnouncements };
// #endregion exports
