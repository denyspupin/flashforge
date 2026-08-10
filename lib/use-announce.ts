"use client";


type Priority = "polite" | "assertive";

// One shared visually-hidden live region per priority, created lazily on first
// use and reused — so consumers announce transient messages without each
// rendering their own `aria-live` span. `polite` waits for a pause; `assertive`
// interrupts (for errors). Uses the `sr-only` class so there are no raw values.
function getRegion(priority: Priority): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const id = `garn-live-${priority}`;
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("div");
    el.id = id;
    el.className = "sr-only";
    el.setAttribute("aria-live", priority);
    el.setAttribute("aria-atomic", "true");
    el.setAttribute("role", priority === "assertive" ? "alert" : "status");
    document.body.appendChild(el);
  }
  return el;
}

/**
 * Announce a message to a shared screen-reader live region. Imperative and
 * SSR-safe (no-op on the server). Note: announcing the identical message twice
 * in a row is not re-read by AT — the region content must change.
 */
export function announce(message: string, priority: Priority = "polite"): void {
  const el = getRegion(priority);
  if (el) el.textContent = message;
}

/** Hook form — returns the stable `announce` function for use in components. */
export function useAnnounce(): (message: string, priority?: Priority) => void {
  return announce;
}
