"use client";

import * as React from "react";

/**
 * Copy-to-clipboard with a self-resetting `copied` flag — the primitive behind
 * every garn copy affordance (Badge, DataList). `copy(text)` writes to the
 * clipboard and, only on a real success, flips `copied` to `true` for `timeout`
 * ms; a missing Clipboard API (insecure context / SSR) or a rejected write is
 * swallowed so the UI never announces a copy that didn't happen. The reset timer
 * is cleared on unmount.
 */
export function useClipboard(opts?: { timeout?: number }): {
  copied: boolean;
  copy: (text: string) => Promise<void>;
} {
  const timeout = opts?.timeout ?? 1500;
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const copy = React.useCallback(
    async (text: string) => {
      if (typeof navigator === "undefined" || !navigator.clipboard) return;
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // Clipboard can reject (permissions / insecure context); skip the flip
        // so we never announce a copy that didn't happen.
        return;
      }
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), timeout);
    },
    [timeout]
  );

  return { copied, copy };
}
