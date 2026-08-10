"use client";

import * as React from "react";

/**
 * `useLayoutEffect` in the browser, `useEffect` on the server — measure/mutate
 * the DOM before paint (no flash) without React's SSR "useLayoutEffect does
 * nothing on the server" warning. Use for pre-paint reads like auto-sizing.
 */
export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;
