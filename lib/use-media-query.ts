"use client";

import * as React from "react";

/**
 * Subscribe to a CSS media query and re-render on change — the responsive
 * primitive consumers (and AppShell) use instead of inlining `matchMedia`.
 * Starts `false` and syncs in an effect so SSR and the first client render agree
 * (no hydration mismatch); on environments without `matchMedia` (SSR, some test
 * envs) it stays `false`. The listener is cleaned up on unmount / query change.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
