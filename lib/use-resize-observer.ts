"use client";

import * as React from "react";

/**
 * Observe an element's size with a `ResizeObserver` — the primitive for
 * reacting to layout changes (auto-resize, responsive measurement) without
 * hand-rolling the observer + cleanup each time. `onResize` fires with each
 * entry; the latest callback is always used (no re-subscribe on every render).
 * No-op where `ResizeObserver` is unavailable (SSR / older engines).
 */
export function useResizeObserver<T extends Element>(
  ref: React.RefObject<T | null>,
  onResize: (entry: ResizeObserverEntry) => void
): void {
  const cb = React.useRef(onResize);
  React.useEffect(() => {
    cb.current = onResize;
  });

  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) cb.current(entry);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
}

/**
 * The ergonomic wrapper — attach the returned ref to an element and read its
 * live `{ width, height }` (content-box). Starts at `0 × 0` and updates after
 * mount, so SSR and the first client render agree.
 */
export function useElementSize<T extends Element>(): readonly [
  React.RefObject<T | null>,
  { width: number; height: number },
] {
  const ref = React.useRef<T | null>(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });

  useResizeObserver(ref, (entry) => {
    const { width, height } = entry.contentRect;
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  });

  return [ref, size] as const;
}
