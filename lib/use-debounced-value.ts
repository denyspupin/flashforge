"use client";

import * as React from "react";

/**
 * Debounce a fast-changing value — returns `value` only after it has stopped
 * changing for `delay` ms. The primitive for async search (feed a Combobox's
 * `inputValue` through it so the fetch fires once typing settles, not per
 * keystroke). Each change resets the timer; the pending timer is cleared on
 * unmount / change, so a value that never settles never emits.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
