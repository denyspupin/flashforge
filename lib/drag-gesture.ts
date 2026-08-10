"use client";

/**
 * Shared drag-gesture physics — the ONE set of touch/auto-scroll numbers and
 * helpers behind every drag surface (sortable, scheduler), so touch drags feel
 * identical across components. `lib/use-long-press` stays separate: that is a
 * React-props press-and-hold affordance; this module is the DOM-level sensor
 * kit for pointer-drag machines.
 */

/** Long-press before a touch starts a drag — a quick swipe scrolls instead. */
export const TOUCH_DELAY_MS = 140;
/** Finger travel (px) before the delay that reads as scroll-intent and aborts. */
export const TOUCH_TOLERANCE = 6;
/** Edge zone as a fraction of the scroll container's length… */
export const AUTOSCROLL_EDGE_RATIO = 0.2;
/** …capped at this many px, so huge containers don't get a huge dead-scroll band. */
export const AUTOSCROLL_EDGE_MAX = 96;
/** Scroll speed (px/frame) at the very edge; scales down toward the zone's inner edge. */
export const AUTOSCROLL_MAX_SPEED = 14;

/** The nearest scrollable ancestor of `el` (overflow auto/scroll with room to move),
 *  falling back to the document scroller for page-level auto-scroll. */
export function scrollableAncestor(el: Element | null): Element | null {
  let node: Element | null = el;
  while (node && node !== document.body && node !== document.documentElement) {
    const s = getComputedStyle(node);
    const canY = (s.overflowY === "auto" || s.overflowY === "scroll") && node.scrollHeight > node.clientHeight;
    const canX = (s.overflowX === "auto" || s.overflowX === "scroll") && node.scrollWidth > node.clientWidth;
    if (canY || canX) return node;
    node = node.parentElement;
  }
  return document.scrollingElement;
}

/** Per-axis auto-scroll velocity for a pointer at (x,y) over `el`; 0 away from the
 *  edge zone or when that axis is already scrolled to its end. */
export function edgeVelocity(el: Element, x: number, y: number): { vx: number; vy: number } {
  const pageScroller = el === document.scrollingElement || el === document.documentElement;
  const rect = pageScroller
    ? { top: 0, left: 0, right: window.innerWidth, bottom: window.innerHeight, width: window.innerWidth, height: window.innerHeight }
    : el.getBoundingClientRect();
  const speed = (depth: number) => AUTOSCROLL_MAX_SPEED * Math.min(1, Math.max(0, depth));
  const zoneY = Math.min(rect.height * AUTOSCROLL_EDGE_RATIO, AUTOSCROLL_EDGE_MAX);
  const zoneX = Math.min(rect.width * AUTOSCROLL_EDGE_RATIO, AUTOSCROLL_EDGE_MAX);
  let vy = 0;
  let vx = 0;
  if (zoneY > 0) {
    if (y < rect.top + zoneY) vy = -speed((rect.top + zoneY - y) / zoneY);
    else if (y > rect.bottom - zoneY) vy = speed((y - (rect.bottom - zoneY)) / zoneY);
  }
  if (zoneX > 0) {
    if (x < rect.left + zoneX) vx = -speed((rect.left + zoneX - x) / zoneX);
    else if (x > rect.right - zoneX) vx = speed((x - (rect.right - zoneX)) / zoneX);
  }
  if (vy < 0 && el.scrollTop <= 0) vy = 0;
  if (vy > 0 && el.scrollTop + el.clientHeight >= el.scrollHeight) vy = 0;
  if (vx < 0 && el.scrollLeft <= 0) vx = 0;
  if (vx > 0 && el.scrollLeft + el.clientWidth >= el.scrollWidth) vx = 0;
  return { vx, vy };
}

export interface LongPressWatchOptions {
  /** The originating pointer — other touches never steer or cancel the watch. */
  pointerId: number;
  x: number;
  y: number;
  delay?: number;
  tolerance?: number;
  /** Fires (already detached) when the press held still long enough. */
  onActivate: (x: number, y: number) => void;
}

/** DOM-level touch long-press watcher for drag activation: fires `onActivate`
 *  after `delay` unless the finger travels past `tolerance` (scroll intent) or
 *  lifts first. Returns a detach() for teardown (e.g. unmount mid-press). */
export function watchLongPress(options: LongPressWatchOptions): () => void {
  const { pointerId, x, y, delay = TOUCH_DELAY_MS, tolerance = TOUCH_TOLERANCE, onActivate } = options;
  let timer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
    detach();
    onActivate(x, y);
  }, delay);
  const onMove = (ev: PointerEvent) => {
    if (ev.pointerId !== pointerId) return;
    if (Math.hypot(ev.clientX - x, ev.clientY - y) > tolerance) detach();
  };
  const onEnd = (ev: PointerEvent) => {
    if (ev.pointerId === pointerId) detach();
  };
  function detach() {
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onEnd);
    window.removeEventListener("pointercancel", onEnd);
  }
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onEnd);
  window.addEventListener("pointercancel", onEnd);
  return detach;
}
