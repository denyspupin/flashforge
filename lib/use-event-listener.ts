"use client";

import * as React from "react";

/**
 * Subscribe to an event with automatic cleanup — the primitive that ends the
 * hand-rolled `addEventListener` / `removeEventListener` pair. The listener
 * always calls the latest `handler` (stored in a ref), so it never re-subscribes
 * on every render and never goes stale. Defaults to `window`; pass
 * `options.target` for `document` (or `null` to skip, e.g. during SSR).
 */
export function useEventListener<K extends keyof WindowEventMap>(
  type: K,
  handler: (event: WindowEventMap[K]) => void,
  options?: { target?: Window | Document | null; capture?: boolean; passive?: boolean }
): void {
  const saved = React.useRef(handler);
  React.useEffect(() => {
    saved.current = handler;
  });

  const { target, capture, passive } = options ?? {};
  React.useEffect(() => {
    const el: Window | Document | null =
      target === undefined ? (typeof window !== "undefined" ? window : null) : target;
    if (!el) return;
    const listener = (event: Event) => saved.current(event as WindowEventMap[K]);
    const opts: AddEventListenerOptions = { capture, passive };
    el.addEventListener(type, listener, opts);
    return () => el.removeEventListener(type, listener, opts);
  }, [type, target, capture, passive]);
}
