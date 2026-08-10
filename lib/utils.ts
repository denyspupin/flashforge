import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names, resolving Tailwind conflicts (last one wins).
 * The single most-used helper in garn — every component routes its
 * `className` through it so consumers can override any utility.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Schemes an `href` from data may navigate to. */
const SAFE_URL_SCHEMES = new Set(["http", "https", "mailto", "tel", "ftp", "sms"]);

/**
 * Vet an `href` that comes from data before rendering it as a link.
 *
 * React does NOT block `javascript:` (or `data:`) URLs — it only warns in dev —
 * so a link built from a row, an API payload, or anything a user submitted can
 * run script in your page when clicked. Returns the href when its scheme is safe
 * to navigate to, and `undefined` when it isn't, so the caller renders plain
 * text instead of a link.
 *
 * Relative, root-relative, hash, and query hrefs have no scheme and always pass.
 */
export function safeHref(href: unknown): string | undefined {
  if (typeof href !== "string") return undefined;
  const trimmed = href.trim();
  if (trimmed === "") return undefined;
  // Browsers ignore control characters (including tabs and newlines) inside a
  // scheme, so `java\tscript:` navigates as `javascript:`. Strip them for the
  // scheme test only — what's returned is always the original string.
  const bare = Array.from(trimmed)
    .filter((ch) => ch.charCodeAt(0) > 0x20)
    .join("")
    .toLowerCase();
  const scheme = /^([a-z][a-z0-9+.-]*):/.exec(bare)?.[1];
  if (!scheme) return trimmed;
  return SAFE_URL_SCHEMES.has(scheme) ? trimmed : undefined;
}

/**
 * True when focus is in a text-entry control — so a bare-key shortcut (`/`, a
 * command letter) doesn't hijack typing. Shared by any global keydown handler
 * (AppShell's ⌘B, Command's ⌘K / `/` open).
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.tagName !== "string") return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable === true
  );
}
