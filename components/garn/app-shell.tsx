"use client";
// #region imports — React, Radix, icons, shared hooks

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { PanelLeft, PanelRight } from "lucide-react";

import { cn, isEditableTarget } from "@/lib/utils";
import { useControllableState } from "@/lib/use-controllable-state";
import { useEventListener } from "@/lib/use-event-listener";
import { useResizeObserver } from "@/lib/use-resize-observer";
import { useMergedRef } from "@/lib/use-merged-ref";
import { Badge } from "@/components/garn/badge";
import { Button, type ButtonProps } from "@/components/garn/button";
import { CommandDialog } from "@/components/garn/command";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/garn/sheet";
// #endregion imports
// #region utils — config constants + adaptive size resolver

// The default skip-link target + AppShellMain id. Override both together (the
// `mainId` prop on AppShell, the `id` on AppShellMain) when a page renders more
// than one shell.
const APP_SHELL_MAIN_ID = "app-shell-main";
const SIDEBAR_COOKIE = "app-shell:sidebar";
const SIZE_COOKIE = "app-shell:size"; // seeds the size class server-side (no-flash)
const SIDEBAR_KEY = "b"; // ⌘B / Ctrl+B toggles the sidebar

/* ------------------------------------------------------------------ *
 * Adaptive size classes — the shell measures its own width (container,
 * not viewport, so it's correct when embedded / split-pane) and resolves
 * one of three classes, Material-3-informed but Tailwind-aligned:
 *   · compact  (< 640)  → sidebar + aside become overlay Sheets (phone)
 *   · medium   (640–1024) → sidebar auto-rails to icons (tablet)
 *   · expanded (≥ 1024) → full sidebar + inline aside (desktop; today)
 * The class rides the lifted context and reflects to `data-size`; sub-parts
 * react via `group-data-[size=…]/app-shell`.
 * ------------------------------------------------------------------ */
type AppShellSize = "compact" | "medium" | "expanded";
const COMPACT_MAX = 640; // < COMPACT_MAX → compact (Tailwind `sm`)
const EXPANDED_MIN = 1024; // ≥ EXPANDED_MIN → expanded (Tailwind `lg`)

function sizeForWidth(width: number): AppShellSize {
  if (width < COMPACT_MAX) return "compact";
  if (width < EXPANDED_MIN) return "medium";
  return "expanded";
}
// #endregion utils
// #region context — lifted state context + useAppShell

/* ------------------------------------------------------------------ *
 * State — a lifted context (the provider is the only place that knows
 * how collapse state is managed; the Trigger and the Sidebar are blind
 * siblings that read it). React 19 `use()` reads the context.
 * ------------------------------------------------------------------ */

interface AppShellContextValue {
  appearance: "framed" | "flush";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  /** The measured size class; `compact` is the phone/overlay tier. */
  size: AppShellSize;
  /** Back-compat alias — true at the `compact` tier (the old mobile drawer). */
  isMobile: boolean;
  state: "expanded" | "collapsed";
  toggleSidebar: () => void;
  asideOpen: boolean;
  setAsideOpen: (open: boolean) => void;
  /** Separate open state for the compact overlay aside (starts closed, like the
   *  sidebar drawer) — used only when `asideOpen` is uncontrolled. */
  asideOpenMobile: boolean;
  setAsideOpenMobile: (open: boolean) => void;
  /** True when `asideOpen` is controlled (e.g. Peek) — then the compact overlay
   *  follows `asideOpen` directly instead of the separate mobile state. */
  asideControlled: boolean;
  /** The effective aside visibility (inline pane open, or overlay open). */
  asideVisible: boolean;
  toggleAside: () => void;
}

const AppShellContext = React.createContext<AppShellContextValue | null>(null);

/** Read the shell's lifted state (open/aside/size + toggles) from any descendant of AppShell. */
function useAppShell(): AppShellContextValue {
  const ctx = React.use(AppShellContext);
  if (!ctx) {
    throw new Error("useAppShell must be used within <AppShell>.");
  }
  return ctx;
}
// #endregion context
// #region root — AppShell: measure, reconcile intent, provide

/* ------------------------------------------------------------------ *
 * Root — `appearance` is the surface/geometry switch (`framed` is doctrine
 * appearance vocabulary; `variant` stays reserved for structural axes);
 * sub-parts react via `group-data-[appearance=…]/app-shell` and
 * `group-data-[state=…]`.
 * ------------------------------------------------------------------ */

const appShellVariants = cva(
  "group/app-shell relative flex min-h-svh w-full bg-background text-foreground",
  {
    variants: {
      appearance: {
        framed:
          "[--app-shell-gutter:var(--garn-space-8)] gap-[var(--app-shell-gutter)] p-[var(--app-shell-gutter)]",
        flush: "gap-0 p-0",
      },
    },
    defaultVariants: { appearance: "flush" },
  }
);

export interface AppShellProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof appShellVariants> {
  /**
   * Skip-link target; must match the `id` on AppShellMain (shared default).
   * @default "app-shell-main"
   */
  mainId?: string;
  /** Controlled desktop sidebar open state. Always honored (explicit intent). */
  open?: boolean;
  /** Initial sidebar intent (uncontrolled). `undefined` = **auto**: the size
   *  class decides (expanded desktop, rail at medium). Seed from the
   *  `app-shell:sidebar` cookie server-side for an SSR no-flash restore. */
  defaultOpen?: boolean;
  /** Fires when the sidebar open state changes (trigger click, adaptive collapse). */
  onOpenChange?: (open: boolean) => void;
  /** Controlled detail-aside open state (e.g. for a Peek that opens on row click). */
  asideOpen?: boolean;
  /**
   * Initial detail-aside open state (uncontrolled).
   * @default true
   */
  defaultAsideOpen?: boolean;
  /** Fires when the detail-aside open state changes. */
  onAsideOpenChange?: (open: boolean) => void;
  /**
   * Adapt the layout to the shell's own width — auto-rail the sidebar and float
   * the aside/sidebar as Sheets on narrow. `false` pins the shell `expanded`
   * (static behavior).
   * @default true
   */
  adaptive?: boolean;
  /** Controlled size class — mostly observed; set it to force a tier (tests, docs). */
  size?: "compact" | "medium" | "expanded";
  /** Initial size class before measurement (uncontrolled). Seed from the
   *  `app-shell:size` cookie server-side to avoid a first-paint flash. */
  defaultSize?: "compact" | "medium" | "expanded";
  /** Fires when the measured (or forced) size class changes. */
  onSizeChange?: (size: "compact" | "medium" | "expanded") => void;
}

/**
 * Root + provider — owns `appearance`, the collapse/aside/size state, and renders the skip-link and the canvas.
 *
 * Documentation: https://garn.ohuba.com/components/app-shell
 */
function AppShell({
  className,
  appearance,
  mainId = APP_SHELL_MAIN_ID,
  open: openProp,
  defaultOpen,
  onOpenChange,
  asideOpen: asideOpenProp,
  defaultAsideOpen = true,
  onAsideOpenChange,
  adaptive = true,
  size: sizeProp,
  defaultSize,
  onSizeChange,
  ref,
  children,
  ...props
}: AppShellProps) {
  // Measure the shell's own width (container, not viewport) → a size class.
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const setRootRef = useMergedRef(ref, rootRef);
  const [measured, setMeasured] = React.useState<AppShellSize | null>(null);
  useResizeObserver(rootRef, (entry) => {
    const next = sizeForWidth(entry.contentRect.width);
    setMeasured((prev) => (prev === next ? prev : next));
  });

  const [size, setSizeState] = useControllableState<AppShellSize>({
    value: sizeProp,
    defaultValue: defaultSize ?? "expanded",
    onChange: onSizeChange,
  });
  // Feed measurement into the uncontrolled size (and seed the cookie for a
  // no-flash restore). Skipped when size is controlled or adaptivity is off.
  React.useEffect(() => {
    if (!adaptive || sizeProp !== undefined || measured === null) return;
    if (measured !== size) {
      setSizeState(measured);
      if (typeof document !== "undefined") {
        // biome-ignore lint/suspicious/noDocumentCookie: deliberate SSR-readable persistence — the Cookie Store API is async and still lacks Safari/Firefox support.
        document.cookie = `${SIZE_COOKIE}=${measured}; path=/; max-age=31536000`;
      }
    }
  }, [adaptive, sizeProp, measured, size, setSizeState]);
  // When adaptivity is off the shell is pinned to the desktop tier (today's look).
  const effectiveSize: AppShellSize = adaptive ? size : "expanded";

  // `openIntent` is the user's expand preference: `undefined` = auto (let the size
  // class decide). Controlled `open` and the cookie both set it explicitly.
  const [openIntent, setOpenIntent] = useControllableState<boolean | undefined>({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange as ((v: boolean | undefined) => void) | undefined,
  });
  const [asideOpen, setAsideOpen] = useControllableState({
    value: asideOpenProp,
    defaultValue: defaultAsideOpen,
    onChange: onAsideOpenChange,
  });
  const asideControlled = asideOpenProp !== undefined;
  const [openMobile, setOpenMobile] = React.useState(false);
  const [asideOpenMobile, setAsideOpenMobile] = React.useState(false);

  // The reconciliation: fold the size class into the user's intent. Compact always
  // drawers; medium rails unless the user explicitly expanded; expanded honors
  // intent/cookie (and auto → open, so wide screens never regress).
  const expanded =
    !adaptive
      ? openIntent ?? true
      : effectiveSize === "compact"
        ? false
        : openIntent !== undefined
          ? openIntent
          : effectiveSize === "expanded";
  const state: "expanded" | "collapsed" = expanded ? "expanded" : "collapsed";

  // Only user-initiated toggles write the cookie — breakpoint changes never do,
  // so widening the viewport restores the user's last intent.
  const setOpen = React.useCallback(
    (value: boolean) => {
      setOpenIntent(value);
      if (typeof document !== "undefined") {
        // biome-ignore lint/suspicious/noDocumentCookie: deliberate SSR-readable persistence — the Cookie Store API is async and still lacks Safari/Firefox support.
        document.cookie = `${SIDEBAR_COOKIE}=${
          value ? "expanded" : "collapsed"
        }; path=/; max-age=31536000`;
      }
    },
    [setOpenIntent]
  );

  const toggleSidebar = React.useCallback(() => {
    if (effectiveSize === "compact") setOpenMobile((v) => !v);
    else setOpen(!expanded);
  }, [effectiveSize, expanded, setOpen]);

  const toggleAside = React.useCallback(() => {
    // Compact + uncontrolled → the separate overlay state (mirrors the sidebar
    // drawer). Otherwise (desktop, or a controlled Peek) → the shared asideOpen.
    if (effectiveSize === "compact" && !asideControlled) {
      setAsideOpenMobile((v) => !v);
    } else {
      setAsideOpen(!asideOpen);
    }
  }, [effectiveSize, asideControlled, asideOpen, setAsideOpen]);

  const asideVisible =
    effectiveSize === "compact" && !asideControlled ? asideOpenMobile : asideOpen;

  useEventListener("keydown", (e) => {
    if (
      e.key.toLowerCase() === SIDEBAR_KEY &&
      (e.metaKey || e.ctrlKey) &&
      !e.shiftKey &&
      !e.altKey &&
      !isEditableTarget(e.target)
    ) {
      e.preventDefault();
      toggleSidebar();
    }
  });

  const ctx = React.useMemo<AppShellContextValue>(
    () => ({
      appearance: appearance ?? "flush",
      open: expanded,
      setOpen,
      openMobile,
      setOpenMobile,
      size: effectiveSize,
      isMobile: effectiveSize === "compact",
      state,
      toggleSidebar,
      asideOpen,
      setAsideOpen,
      asideOpenMobile,
      setAsideOpenMobile,
      asideControlled,
      asideVisible,
      toggleAside,
    }),
    [
      appearance,
      expanded,
      setOpen,
      openMobile,
      effectiveSize,
      state,
      toggleSidebar,
      asideOpen,
      setAsideOpen,
      asideOpenMobile,
      asideControlled,
      asideVisible,
      toggleAside,
    ]
  );

  return (
    <AppShellContext.Provider value={ctx}>
      <div
        ref={setRootRef}
        className={cn(appShellVariants({ appearance, className }))}
        data-slot="app-shell"
        data-appearance={appearance ?? "flush"}
        data-state={state}
        data-size={effectiveSize}
        data-aside={asideVisible ? "open" : "closed"}
        {...props}
      >
        <a
          href={`#${mainId}`}
          data-slot="app-shell-skip-link"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-[var(--garn-space-8)] focus:rounded-md focus:border focus:border-border focus:bg-popover focus:px-[var(--garn-pad-panel)] focus:py-[var(--garn-space-8)] focus:text-sm focus:font-medium focus:text-popover-foreground focus:shadow-md"
        >
          Skip to content
        </a>
        {children}
      </div>
    </AppShellContext.Provider>
  );
}
// #endregion root
// #region sidebar — shared side-panel variants + collapsible Sidebar

/* ------------------------------------------------------------------ *
 * Side regions — `appearance` is the surface model (see below); the
 * sidebar adds `collapsible` and a mobile drawer.
 * ------------------------------------------------------------------ */

// Side regions (sidebar + aside) share a surface model via `appearance`:
//   · flush    → no surface of its own; sits on the canvas (the inset look). In the
//                flush shell appearance it gets a hairline divider on the content
//                edge, and reads one ramp step below the content panel — the nav
//                is a zone of the canvas, the content is the sheet on top of it.
//   · raised   → a bg-card panel; floats (rounded-xl + hairline) in the framed shell.
//                In framed this is the even-handed choice: the gutter, the radius and
//                the hairline already separate the regions, so nav, content and aside
//                can share one surface and leave the canvas as the only tinted thing.
//   · recessed → a dimmer bg-muted panel (the nav recedes into the canvas) — same
//                float. Reach for it only when you want the nav to sit visibly BELOW
//                the canvas; in a framed shell it stacks a fill on top of separation
//                the gutter already provides, and the nav reads as sunken.
// `side` only decides which edge the flush divider sits on (RTL-safe logical borders).
const sidePanelVariants = cva(
  "flex w-64 shrink-0 flex-col gap-[var(--garn-gap-inline)] overflow-y-auto p-[var(--garn-pad-panel)]",
  {
    variants: {
      appearance: {
        flush: "",
        raised:
          "bg-card group-data-[appearance=framed]/app-shell:rounded-xl group-data-[appearance=framed]/app-shell:border group-data-[appearance=framed]/app-shell:border-border",
        recessed:
          "bg-muted group-data-[appearance=framed]/app-shell:rounded-xl group-data-[appearance=framed]/app-shell:border group-data-[appearance=framed]/app-shell:border-border",
        // `dark` scopes the garn token vars to their dark values for this subtree,
        // so the surface AND its nested controls invert — a real dark sidebar in
        // either mode, not just a background swap.
        contrast:
          "dark bg-card text-foreground group-data-[appearance=framed]/app-shell:rounded-xl group-data-[appearance=framed]/app-shell:border group-data-[appearance=framed]/app-shell:border-border",
      },
      side: { start: "", end: "" },
    },
    compoundVariants: [
      {
        side: "start",
        class:
          "group-data-[appearance=flush]/app-shell:border-e group-data-[appearance=flush]/app-shell:border-border",
      },
      {
        side: "end",
        class:
          "group-data-[appearance=flush]/app-shell:border-s group-data-[appearance=flush]/app-shell:border-border",
      },
    ],
    defaultVariants: { appearance: "flush", side: "start" },
  }
);

export interface AppShellSidebarProps
  extends React.ComponentProps<"div">,
    Pick<VariantProps<typeof sidePanelVariants>, "appearance"> {
  /** Desktop collapse behavior. `icon` shrinks to a rail; `offcanvas` hides it. */
  collapsible?: "none" | "icon" | "offcanvas";
}

/**
 * Primary navigation region. On desktop it's a layout container (the consumer's
 * `<nav>` inside is the landmark, keeping the detail Aside the page's single
 * `complementary`); on mobile the same children render in a drawer (Sheet).
 */
function AppShellSidebar({
  className,
  appearance,
  collapsible = "none",
  children,
  ...props
}: AppShellSidebarProps) {
  const { isMobile, openMobile, setOpenMobile } = useAppShell();

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          side="left"
          className={cn("w-72 p-[var(--garn-pad-panel)]", className)}
          {...props}
          data-slot="app-shell-sidebar"
          data-mobile="true"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Application sidebar
          </SheetDescription>
          <div className="flex h-full flex-col gap-[var(--garn-gap-inline)]">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      className={cn(
        sidePanelVariants({ appearance, side: "start" }),
        "transition-[width] duration-[var(--garn-motion-base)] ease-standard",
        collapsible === "icon" &&
          "group-data-[state=collapsed]/app-shell:w-14 group-data-[state=collapsed]/app-shell:overflow-hidden",
        collapsible === "offcanvas" &&
          "group-data-[state=collapsed]/app-shell:w-0 group-data-[state=collapsed]/app-shell:overflow-hidden group-data-[state=collapsed]/app-shell:p-0 group-data-[state=collapsed]/app-shell:opacity-0 group-data-[state=collapsed]/app-shell:pointer-events-none",
        className
      )}
      data-slot="app-shell-sidebar"
      data-appearance={appearance ?? "flush"}
      data-collapsible={collapsible}
      {...props}
    >
      {children}
    </div>
  );
}
// #endregion sidebar
// #region nav — sidebar nav landmark + rail-aware items

/* ------------------------------------------------------------------ *
 * Sidebar navigation — the vertical nav list. `AppShellNav` is the
 * <nav> landmark (+ optional section heading); `AppShellNavItem` is a
 * rail-aware nav button (active state, count badge, leading icon). Both
 * react to the sidebar's rail collapse via
 * `group-data-[state=collapsed]/app-shell`, so that boilerplate lives
 * here — not pasted onto every consumer's Buttons.
 * ------------------------------------------------------------------ */

// On the rail, a nav item keeps only its centered leading icon: the label and
// the count badge (Button's own slots) hide, and the item re-centers.
const NAV_ITEM_RAIL =
  "w-full justify-start group-data-[state=collapsed]/app-shell:justify-center group-data-[state=collapsed]/app-shell:[&_[data-slot=button-label]]:hidden group-data-[state=collapsed]/app-shell:[&_[data-slot=button-trailing]]:hidden";

// Section headings (and any label-only content) collapse away on the rail.
const HIDE_ON_RAIL = "group-data-[state=collapsed]/app-shell:hidden";

export interface AppShellNavProps extends React.ComponentProps<"nav"> {
  /** Optional section heading rendered above the items; hidden on the rail. */
  label?: React.ReactNode;
}

/**
 * A navigation group inside the sidebar — the `<nav>` landmark that stacks
 * AppShellNavItems. When `label` is set it renders a muted section heading that
 * collapses on the rail; that heading also names the landmark (aria-labelledby)
 * unless the consumer passes an explicit aria-label/aria-labelledby.
 */
function AppShellNav({
  className,
  label,
  children,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  ...props
}: AppShellNavProps) {
  const headingId = React.useId();
  const labelledBy =
    ariaLabelledby ?? (label != null && ariaLabel == null ? headingId : undefined);
  return (
    <nav
      className={cn("flex flex-col gap-[var(--garn-gap-inline)]", className)}
      data-slot="app-shell-nav"
      aria-label={ariaLabel}
      aria-labelledby={labelledBy}
      {...props}
    >
      {label != null ? (
        <p
          id={headingId}
          data-slot="app-shell-nav-label"
          className={cn(
            "px-[var(--garn-space-8)] pb-[var(--garn-gap-field)] text-xs text-muted-foreground",
            HIDE_ON_RAIL
          )}
        >
          {label}
        </p>
      ) : null}
      {children}
    </nav>
  );
}

export interface AppShellNavItemProps
  extends Omit<ButtonProps, "leading" | "trailing"> {
  /** Leading icon; stays centered when the sidebar collapses to a rail. */
  icon?: React.ReactNode;
  /** Trailing count — wrapped in a soft neutral Badge; hidden on the rail. */
  count?: React.ReactNode;
  /** Marks the current destination: soft fill + `aria-current="page"`. */
  active?: boolean;
}

/**
 * A sidebar nav item — composes Button with the rail-collapse behavior baked in,
 * an optional leading `icon` and trailing `count` badge, and an `active` state
 * that maps to a soft fill + `aria-current="page"`. `variant`/`tone`/`asChild`
 * pass through (the default `variant` follows `active`), so the same part also
 * serves a prominent sidebar action — e.g. a brand "Compose" — that must still
 * collapse to the rail.
 */
function AppShellNavItem({
  className,
  icon,
  count,
  active,
  variant,
  children,
  ...props
}: AppShellNavItemProps) {
  return (
    <Button
      variant={variant ?? (active ? "soft" : "ghost")}
      leading={icon}
      trailing={
        count != null ? (
          <Badge tone="neutral" appearance="soft" size="sm">
            {count}
          </Badge>
        ) : undefined
      }
      className={cn(NAV_ITEM_RAIL, className)}
      data-slot="app-shell-nav-item"
      data-active={active || undefined}
      aria-current={active ? "page" : undefined}
      {...props}
    >
      {children}
    </Button>
  );
}
// #endregion nav
// #region aside — contextual detail Aside (overlay on compact)

export interface AppShellAsideProps
  extends React.ComponentProps<"aside">,
    Pick<VariantProps<typeof sidePanelVariants>, "appearance"> {}

/**
 * Right-hand contextual region — a record/detail panel, activity feed, or an AI
 * assistant dock; the shell provides the region, the consumer the content. Defaults
 * to a raised panel (it reads as content, not chrome) on a slightly wider track.
 * On the compact tier it floats as a right-side overlay Sheet (mirroring the
 * sidebar drawer), so a phone screen isn't split three ways.
 */
function AppShellAside({
  className,
  appearance = "raised",
  "aria-label": ariaLabel,
  children,
  // <aside>'s ref can't transfer to the Sheet's <div> on the compact tier.
  ref,
  ...props
}: AppShellAsideProps) {
  const {
    size,
    asideOpen,
    setAsideOpen,
    asideOpenMobile,
    setAsideOpenMobile,
    asideControlled,
  } = useAppShell();
  const label = ariaLabel ?? "Details";

  if (size === "compact") {
    const open = asideControlled ? asideOpen : asideOpenMobile;
    const onOpenChange = asideControlled ? setAsideOpen : setAsideOpenMobile;
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className={cn("w-80 overflow-y-auto p-[var(--garn-pad-panel)]", className)}
          {...props}
          data-slot="app-shell-aside"
          data-mobile="true"
          data-appearance={appearance}
        >
          <SheetTitle className="sr-only">{label}</SheetTitle>
          <SheetDescription className="sr-only">Details panel</SheetDescription>
          <div className="flex h-full flex-col gap-[var(--garn-gap-inline)]">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className={cn(
        sidePanelVariants({ appearance, side: "end" }),
        "w-80 transition-[width] duration-[var(--garn-motion-base)] ease-standard",
        // collapses when the shell's aside is toggled closed (mirrors the sidebar)
        "group-data-[aside=closed]/app-shell:w-0 group-data-[aside=closed]/app-shell:overflow-hidden group-data-[aside=closed]/app-shell:border-0 group-data-[aside=closed]/app-shell:p-0 group-data-[aside=closed]/app-shell:opacity-0",
        className
      )}
      data-slot="app-shell-aside"
      data-appearance={appearance}
      aria-label={label}
      ref={ref}
      {...props}
    >
      {children}
    </aside>
  );
}
// #endregion aside
// #region trigger — sidebar toggle

export interface AppShellTriggerProps
  extends React.ComponentProps<typeof Button> {}

/** The sidebar toggle — composes Button; reflects open state via `aria-expanded`. */
function AppShellTrigger({
  className,
  onClick,
  children,
  ...props
}: AppShellTriggerProps) {
  const { toggleSidebar, state, isMobile, openMobile } = useAppShell();
  const expanded = isMobile ? openMobile : state === "expanded";
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={className}
      data-slot="app-shell-trigger"
      aria-label="Toggle sidebar"
      aria-expanded={expanded}
      onClick={(e) => {
        onClick?.(e);
        toggleSidebar();
      }}
      {...props}
    >
      {children ?? <PanelLeft />}
    </Button>
  );
}
// #endregion trigger
// #region aside-trigger — detail-aside toggle

export interface AppShellAsideTriggerProps
  extends React.ComponentProps<typeof Button> {}

/** Toggle for the detail Aside (the Peek/detail panel) — composes Button. */
function AppShellAsideTrigger({
  className,
  onClick,
  children,
  ...props
}: AppShellAsideTriggerProps) {
  const { toggleAside, asideVisible } = useAppShell();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={className}
      data-slot="app-shell-aside-trigger"
      aria-label="Toggle details"
      aria-expanded={asideVisible}
      onClick={(e) => {
        onClick?.(e);
        toggleAside();
      }}
      {...props}
    >
      {children ?? <PanelRight />}
    </Button>
  );
}
// #endregion aside-trigger
// #region command — ⌘K palette pass-through

export interface AppShellCommandProps
  extends Omit<React.ComponentProps<typeof CommandDialog>, "data-slot"> {}

/**
 * A ⌘K command palette — a thin pass-through over CommandDialog (the canonical
 * palette host, which owns the open-shortcut + controllable open). AppShell keeps
 * its own `data-slot` and its ⌘K-by-default; everything else is CommandDialog's
 * surface. Pass CommandInput/CommandList/CommandItem… as children.
 */
function AppShellCommand({
  title = "Command menu",
  description = "Search for a command to run",
  shortcut = "k",
  ...props
}: AppShellCommandProps) {
  return (
    <CommandDialog
      data-slot="app-shell-command"
      title={title}
      description={description}
      shortcut={shortcut}
      {...props}
    />
  );
}
// #endregion command
// #region content — framed/flush content panel

/* ------------------------------------------------------------------ *
 * Presentational regions (no state).
 * ------------------------------------------------------------------ */

/**
 * The single panel that groups header/main/footer. It always carries the raised
 * surface (bg-card) — that is what makes it read as the content panel rather
 * than more canvas. Framed adds the geometry on top: generous radius + hairline
 * border, clipped so the header/footer dividers meet the rounded corners — and
 * NO shadow. Flush keeps it edge-to-edge, where the surface step is doing work
 * the gutter can't: a `flush` side panel has no fill, so it shows the canvas
 * through, and nav and content land one ramp step apart across the divider.
 * Separation is carried by the gutter when there is one, and by the surface step
 * when there isn't — never by both at once.
 */
function AppShellContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col bg-card",
        "group-data-[appearance=framed]/app-shell:overflow-hidden group-data-[appearance=framed]/app-shell:rounded-xl group-data-[appearance=framed]/app-shell:border group-data-[appearance=framed]/app-shell:border-border",
        className
      )}
      data-slot="app-shell-content"
      {...props}
    />
  );
}
// #endregion content
// #region header — top header bar

/** Top bar of the content panel — breadcrumb/title/actions and the AppShellTrigger; renders `<header>`. */
function AppShellHeader({ className, ...props }: React.ComponentProps<"header">) {
  return (
    <header
      className={cn(
        "flex shrink-0 items-center gap-[var(--garn-gap-inline)] border-b border-border px-[var(--garn-pad-panel)] py-[var(--garn-space-12)]",
        className
      )}
      data-slot="app-shell-header"
      {...props}
    />
  );
}
// #endregion header
// #region toolbar — secondary strip + spacer

/**
 * A secondary header strip — saved-view tabs, filters, bulk actions. Sits between
 * the header and main, with a thinner rhythm than the header. Compose `tabs` /
 * `toggle-group` / controls inside; the region is just the strip.
 */
function AppShellToolbar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-[var(--garn-gap-inline)] border-b border-border px-[var(--garn-pad-panel)] py-[var(--garn-space-8)]",
        className
      )}
      data-slot="app-shell-toolbar"
      {...props}
    />
  );
}

/** A flexible spacer for declarative start/end alignment inside a toolbar or header. */
function AppShellToolbarSpacer({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex-1", className)}
      data-slot="app-shell-toolbar-spacer"
      aria-hidden="true"
      {...props}
    />
  );
}
// #endregion toolbar
// #region selection-bar — bulk-action bar variants + component

const selectionBarVariants = cva(
  "flex items-center gap-[var(--garn-gap-inline)] px-[var(--garn-pad-panel)] py-[var(--garn-space-8)]",
  {
    variants: {
      placement: {
        // full-width strip in place of the toolbar; accented "selection mode"
        // surface; soft fade-in.
        docked:
          "shrink-0 animate-fade-in border-b border-border bg-accent text-accent-foreground",
        // a rectangular pill floating bottom-center; a filled, mode-aware neutral
        // surface that rises in. The scoped `dark` color-context turns it into a
        // solid neutral bar AND keeps its nested controls (Clear + action Buttons)
        // legible on it — more visible than the accent tint, still calm.
        floating:
          "dark absolute inset-x-0 bottom-[var(--garn-space-20)] z-40 mx-auto w-fit animate-enter rounded-lg border border-border bg-popover text-popover-foreground shadow-lg",
      },
    },
    defaultVariants: { placement: "docked" },
  }
);

export interface AppShellSelectionBarProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof selectionBarVariants> {
  /** Number of selected rows — rendered and announced ("N selected", a polite live region). */
  count: number;
  /** When set, renders a Clear button that calls it — wire to your selection state's `clear`. */
  onClear?: () => void;
  /**
   * Label for the Clear button.
   * @default "Clear"
   */
  clearLabel?: string;
}

/**
 * A contextual bulk-action bar — render it when rows are selected. `placement`
 * picks where it lives: `docked` (a full-width strip in place of the toolbar,
 * fades in) or `floating` (a centered pill that rises from the bottom — the
 * Floating Action Bar pattern; it floats over the nearest positioned ancestor,
 * so give the content region `relative`). The accented surface signals
 * "selection mode"; compose action Buttons as children. Both entrances honor
 * prefers-reduced-motion.
 */
function AppShellSelectionBar({
  className,
  count,
  onClear,
  clearLabel = "Clear",
  placement = "docked",
  children,
  ...props
}: AppShellSelectionBarProps) {
  return (
    <div
      role="region"
      aria-label={`${count} selected`}
      className={cn(selectionBarVariants({ placement }), className)}
      data-slot="app-shell-selection-bar"
      data-placement={placement}
      {...props}
    >
      <span
        aria-live="polite"
        className="text-sm font-medium tabular-nums"
      >
        {count} selected
      </span>
      {onClear ? (
        <Button variant="ghost" size="sm" onClick={onClear}>
          {clearLabel}
        </Button>
      ) : null}
      <div
        className={cn(
          "flex items-center gap-[var(--garn-gap-inline)]",
          placement === "docked" && "ms-auto"
        )}
      >
        {children}
      </div>
    </div>
  );
}
// #endregion selection-bar
// #region main — scroll region + skip-link target

/**
 * The scroll region and the skip-link target — renders `<main>`. tabIndex=-1 lets
 * the skip-link move focus here; the focus outline is suppressed because it's a
 * programmatic target, not an interactive control.
 */
function AppShellMain({
  className,
  id = APP_SHELL_MAIN_ID,
  ...props
}: React.ComponentProps<"main">) {
  return (
    <main
      id={id}
      tabIndex={-1}
      className={cn(
        "min-h-0 flex-1 overflow-auto p-[var(--garn-pad-panel)] focus-visible:outline-hidden",
        className
      )}
      data-slot="app-shell-main"
      {...props}
    />
  );
}
// #endregion main
// #region footer — bottom footer bar

/** Bottom bar of the content panel — status/meta content; renders `<footer>`. */
function AppShellFooter({ className, ...props }: React.ComponentProps<"footer">) {
  return (
    <footer
      className={cn(
        "flex shrink-0 items-center border-t border-border px-[var(--garn-pad-panel)] py-[var(--garn-space-10)]",
        className
      )}
      data-slot="app-shell-footer"
      {...props}
    />
  );
}
// #endregion footer
// #region exports — public component surface

export {
  AppShell,
  AppShellSidebar,
  AppShellNav,
  AppShellNavItem,
  AppShellAside,
  AppShellContent,
  AppShellHeader,
  AppShellToolbar,
  AppShellToolbarSpacer,
  AppShellSelectionBar,
  AppShellMain,
  AppShellFooter,
  AppShellTrigger,
  AppShellAsideTrigger,
  AppShellCommand,
  useAppShell,
  appShellVariants,
  sidePanelVariants,
};
// #endregion exports
