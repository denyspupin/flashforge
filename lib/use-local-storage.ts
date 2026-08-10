"use client";

import * as React from "react";

/**
 * State backed by `localStorage` — reads/writes JSON under `key`, falling back to
 * `initialValue`. SSR-safe: the first render returns `initialValue` (so server and
 * client agree — no hydration mismatch), then it hydrates from storage in an
 * effect. Writes are swallowed where storage is unavailable (private mode / SSR).
 * The setter takes a value or an updater, like `useState`.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): readonly [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = React.useState<T>(initialValue);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw != null) setValue(JSON.parse(raw) as T);
    } catch {
      // storage unavailable / malformed — keep the in-memory value
    }
  }, [key]);

  const set = React.useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // storage unavailable — state still updates in memory
        }
        return resolved;
      });
    },
    [key]
  );

  return [value, set] as const;
}
