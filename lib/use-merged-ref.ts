"use client";

import * as React from "react";

/**
 * Merge a forwarded ref with an internal one (ref-as-prop, no forwardRef) —
 * the shared setter behind every garn control that both exposes its node to
 * the consumer and keeps its own handle on it.
 */
export function useMergedRef<T>(
  external: React.Ref<T> | undefined,
  internal: React.RefObject<T | null>
): (node: T | null) => void {
  return React.useCallback(
    (node: T | null) => {
      internal.current = node;
      if (typeof external === "function") external(node);
      else if (external) (external as React.RefObject<T | null>).current = node;
    },
    [external, internal]
  );
}
