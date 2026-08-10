"use client";

// #region imports — React, cmdk, icons, shared hooks
import * as React from "react";
import { Command as CommandPrimitive, defaultFilter, useCommandState } from "@/lib/cmdk";

/** cmdk's filter signature (not exported as a type by cmdk 1.x). */
export type CommandFilter = (
  value: string,
  search: string,
  keywords?: string[]
) => number;
import { ChevronLeft, CircleAlert, Search } from "lucide-react";

import { cn, isEditableTarget } from "@/lib/utils";
import { useAnnounce } from "@/lib/use-announce";
import { useControllableState } from "@/lib/use-controllable-state";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useEventListener } from "@/lib/use-event-listener";
import { useLocalStorage } from "@/lib/use-local-storage";
import { useMergedRef } from "@/lib/use-merged-ref";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { Button } from "@/components/garn/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/garn/dialog";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/garn/popover";
import { Spinner } from "@/components/garn/spinner";

// #endregion imports
// #region context — garn layer over cmdk: page/shortcut types + contexts
/* ================================================================== *
 * Context — the garn layer over cmdk.
 *
 * cmdk owns the engine: query filtering, active-item tracking, the
 * combobox/listbox a11y and `aria-activedescendant`. This context adds the
 * garn layer around it — a nested-page stack, the search value (so pages can
 * reset it and Backspace can pop), a `loading` flag (so Loading/Empty can't
 * both show — cmdk #269), and a registry of per-item keyboard shortcuts.
 * Absent when a bare `<CommandInput>`/`<CommandItem>` is used outside `<Command>`
 * (every consumer path renders inside `<Command>`, so it's effectively always
 * present).
 * ================================================================== */

interface CommandPage {
  id: string;
  label: string;
}

interface ParsedShortcut {
  /** platform-adaptive: ⌘ on mac, Ctrl elsewhere */
  mod: boolean;
  meta: boolean;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  key: string;
}

interface ShortcutEntry {
  combo: ParsedShortcut;
  run: () => void;
  elRef: React.RefObject<HTMLElement | null>;
  /** Action shortcuts only fire when their owning row is highlighted. */
  requiresHighlight?: boolean;
}

interface CommandContextValue {
  pages: CommandPage[];
  pushPage: (id: string, label?: string) => void;
  popPage: () => void;
  resetPages: () => void;
  search: string;
  setSearch: (value: string) => void;
  loading: boolean;
  registerShortcut: (entry: ShortcutEntry) => () => void;
  /** Items register `value → run` so `apiRef.run(value)` can fire one. */
  registerItem: (value: string, run: () => void) => () => void;
  /** Per-item action panels: a row registers its secondary-action nodes under
   *  its (lowercased) value; the shared CommandActionPanel renders the open one. */
  actionsRef: React.RefObject<Map<string, React.ReactNode>>;
  registerActions: (value: string, node: React.ReactNode) => () => void;
  hasActions: (value: string) => boolean;
  openActionsFor: string | null;
  setOpenActionsFor: (value: string | null) => void;
  /** Set by CommandList when it measures visible content (items / loading /
   *  error / empty). Reflected as `data-expanded` on the root so the divider
   *  and shadow only show when the list is extended, not at rest. */
  setExpanded: (expanded: boolean) => void;
  /** When CommandInput is controlled (`value` prop), it registers a setter here
   *  that pushes a programmatic search value to the consumer's `onValueChange` —
   *  the consumer's state is the input's source of truth, so page pushes,
   *  prefix stripping, and `apiRef.setSearch` must go through it or the visible
   *  query would survive them. Null while the input is uncontrolled. */
  inputSyncRef: React.RefObject<((value: string) => void) | null>;
}

const CommandContext = React.createContext<CommandContextValue | null>(null);

/** Provides a CommandItem's own value down to its `CommandItemActions`. */
const CommandItemContext = React.createContext<{ value: string } | null>(null);

/** True inside the action panel's own Command, so it doesn't render a nested
 *  action panel (which would recurse infinitely under forceMount). */
const InActionPanelContext = React.createContext(false);

// #endregion context
// #region api-types — imperative-handle contracts (CommandApi / CommandDialogApi)
/* ── imperative handle (agent-native) ─────────────────────────────── */

interface CommandApi {
  /** Focus the search input. */
  focus(): void;
  setSearch(value: string): void;
  getSearch(): string;
  /** Push a sub-command page. */
  navigate(pageId: string, label?: string): void;
  /** Pop one page. */
  back(): void;
  /** Clear the page stack + search. */
  reset(): void;
  getPages(): string[];
  /** Run the item with this `value` (fires its `onSelect`). */
  run(value: string): void;
}

interface CommandDialogApi extends CommandApi {
  open(): void;
  close(): void;
  toggle(): void;
  getOpen(): boolean;
}

// #endregion api-types
// #region shortcut-utils — parse / match / format shortcuts + mac detection
/* ── shortcut parsing / matching / display ────────────────────────── */

function isMacRuntime(): boolean {
  if (typeof navigator === "undefined") return false;
  return /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);
}

/** `"mod+shift+c"` → a structured combo. `mod` stays platform-adaptive. */
function parseShortcut(str: string): ParsedShortcut {
  const p: ParsedShortcut = {
    mod: false,
    meta: false,
    ctrl: false,
    alt: false,
    shift: false,
    key: "",
  };
  for (const raw of str.toLowerCase().split("+")) {
    const part = raw.trim();
    if (part === "mod") p.mod = true;
    else if (part === "cmd" || part === "meta" || part === "⌘") p.meta = true;
    else if (part === "ctrl" || part === "control" || part === "⌃") p.ctrl = true;
    else if (part === "alt" || part === "opt" || part === "option" || part === "⌥")
      p.alt = true;
    else if (part === "shift" || part === "⇧") p.shift = true;
    else if (part) p.key = part;
  }
  return p;
}

/** A combo is bindable only if it carries a non-shift modifier — otherwise it
 *  would collide with type-ahead in the input. */
function isBindable(p: ParsedShortcut): boolean {
  return p.mod || p.meta || p.ctrl || p.alt;
}

function matchShortcut(p: ParsedShortcut, e: KeyboardEvent, mac: boolean): boolean {
  const wantMeta = p.meta || (p.mod && mac);
  const wantCtrl = p.ctrl || (p.mod && !mac);
  return (
    e.metaKey === wantMeta &&
    e.ctrlKey === wantCtrl &&
    e.altKey === p.alt &&
    e.shiftKey === p.shift &&
    e.key.toLowerCase() === p.key
  );
}

// Named keys → their glyphs (so `mod+backspace` shows `⌘⌫`, not `⌘backspace`).
const KEY_GLYPHS: Record<string, string> = {
  backspace: "⌫",
  delete: "⌦",
  enter: "↵",
  return: "↵",
  escape: "⎋",
  esc: "⎋",
  tab: "⇥",
  space: "␣",
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
  arrowup: "↑",
  arrowdown: "↓",
  arrowleft: "←",
  arrowright: "→",
};

function formatShortcut(p: ParsedShortcut, mac: boolean): string {
  const showMeta = p.meta || (p.mod && mac);
  const showCtrl = p.ctrl || (p.mod && !mac);
  const seq: string[] = [];
  if (showCtrl) seq.push(mac ? "⌃" : "Ctrl");
  if (p.alt) seq.push(mac ? "⌥" : "Alt");
  if (p.shift) seq.push(mac ? "⇧" : "Shift");
  if (showMeta) seq.push(mac ? "⌘" : "Win");
  seq.push(
    KEY_GLYPHS[p.key] ?? (p.key.length === 1 ? p.key.toUpperCase() : p.key)
  );
  return mac ? seq.join("") : seq.join("+");
}

/** Render-safe mac detection: `false` on the server / first paint, resolved in
 *  an effect — so a `⌘` symbol never causes a hydration mismatch. */
function useIsMac(): boolean {
  const [mac, setMac] = React.useState(false);
  React.useEffect(() => setMac(isMacRuntime()), []);
  return mac;
}

// #endregion shortcut-utils
// #region root — Command provider (page stack, shortcut registry, apiRef) + announcer
/* ================================================================== *
 * Root
 * ================================================================== */

type CommandProps = React.ComponentProps<typeof CommandPrimitive> & {
  /**
   * In-flight async results. Auto-shows `CommandLoading`, hides `CommandEmpty`
   * (so they can't both render — cmdk #269), and turns filtering off.
   * @default false
   */
  loading?: boolean;
  /** Controlled search text. Uncontrolled by default via `defaultSearch`. */
  search?: string;
  /**
   * Initial search text for the uncontrolled input.
   * @default ""
   */
  defaultSearch?: string;
  /** Called with the new query on every search change (controlled or not). */
  onSearchChange?: (value: string) => void;
  /** Imperative handle — drive the palette programmatically (agent-native). */
  apiRef?: React.Ref<CommandApi>;
  /** Leading-token → page routing (VS Code Quick Open): typing `>` at root jumps
   *  to a scope page and strips the token. Keyed by token, e.g.
   *  `{ ">": { page: "commands", label: "Commands" } }`. */
  prefixes?: CommandPrefixMap;
};

/** Leading-token → { page, label } map for `Command`'s `prefixes` prop. */
type CommandPrefixMap = Record<string, { page: string; label: string }>;

/**
 * Root of a command palette — a searchable, keyboard-driven list of actions.
 * Provides the page stack, per-item shortcut registry, and imperative handle to
 * the parts beneath it; for the ⌘K modal, wrap it with `CommandDialog`.
 *
 * Documentation: https://garn.ohuba.com/components/command
 */
function Command({
  className,
  loading = false,
  search: searchProp,
  defaultSearch = "",
  onSearchChange,
  apiRef,
  prefixes,
  shouldFilter,
  ref: refProp,
  children,
  ...props
}: CommandProps) {
  const [pages, setPages] = React.useState<CommandPage[]>([]);
  const [expanded, setExpanded] = React.useState(false);
  const [openActionsFor, setOpenActionsFor] = React.useState<string | null>(null);
  const [search, setSearch] = useControllableState({
    value: searchProp,
    defaultValue: defaultSearch,
    onChange: onSearchChange,
  });
  const announce = useAnnounce();
  const inActionPanel = React.use(InActionPanelContext);

  // Ref-backed so registering an item's shortcut/handle never re-renders.
  const registryRef = React.useRef<Set<ShortcutEntry>>(new Set());
  const itemsRef = React.useRef<Map<string, () => void>>(new Map());
  const actionsRef = React.useRef<Map<string, React.ReactNode>>(new Map());
  const rootRef = React.useRef<HTMLDivElement>(null);
  const ref = useMergedRef(refProp, rootRef);
  // Live mirrors so the imperative handle can read current state with stable deps.
  const searchRef = React.useRef(search);
  searchRef.current = search;
  const pagesRef = React.useRef(pages);
  pagesRef.current = pages;

  // #region command-wiring — registrations, imperative handle, page/shortcut effects
  // A controlled CommandInput registers its consumer-facing setter here so
  // programmatic search writes (page pushes, prefix strip, apiRef.setSearch)
  // reach the consumer's state — the input's source of truth in that mode.
  const inputSyncRef = React.useRef<((value: string) => void) | null>(null);
  const pushPage = React.useCallback(
    (id: string, label?: string) => {
      setPages((prev) => [...prev, { id, label: label ?? id }]);
      setSearch("");
      inputSyncRef.current?.("");
    },
    [setSearch]
  );
  const popPage = React.useCallback(() => {
    setPages((prev) => prev.slice(0, -1));
    setSearch("");
    inputSyncRef.current?.("");
  }, [setSearch]);
  const resetPages = React.useCallback(() => {
    setPages([]);
    setSearch("");
    inputSyncRef.current?.("");
  }, [setSearch]);
  const registerShortcut = React.useCallback((entry: ShortcutEntry) => {
    registryRef.current.add(entry);
    return () => {
      registryRef.current.delete(entry);
    };
  }, []);
  const registerItem = React.useCallback((value: string, run: () => void) => {
    itemsRef.current.set(value, run);
    return () => {
      if (itemsRef.current.get(value) === run) itemsRef.current.delete(value);
    };
  }, []);
  // Key by trimmed+lowercased value so lookups match cmdk's trimmed `state.value`.
  const registerActions = React.useCallback(
    (value: string, node: React.ReactNode) => {
      const key = value.trim().toLowerCase();
      actionsRef.current.set(key, node);
      return () => {
        actionsRef.current.delete(key);
      };
    },
    []
  );
  const hasActions = React.useCallback(
    (value: string) => actionsRef.current.has(value.trim().toLowerCase()),
    []
  );

  React.useImperativeHandle(
    apiRef,
    (): CommandApi => ({
      focus: () =>
        (
          rootRef.current?.querySelector(
            '[data-slot="command-input"]'
          ) as HTMLElement | null
        )?.focus(),
      setSearch: (v) => {
        setSearch(v);
        inputSyncRef.current?.(v);
      },
      getSearch: () => searchRef.current,
      navigate: pushPage,
      back: popPage,
      reset: resetPages,
      getPages: () => pagesRef.current.map((p) => p.id),
      run: (value) => itemsRef.current.get(value)?.(),
    }),
    [setSearch, pushPage, popPage, resetPages]
  );

  // Announce page navigation to assistive tech (the visual back-pill isn't
  // enough on its own). Skip the initial mount.
  const mountedRef = React.useRef(false);
  React.useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    const page = pages[pages.length - 1];
    announce(page ? String(page.label) : "Back to main");
  }, [pages, announce]);

  // Prefix routing: at root, a leading token (`>`, `@`, …) jumps to its page and
  // is stripped from the query. Deleting back to empty pops via the existing
  // Backspace-on-empty path. Guarded to root so it never fires inside a page.
  React.useEffect(() => {
    if (!prefixes || pages.length > 0 || !search) return;
    for (const token in prefixes) {
      const entry = prefixes[token];
      if (entry && search.startsWith(token)) {
        pushPage(entry.page, entry.label);
        const stripped = search.slice(token.length).trimStart();
        setSearch(stripped);
        inputSyncRef.current?.(stripped);
        break;
      }
    }
  }, [prefixes, pages.length, search, pushPage, setSearch]);

  // Per-item shortcuts fire in the CAPTURE phase on the root, so they win over
  // cmdk's own key handling (which only cares about arrows/enter/home/end) and
  // never leak to the input. Modifier-gated at registration, so type-ahead is
  // safe.
  React.useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey || e.altKey)) return;
      const mac = isMacRuntime();
      for (const entry of registryRef.current) {
        if (!matchShortcut(entry.combo, e, mac)) continue;
        const node = entry.elRef.current;
        // Skip hidden (forceMount'd but filtered) or disabled rows. cmdk already
        // unmounts filtered items, so this is mostly insurance — and `hidden` is
        // reliable where `offsetParent` isn't (headless/SSR environments, position:fixed).
        if (node && (node.hasAttribute("hidden") || node.getAttribute("aria-disabled") === "true"))
          continue;
        // Action shortcuts fire only for the currently highlighted row.
        if (entry.requiresHighlight && node?.getAttribute("data-selected") !== "true")
          continue;
        e.preventDefault();
        e.stopPropagation();
        entry.run();
        return;
      }
    };
    el.addEventListener("keydown", onKeyDown, true);
    return () => el.removeEventListener("keydown", onKeyDown, true);
  }, []);

  // #endregion command-wiring
  const ctx = React.useMemo<CommandContextValue>(
    () => ({
      pages,
      pushPage,
      popPage,
      resetPages,
      search,
      setSearch,
      loading,
      registerShortcut,
      registerItem,
      actionsRef,
      registerActions,
      hasActions,
      openActionsFor,
      setOpenActionsFor,
      setExpanded,
      inputSyncRef,
    }),
    [pages, pushPage, popPage, resetPages, search, setSearch, loading, registerShortcut, registerItem, registerActions, hasActions, openActionsFor]
  );

  return (
    <CommandContext.Provider value={ctx}>
      <CommandPrimitive
        ref={ref}
        className={cn(
          "group/command relative flex size-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
          className
        )}
        data-slot="command"
        data-loading={loading || undefined}
        data-expanded={expanded || undefined}
        data-actions-open={openActionsFor != null || undefined}
        // cmdk best practice: don't client-filter server-filtered async results.
        shouldFilter={shouldFilter ?? (loading ? false : undefined)}
        {...props}
      >
        <CommandAnnouncer />
        {children}
        {!inActionPanel && <CommandActionPanel rootRef={rootRef} />}
      </CommandPrimitive>
    </CommandContext.Provider>
  );
}

// A zero-DOM probe: reads cmdk's live filtered count and announces it politely
// while searching, so screen-reader users hear "N results". Rendered inside the
// cmdk root so it can call useCommandState.
function CommandAnnouncer() {
  const ctx = React.use(CommandContext);
  const announce = useAnnounce();
  const count = useCommandState((state) => state.filtered.count);
  const search = useCommandState((state) => state.search);
  const prev = React.useRef<number | null>(null);
  const loading = ctx?.loading;
  React.useEffect(() => {
    // Stay quiet with no query or mid-fetch (count is transiently 0 while loading).
    if (!search || loading) {
      prev.current = null;
      return;
    }
    if (count === prev.current) return;
    prev.current = count;
    announce(count === 0 ? "No results" : `${count} result${count === 1 ? "" : "s"}`);
  }, [count, search, loading, announce]);
  return null;
}

// #endregion root
// #region dialog — CommandDialog host (⌘K palette, open-state, inner apiRef)
/* ================================================================== *
 * Dialog host — the canonical ⌘K palette.
 *
 * Owns the open-shortcut binding (via `useCommandShortcut`) and controllable
 * open state, so it — not a bespoke wrapper — is the one palette host.
 * `AppShellCommand` is a thin pass-through over it.
 *
 * `shortcut` defaults OFF (opt-in): an existing `<CommandDialog>` that already
 * runs its own ⌘K listener must not get a second, conflicting binding. The
 * canonical palette passes `shortcut="k"`.
 *
 * `title`/`description` render sr-only so Radix always has an accessible name;
 * pass `null` to suppress one and provide your own DialogTitle/Description.
 * ================================================================== */

type CommandDialogProps = React.ComponentProps<typeof Dialog> &
  Omit<CommandProps, "children" | "className" | "data-slot" | "ref" | "apiRef"> & {
    /** sr-only accessible name for the dialog; pass `null` to supply your own `DialogTitle`. */
    title?: React.ReactNode | null;
    /** sr-only description for the dialog; pass `null` to supply your own `DialogDescription`. */
    description?: React.ReactNode | null;
    /** Key for the ⌘/Ctrl open-shortcut; `null`/omitted disables. */
    shortcut?: string | null;
    /** Also open on a bare `/` when focus isn't in a text field. */
    openOnSlash?: boolean;
    /** Class for the inner `Command`. */
    className?: string;
    /** Class for the `DialogContent` surface. */
    contentClassName?: string;
    /** `data-slot` for the content surface (AppShellCommand overrides it). */
    "data-slot"?: string;
    /** Imperative handle — open/close plus the inner Command's content ops. */
    apiRef?: React.Ref<CommandDialogApi>;
  };

/**
 * The ⌘K command palette — a `Command` inside a modal `Dialog`, with the global
 * open-shortcut binding and controllable open state built in.
 */
function CommandDialog({
  // Dialog-root props
  open: openProp,
  defaultOpen,
  onOpenChange,
  modal,
  // host props
  title = "Command menu",
  description = "Search for a command to run.",
  shortcut,
  openOnSlash = false,
  className,
  contentClassName,
  "data-slot": dataSlot = "command-dialog",
  apiRef,
  children,
  // everything else (filter, loading, value, shouldFilter, label…) → inner Command
  ...commandProps
}: CommandDialogProps) {
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen ?? false,
    onChange: onOpenChange,
  });
  const openRef = React.useRef(open);
  openRef.current = open;

  useCommandShortcut({ open, onOpenChange: setOpen, shortcut, openOnSlash });

  // The inner Command's handle is only live while the dialog is open (its content
  // is unmounted when closed); open()/close() always work, content ops no-op when
  // closed.
  const innerApiRef = React.useRef<CommandApi>(null);
  React.useImperativeHandle(
    apiRef,
    (): CommandDialogApi => ({
      open: () => setOpen(true),
      close: () => setOpen(false),
      toggle: () => setOpen(!openRef.current),
      getOpen: () => openRef.current,
      focus: () => innerApiRef.current?.focus(),
      setSearch: (v) => innerApiRef.current?.setSearch(v),
      getSearch: () => innerApiRef.current?.getSearch() ?? "",
      navigate: (p, l) => innerApiRef.current?.navigate(p, l),
      back: () => innerApiRef.current?.back(),
      reset: () => innerApiRef.current?.reset(),
      getPages: () => innerApiRef.current?.getPages() ?? [],
      run: (v) => innerApiRef.current?.run(v),
    }),
    [setOpen]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={modal}>
      <DialogContent
        className={cn("overflow-hidden p-0", contentClassName)}
        data-slot={dataSlot}
      >
        {title != null && <DialogTitle className="sr-only">{title}</DialogTitle>}
        {description != null && (
          <DialogDescription className="sr-only">{description}</DialogDescription>
        )}
        <Command
          apiRef={innerApiRef}
          className={cn(
            "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2",
            className
          )}
          {...commandProps}
        >
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
}

// #endregion dialog
// #region input — CommandInput (search box + nested-page back affordance)
/* ================================================================== *
 * Input — search box, plus the nested-page back affordance.
 * ================================================================== */

/** The palette's search box; also renders the back affordance while on a nested page. */
function CommandInput({
  className,
  value,
  onValueChange,
  onKeyDown,
  ref: refProp,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  const ctx = React.use(CommandContext);
  const highlighted = useCommandState((state) => state.value);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const ref = useMergedRef(refProp, inputRef);
  const nested = !!ctx && ctx.pages.length > 0;
  const currentPage = nested ? ctx.pages[ctx.pages.length - 1] : null;

  // Context-backed by default (so pages can reset it and Backspace can pop);
  // an explicit `value` (async search) always wins.
  const boundValue = value !== undefined ? value : ctx?.search;
  const handleValueChange = (next: string) => {
    onValueChange?.(next);
    // Mirror unconditionally: the garn layer (prefixes, apiRef.getSearch, page
    // clearing) must track the visible query even when the consumer owns it.
    ctx?.setSearch(next);
  };
  const controlled = value !== undefined;
  // Mirror external writes to a controlled `value` (consumer set state without
  // typing) so ctx.search never trails what the input shows.
  const ctxSetSearch = ctx?.setSearch;
  React.useEffect(() => {
    if (controlled && value != null) ctxSetSearch?.(value);
  }, [controlled, value, ctxSetSearch]);
  // While controlled, register the consumer's setter so programmatic search
  // writes (page pushes, prefix strip, apiRef.setSearch) reach their state —
  // the input's source of truth in that mode.
  const onValueChangeRef = React.useRef(onValueChange);
  onValueChangeRef.current = onValueChange;
  const inputSyncRef = ctx?.inputSyncRef;
  React.useEffect(() => {
    if (!controlled || !inputSyncRef) return;
    inputSyncRef.current = (next: string) => onValueChangeRef.current?.(next);
    return () => {
      inputSyncRef.current = null;
    };
  }, [controlled, inputSyncRef]);
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    // Open the highlighted row's action panel: ⌘. anywhere, or → when the caret
    // is at the end of the query (so → still edits text mid-query).
    if (ctx && highlighted && ctx.hasActions(highlighted)) {
      const el = e.currentTarget;
      const caretAtEnd =
        el.selectionStart === el.value.length &&
        el.selectionEnd === el.value.length;
      const dotOpen = e.key === "." && (e.metaKey || e.ctrlKey);
      const rightOpen =
        e.key === "ArrowRight" &&
        caretAtEnd &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey;
      if (dotOpen || rightOpen) {
        e.preventDefault();
        ctx.setOpenActionsFor(highlighted);
        return;
      }
    }
    if (
      e.key === "Backspace" &&
      e.currentTarget.value === "" &&
      ctx &&
      ctx.pages.length > 0
    ) {
      e.preventDefault();
      ctx.popPage();
    }
  };

  return (
    <div
      className="flex items-center gap-2 px-3 group-data-[expanded]/command:border-b"
      cmdk-input-wrapper=""
      data-slot="command-input-wrapper"
    >
      {currentPage ? (
        <button
          type="button"
          data-slot="command-back"
          // Return focus to the input after popping — otherwise, popping to root
          // unmounts the button and focus falls to <body>.
          onClick={() => {
            ctx?.popPage();
            inputRef.current?.focus();
          }}
          aria-label={`Go back — ${currentPage.label}`}
          className="my-2 inline-flex shrink-0 items-center gap-1 rounded bg-muted px-1.5 py-1 text-xs font-medium text-muted-foreground outline-hidden hover:bg-state-hover hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronLeft className="size-3.5" aria-hidden="true" />
          {currentPage.label}
        </button>
      ) : (
        <Search className="size-4 shrink-0 opacity-50" aria-hidden="true" />
      )}
      <CommandPrimitive.Input
        ref={ref}
        className={cn(
          "flex h-[var(--garn-control-h-lg)] w-full rounded-md bg-transparent py-3 text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        data-slot="command-input"
        value={boundValue}
        onValueChange={handleValueChange}
        onKeyDown={handleKeyDown}
        {...props}
      />
    </div>
  );
}

// #endregion input
// #region list — CommandList (scroll container, edge-fade, expand probe)
/* ================================================================== *
 * List / groups / items
 * ================================================================== */

/** Scrollable results container — carries the edge-fade and drives the root's expanded state. */
function CommandList({
  className,
  ref: refProp,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  const ctx = React.use(CommandContext);
  const setExpanded = ctx?.setExpanded;
  const innerRef = React.useRef<HTMLDivElement>(null);
  const ref = useMergedRef(refProp, innerRef);

  // Page-push motion: slide the list in when the page depth changes (push → from
  // the right, pop → from the left). WAAPI so it restarts cleanly; skipped under
  // reduced-motion. Percentage transform stays off the raw-length audit.
  const pageDepth = ctx?.pages.length ?? 0;
  const prevDepth = React.useRef(pageDepth);
  const reducedMotion = usePrefersReducedMotion();
  React.useEffect(() => {
    const el = innerRef.current;
    const prev = prevDepth.current;
    prevDepth.current = pageDepth;
    if (!el || reducedMotion || pageDepth === prev) return;
    const dir = pageDepth > prev ? 1 : -1;
    // Easing from the --garn-ease-* family (WAAPI can't read a CSS var directly).
    const easing =
      getComputedStyle(el).getPropertyValue("--garn-ease-standard").trim() ||
      undefined;
    el.animate(
      [
        { opacity: 0, transform: `translateX(${dir * 4}%)` },
        { opacity: 1, transform: "none" },
      ],
      { duration: 160, easing }
    );
  }, [pageDepth, reducedMotion]);

  // One passive handler drives two things off the same element (no React state
  // per scroll — the shared garn scroll idiom):
  //  • data-expanded on the root — is any content visible? (divider + shadow)
  //  • data-overflow-start/-end on the list — which edge has more to scroll?
  //    (gates the edge-fade mask below)
  // The MutationObserver catches content mounting after first paint (async
  // results, page swaps); the ResizeObserver catches height changes; the scroll
  // listener catches position. getBoundingClientRect/scrollTop force layout, so
  // reads are synchronous (no rAF — it never fires in a backgrounded tab).
  React.useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const update = () => {
      setExpanded?.(el.getBoundingClientRect().height > 1);
      const overflowing = el.scrollHeight > el.clientHeight + 1;
      el.toggleAttribute("data-overflow-start", overflowing && el.scrollTop > 0);
      el.toggleAttribute(
        "data-overflow-end",
        overflowing && el.scrollTop < el.scrollHeight - el.clientHeight - 1
      );
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    const mo = new MutationObserver(update);
    mo.observe(el, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["hidden"],
    });
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
      mo.disconnect();
    };
  }, [setExpanded]);

  return (
    <CommandPrimitive.List
      ref={ref}
      className={cn(
        // Native scrollbar hidden — the edge fade (below) conveys overflow, like
        // tabs / Raycast. Keyboard + wheel scrolling still work.
        "max-h-80 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        // Scroll-aware edge fade — the shared garn idiom (tabs): the mask only
        // bites the side that still has content to scroll, so a fade at the
        // bottom signals "more below" (and at the top, "more above").
        "data-[overflow-start]:[mask-image:linear-gradient(to_bottom,transparent,black_var(--garn-space-48))]",
        "data-[overflow-end]:[mask-image:linear-gradient(to_top,transparent,black_var(--garn-space-48))]",
        "data-[overflow-start]:data-[overflow-end]:[mask-image:linear-gradient(to_bottom,transparent,black_var(--garn-space-48),black_calc(100%_-_var(--garn-space-48)),transparent)]",
        className
      )}
      data-slot="command-list"
      {...props}
    />
  );
}

// #endregion list
// #region empty — CommandEmpty (loading↔empty race guard)
/** Shown when a query matches nothing; suppressed while `loading` so the two never collide. */
function CommandEmpty(
  props: React.ComponentProps<typeof CommandPrimitive.Empty>
) {
  const ctx = React.use(CommandContext);
  // Guard the cmdk loading↔empty race (#269): never show "no results" while a
  // fetch is in flight.
  if (ctx?.loading) return null;
  return (
    <CommandPrimitive.Empty
      className="py-6 text-center text-sm text-muted-foreground"
      data-slot="command-empty"
      {...props}
    />
  );
}

// #endregion empty
// #region loading — CommandLoading (auto-managed spinner row)
/** Spinner row for in-flight async results; renders only while the root is `loading`. */
function CommandLoading({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Loading>) {
  const ctx = React.use(CommandContext);
  // Auto-managed: render only while the root is `loading` (still renders if used
  // standalone without a Command context).
  if (ctx && !ctx.loading) return null;
  return (
    <CommandPrimitive.Loading
      className={cn("py-6 text-sm text-muted-foreground", className)}
      data-slot="command-loading"
      {...props}
    >
      {/* cmdk wraps children in its own div, so the flex row lives here. */}
      <div className="flex items-center justify-center gap-2">
        <Spinner size="sm" />
        {children ?? <span>Loading…</span>}
      </div>
    </CommandPrimitive.Loading>
  );
}

// #endregion loading
// #region error — CommandError (async-failure alert + retry)
type CommandErrorProps = React.ComponentProps<"div"> & {
  /** Renders a Retry button when provided. */
  onRetry?: () => void;
};

/**
 * Async-failure state for the list — a `role="alert"` row (announced assertively)
 * with an optional Retry button. Render it when a fetch rejects.
 */
function CommandError({
  className,
  children,
  onRetry,
  ...props
}: CommandErrorProps) {
  return (
    <div
      role="alert"
      data-slot="command-error"
      className={cn(
        "flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground",
        className
      )}
      {...props}
    >
      <CircleAlert className="size-5 text-danger" />
      <div>{children ?? "Something went wrong."}</div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

// #endregion error
// #region group — CommandGroup (heading + items wrapper)
/** Labelled section of items — its `heading` becomes the group's accessible label. */
function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      className={cn(
        "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
        className
      )}
      data-slot="command-group"
      {...props}
    />
  );
}

// #endregion group
// #region separator — CommandSeparator (hairline divider)
/** Hairline divider between groups of items. */
function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      className={cn("-mx-1 h-px bg-border", className)}
      data-slot="command-separator"
      {...props}
    />
  );
}

// #endregion separator
// #region item — CommandItem (shortcut binding, value registration) + CommandShortcut
type CommandItemProps = React.ComponentProps<typeof CommandPrimitive.Item> & {
  /** A modifier-gated combo (`"mod+p"`, `"mod+shift+c"`) that both renders as a
   *  trailing shortcut hint AND fires this item's `onSelect` while the palette
   *  is focused. `mod` = ⌘ on mac, Ctrl elsewhere. */
  shortcut?: string;
};

/** A selectable row — fires `onSelect` on click/Enter and can bind a trailing `shortcut`. */
function CommandItem({
  className,
  shortcut,
  onSelect,
  value,
  children,
  ref: refProp,
  ...props
}: CommandItemProps) {
  const ctx = React.use(CommandContext);
  const mac = useIsMac();
  const innerRef = React.useRef<HTMLDivElement>(null);
  const ref = useMergedRef(refProp, innerRef);

  const parsed = React.useMemo(
    () => (shortcut ? parseShortcut(shortcut) : null),
    [shortcut]
  );

  // Keep the fire handler fresh without re-registering the shortcut.
  const runRef = React.useRef<() => void>(() => {});
  runRef.current = () =>
    onSelect?.(value ?? innerRef.current?.textContent?.trim() ?? "");

  React.useEffect(() => {
    if (!ctx || !parsed || !isBindable(parsed)) return;
    return ctx.registerShortcut({
      combo: parsed,
      run: () => runRef.current(),
      elRef: innerRef,
    });
  }, [ctx, parsed]);

  // Register value → run so apiRef.run(value) can fire this item.
  React.useEffect(() => {
    if (!ctx || value === undefined) return;
    return ctx.registerItem(value, () => runRef.current());
  }, [ctx, value]);

  return (
    <CommandPrimitive.Item
      ref={ref}
      className={cn(
        // scroll-margin keeps a keyboard-highlighted row clear of the list's
        // edge fade when cmdk scrolls it into view (matches the fade size).
        // rounded-xs = --garn-radius − 4px: concentric with the panel's rounded-md
        // + p-1 list padding (matches the dropdown/select/context-menu row family).
        // Height stays on --garn-control-h-md (larger Raycast rows — an intentional
        // divergence from the family's --garn-row-h, per the vision).
        "relative flex min-h-[var(--garn-control-h-md)] scroll-my-[var(--garn-space-48)] cursor-default select-none items-center gap-2 rounded-xs px-2 text-sm font-medium outline-hidden data-[disabled=true]:pointer-events-none data-[selected=true]:bg-state-hover data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&>svg]:text-muted-foreground",
        className
      )}
      data-slot="command-item"
      onSelect={onSelect}
      value={value}
      {...props}
    >
      <CommandItemContext.Provider value={{ value: value ?? "" }}>
        {children}
      </CommandItemContext.Provider>
      {parsed && <CommandShortcut>{formatShortcut(parsed, mac)}</CommandShortcut>}
    </CommandPrimitive.Item>
  );
}

/** Trailing keyboard-hint text for a row (usually rendered for you from `CommandItem`'s `shortcut`). */
const CommandShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn(
      "ml-auto text-xs font-normal tracking-widest text-muted-foreground",
      className
    )}
    data-slot="command-shortcut"
    {...props}
  />
);
CommandShortcut.displayName = "CommandShortcut";

// #endregion item
// #region footer — CommandFooter (keyboard-hint bar)
/**
 * Footer bar under the list for keyboard-hint discoverability (compose `Kbd`
 * inside) — e.g. "↵ select · → actions · esc close".
 */
function CommandFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-3 border-t px-3 py-2 text-xs text-muted-foreground",
        className
      )}
      data-slot="command-footer"
      {...props}
    />
  );
}

// #endregion footer
// #region item-actions — CommandItemActions (declare row's secondary actions + shortcuts)
/* ================================================================== *
 * Per-item action panel (Raycast-style secondary actions)
 * ================================================================== */

type CommandItemActionsProps = React.ComponentProps<"span"> & {
  /** Inline affordance on the row. Defaults to a subtle `⌘.` hint; pass `null`
   *  to hide it. */
  hint?: React.ReactNode | null;
};

/**
 * Declares a row's secondary actions. Place inside a `CommandItem` (which must
 * have a `value`); its `CommandAction` children render in the shared panel that
 * opens on `→` / `⌘.`. Renders only a small inline hint itself.
 */
function CommandItemActions({
  children,
  hint,
  className,
  ...props
}: CommandItemActionsProps) {
  const ctx = React.use(CommandContext);
  const item = React.use(CommandItemContext);
  const spanRef = React.useRef<HTMLSpanElement>(null);
  const rowRef = React.useRef<HTMLElement | null>(null);

  // Register the render node — the panel renders it when this row's panel opens.
  React.useEffect(() => {
    if (!ctx || !item?.value) return;
    return ctx.registerActions(item.value, children);
  }, [ctx, item?.value, children]);

  // Also register each action's shortcut in the outer palette, scoped to this
  // row being highlighted — so ⌘E fires the highlighted row's action directly,
  // without opening the panel (Raycast behaviour). Mark the row as having a
  // secondary-action panel so assistive tech can discover it.
  React.useEffect(() => {
    // No value → the panel can't be keyed/opened, so don't register the
    // shortcuts either (avoid a shortcut that fires with no openable panel).
    if (!ctx || !item?.value) return;
    const row =
      spanRef.current?.closest<HTMLElement>('[data-slot="command-item"]') ?? null;
    rowRef.current = row;
    row?.setAttribute("aria-haspopup", "menu");
    row?.setAttribute("aria-keyshortcuts", "ArrowRight");
    const cleanups: Array<() => void> = [];
    React.Children.forEach(children, (child) => {
      if (!React.isValidElement<CommandItemProps>(child)) return;
      const sc = child.props.shortcut;
      if (!sc) return;
      const combo = parseShortcut(sc);
      if (!isBindable(combo)) return;
      cleanups.push(
        ctx.registerShortcut({
          combo,
          run: () => child.props.onSelect?.(""),
          elRef: rowRef,
          requiresHighlight: true,
        })
      );
    });
    return () => {
      row?.removeAttribute("aria-haspopup");
      row?.removeAttribute("aria-keyshortcuts");
      for (const c of cleanups) c();
    };
  }, [ctx, item?.value, children]);

  return (
    <span
      ref={spanRef}
      className={cn(
        "ml-auto shrink-0 text-xs font-normal text-muted-foreground",
        className
      )}
      data-slot="command-item-actions"
      aria-hidden="true"
      {...props}
    >
      {hint === undefined ? "→" : hint}
    </span>
  );
}

// #endregion item-actions
// #region action — CommandAction (a single secondary action row)
/** One secondary action — a `CommandItem` rendered inside the action panel. The
 *  panel wraps its `onSelect` to also close the panel after it runs. */
function CommandAction({ className, ...props }: CommandItemProps) {
  return (
    <CommandItem data-slot="command-action" className={className} {...props} />
  );
}

// #endregion action
// #region action-panel — CommandActionPanel (shared Popover of the open row's actions)
// Auto-mounted once inside every Command, but renders NOTHING until a row's panel
// is open — so a palette with no open panel adds no extra combobox/listbox to the
// DOM. When open it shows that row's actions in a Popover anchored bottom-right
// (the Raycast placement); the Popover is a nested focus scope, so Esc closes just
// the panel (not the outer Dialog) and focus returns to the input.
function CommandActionPanel({
  rootRef,
}: {
  rootRef: React.RefObject<HTMLDivElement | null>;
}) {
  const ctx = React.use(CommandContext);
  const announce = useAnnounce();
  const open = ctx != null && ctx.openActionsFor != null;

  const restoreFocus = React.useCallback(() => {
    (
      rootRef.current?.querySelector(
        '[data-slot="command-input"]'
      ) as HTMLElement | null
    )?.focus();
  }, [rootRef]);
  const close = React.useCallback(() => {
    ctx?.setOpenActionsFor(null);
    restoreFocus();
  }, [ctx, restoreFocus]);

  React.useEffect(() => {
    if (open) announce("Actions");
  }, [open, announce]);

  // Render nothing while closed — no forceMount, so the nested Command (and its
  // combobox) only exists while the panel is open.
  if (!ctx || !open) return null;

  const node = ctx.actionsRef.current.get(
    ctx.openActionsFor!.trim().toLowerCase()
  );
  // Wrap each action's onSelect to also close the panel.
  const items = React.Children.map(node, (child) =>
    React.isValidElement<CommandItemProps>(child)
      ? React.cloneElement(child, {
          onSelect: (value: string) => {
            child.props.onSelect?.(value);
            close();
          },
        })
      : child
  );

  return (
    <Popover
      open
      onOpenChange={(o) => {
        if (!o) close();
      }}
    >
      <PopoverAnchor className="pointer-events-none absolute right-2 bottom-2 size-0" />
      <PopoverContent
        align="end"
        side="top"
        sideOffset={8}
        className="w-56 p-0"
        data-slot="command-action-panel"
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          restoreFocus();
        }}
      >
        <InActionPanelContext.Provider value={true}>
          <Command>
            <CommandInput placeholder="Actions…" />
            <CommandList>
              <CommandEmpty>No actions.</CommandEmpty>
              <CommandGroup>{items}</CommandGroup>
            </CommandList>
          </Command>
        </InActionPanelContext.Provider>
      </PopoverContent>
    </Popover>
  );
}

// #endregion action-panel
// #region use-command-shortcut — global ⌘K / slash open-binding hook
/* ================================================================== *
 * Hooks
 * ================================================================== */

/**
 * Bind a global ⌘/Ctrl+key (and optional bare `/`) to open a palette. Extracted
 * so `CommandDialog` and `AppShellCommand` share one implementation. Pass a
 * falsy `shortcut` to disable the ⌘K binding.
 */
function useCommandShortcut({
  open,
  onOpenChange,
  shortcut,
  openOnSlash = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcut?: string | null;
  openOnSlash?: boolean;
}) {
  const openRef = React.useRef(open);
  openRef.current = open;

  useEventListener("keydown", (e) => {
    const modOpen =
      !!shortcut &&
      e.key.toLowerCase() === shortcut.toLowerCase() &&
      (e.metaKey || e.ctrlKey) &&
      !e.altKey &&
      !e.shiftKey;
    const slashOpen =
      openOnSlash &&
      e.key === "/" &&
      !e.metaKey &&
      !e.ctrlKey &&
      !isEditableTarget(e.target);
    if (modOpen) {
      e.preventDefault();
      onOpenChange(!openRef.current);
    } else if (slashOpen) {
      e.preventDefault();
      onOpenChange(true);
    }
  });
}

// #endregion use-command-shortcut
// #region use-command-pages — read/drive the nested-page stack
/** Read/drive the nested-page stack. Call inside `<Command>`. */
function useCommandPages() {
  const ctx = React.use(CommandContext);
  if (!ctx) {
    throw new Error("useCommandPages must be used within <Command>.");
  }
  return {
    pages: ctx.pages,
    page: ctx.pages[ctx.pages.length - 1]?.id,
    pushPage: ctx.pushPage,
    popPage: ctx.popPage,
    resetPages: ctx.resetPages,
  };
}

// #endregion use-command-pages
// #region use-recent-commands — recency+frequency ranking (types + hook)
interface RecentEntry {
  value: string;
  count: number;
  at: number;
}

type RecentStore = readonly [
  RecentEntry[],
  (updater: RecentEntry[] | ((prev: RecentEntry[]) => RecentEntry[])) => void,
];

/**
 * Recency + frequency ranking for a palette. Call `record(value)` in an item's
 * `onSelect`; pass `filter` to `<Command filter={…}>` to float recents to the
 * top (and read `recent`/`frequency` to render a "Recent" group).
 *
 * Persists to `localStorage` by default; pass any `[value, setValue]` tuple
 * (`useState`, `useSessionStorage`, a custom store) as `store` to swap it.
 */
function useRecentCommands(opts: {
  key?: string;
  store?: RecentStore;
  limit?: number;
  /** How strongly rank biases the filter score (0 = off). */
  weight?: number;
} = {}) {
  const { key = "garn:command:recent", store, limit = 50, weight = 0.5 } = opts;

  const localStore = useLocalStorage<RecentEntry[]>(key, []);
  const [entries, setEntries] = store ?? (localStore as unknown as RecentStore);

  const record = React.useCallback(
    (value: string) => {
      setEntries((prev) => {
        const existing = prev.find((e) => e.value === value);
        const entry: RecentEntry = {
          value,
          count: (existing?.count ?? 0) + 1,
          at: Date.now(),
        };
        // Prepend (most-recent-first) and drop the old position — deterministic
        // recency even when timestamps tie (rapid selections in one tick).
        return [entry, ...prev.filter((e) => e.value !== value)].slice(0, limit);
      });
    },
    [setEntries, limit]
  );

  // `entries` are stored newest-first by `record`, so this is already ordered.
  const recent = React.useMemo(() => entries.map((e) => e.value), [entries]);
  const frequency = React.useMemo(
    () => Object.fromEntries(entries.map((e) => [e.value, e.count])),
    [entries]
  );

  const rank = React.useCallback(
    (value: string) => {
      const idx = recent.indexOf(value);
      if (idx < 0) return 0;
      const recency = recent.length ? (recent.length - idx) / recent.length : 0;
      const maxCount = Math.max(1, ...entries.map((e) => e.count));
      const freq = (frequency[value] ?? 0) / maxCount;
      return 0.6 * recency + 0.4 * freq; // 0..1
    },
    [recent, entries, frequency]
  );

  const filter = React.useCallback<CommandFilter>(
    (value, search, keywords) => {
      const base = search ? defaultFilter(value, search, keywords) : 1;
      if (base === 0) return 0;
      return base + weight * rank(value);
    },
    [rank, weight]
  );

  const clear = React.useCallback(() => setEntries(() => []), [setEntries]);

  return { recent, frequency, record, rank, filter, clear };
}

// #endregion use-recent-commands
// #region use-command-search — debounced async fetch state machine
/**
 * The async-palette state machine, wrapped: debounces the query, runs `fetcher`,
 * and exposes `{ loading, error, results, empty, retry }` — plus the request is
 * cancelled if the query changes mid-flight, so stale responses never win. Wire
 * `query`/`setQuery` to `CommandInput`, `loading` to `Command`, and render
 * `CommandLoading` / `CommandError` / `CommandEmpty` off the flags.
 *
 * Pass `shouldFilter={false}` to `Command`: the fetcher already returns the
 * matches, so cmdk must not re-filter them by the query text once results land.
 */
function useCommandSearch<T>(
  fetcher: (query: string, signal: AbortSignal) => Promise<T[]>,
  opts: { debounce?: number; minLength?: number } = {}
) {
  const { debounce = 250, minLength = 1 } = opts;
  const [query, setQuery] = React.useState("");
  const debounced = useDebouncedValue(query, debounce);
  const [nonce, setNonce] = React.useState(0);
  const [state, setState] = React.useState<{
    loading: boolean;
    error: unknown;
    results: T[];
  }>({ loading: false, error: null, results: [] });

  const fetcherRef = React.useRef(fetcher);
  fetcherRef.current = fetcher;

  // biome-ignore lint/correctness/useExhaustiveDependencies: `nonce` is the retry trigger — retry() bumps it to re-run the fetch; the body never reads it.
  React.useEffect(() => {
    const q = debounced.trim();
    if (q.length < minLength) {
      setState({ loading: false, error: null, results: [] });
      return;
    }
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    fetcherRef.current(q, controller.signal).then(
      (results) => {
        if (!controller.signal.aborted)
          setState({ loading: false, error: null, results });
      },
      (error) => {
        if (!controller.signal.aborted && (error as Error)?.name !== "AbortError")
          setState({ loading: false, error, results: [] });
      }
    );
    return () => controller.abort();
  }, [debounced, nonce, minLength]);

  const retry = React.useCallback(() => setNonce((n) => n + 1), []);
  const empty =
    !state.loading &&
    !state.error &&
    debounced.trim().length >= minLength &&
    state.results.length === 0;

  return {
    query,
    setQuery,
    results: state.results,
    loading: state.loading,
    error: state.error,
    empty,
    retry,
  };
}

// #endregion use-command-search
// #region exports — public component + hook + type surface
export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandLoading,
  CommandError,
  CommandGroup,
  CommandItem,
  CommandItemActions,
  CommandAction,
  CommandShortcut,
  CommandFooter,
  CommandSeparator,
  useCommandShortcut,
  useCommandPages,
  useCommandSearch,
  useRecentCommands,
};
export type {
  CommandProps,
  CommandDialogProps,
  CommandItemProps,
  CommandItemActionsProps,
  CommandErrorProps,
  CommandApi,
  CommandDialogApi,
  CommandPage,
  CommandPrefixMap,
  RecentEntry,
  RecentStore,
};
// #endregion exports
