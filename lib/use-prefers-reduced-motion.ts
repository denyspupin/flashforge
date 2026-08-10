"use client";

import { useMediaQuery } from "./use-media-query";

/**
 * `true` when the user has asked the OS to minimize motion
 * (`prefers-reduced-motion: reduce`) — gate non-essential animation and
 * transitions behind it so the reduced-motion audience gets a still UI. Built on
 * `useMediaQuery`, so it inherits the same SSR safety: starts `false` and syncs
 * after mount (no hydration mismatch).
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}
