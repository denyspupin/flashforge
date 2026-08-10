"use client";

import * as React from "react";

/**
 * Controlled/uncontrolled state in one hook — the single primitive every garn
 * control uses so each one stops re-deriving it. When `value` is provided the
 * state is controlled (the hook never stores its own copy); otherwise it tracks
 * `defaultValue` locally. `onChange` fires on every setter call in both modes.
 *
 * The first member of garn's hooks layer (the code-audit's "no hooks layer"
 * finding). It ships as its own copy-in registry item, so any component that
 * imports it declares `use-controllable-state` in its `registryDependencies`.
 */
export function useControllableState<T>(opts: {
  value: T | undefined;
  defaultValue: T;
  onChange?: (value: T) => void;
}): readonly [T, (value: T) => void] {
  const { value, defaultValue, onChange } = opts;
  const isControlled = value !== undefined;
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue);
  const state = isControlled ? (value as T) : uncontrolled;
  const setState = React.useCallback(
    (next: T) => {
      if (!isControlled) setUncontrolled(next);
      onChange?.(next);
    },
    [isControlled, onChange]
  );
  return [state, setState] as const;
}
