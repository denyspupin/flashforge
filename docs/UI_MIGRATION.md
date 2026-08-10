# UI Migration Plan — shadcn/Base UI → garn-ui

> **Goal:** Replace the current shadcn "base-nova" component layer (built on `@base-ui/react`) with [garn-ui](https://garn.ohuba.com) (Radix + Tailwind v4, source-first). Adopt a full neutral, minimalistic, light aesthetic. Introduce garn's `AppShell` for the authed app layout. Keep framer-motion. Migrate gradually, side-by-side.

---

## Decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Theme direction | **Full neutral reset** — abandon ember/paper/ink/honey/leaf tokens, grain texture, Fraunces serif display, ink-stamp. Adopt garn's default neutral light theme. |
| 2 | Layout pattern | **Adopt garn AppShell** — left sidebar nav + header for the authed app. Public/landing stays plain layout. Admin gets its own AppShell variant. |
| 3 | Migration strategy | **Gradual, side-by-side** — garn installed into `@/components/garn/` alongside existing `@/components/ui/`. Feature areas migrated one at a time. Old primitives deleted as the last import disappears. |
| 4 | Motion | **Keep framer-motion as-is** — flip card, study card swap, landing reveals, count-ups all preserved. garn-ui (Radix-only) does not conflict. |

---

## Current State Summary

### Component primitives (`components/ui/` — 14 files)

All built on **`@base-ui/react`** (Base UI v1.5.0), not classic Radix — except `form.tsx` which uses `@radix-ui/react-label` + `@radix-ui/react-slot`.

| File | Primitive lib | Key APIs used |
|------|---------------|---------------|
| `button.tsx` | `@base-ui/react/button` | `render` prop, `nativeButton`, `cva` variants |
| `badge.tsx` | `@base-ui/react/merge-props` + `use-render` | `useRender` polymorphic pattern, custom `highlight` variant |
| `card.tsx` | plain divs | `data-slot`, `size` prop, `@container` pattern |
| `dialog.tsx` | `@base-ui/react/dialog` | `.Root/.Trigger/.Portal/.Close/.Backdrop/.Popup/.Title/.Description` |
| `dropdown-menu.tsx` | `@base-ui/react/menu` | Full menu API, `variant`/`inset` on items, submenus |
| `form.tsx` | `react-hook-form` + `@radix-ui/react-label` + `@radix-ui/react-slot` | `FormProvider`, `Slot` for `FormControl` |
| `input.tsx` | `@base-ui/react/input` | plain |
| `kbd.tsx` | plain `<kbd>` | custom |
| `label.tsx` | plain `<label>` | |
| `select.tsx` | `@base-ui/react/select` | `.Root/.Trigger/.Positioner/.Popup/.List/.Item`, `size` prop |
| `skeleton.tsx` | plain div | `animate-pulse` |
| `switch.tsx` | `@base-ui/react/switch` | `.Root/.Thumb` |
| `tabs.tsx` | `@base-ui/react/tabs` | `.Root/.List/.Tab/.Panel`, `data-active` styling |
| `textarea.tsx` | plain `<textarea>` | `field-sizing-content` |

### Theme system (`app/globals.css`)

- HSL-triplet CSS variables on `:root` (light) and `.dark` (dark).
- Standard shadcn tokens: `--background`, `--foreground`, `--card`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--radius`.
- **Custom brand tokens** (to be dropped): `--paper`, `--ink`, `--ember`, `--ember-deep`, `--honey`, `--leaf`, `--forest`, `--brick`, `--rust`.
- **Custom utilities** (to be dropped): `.grain`, `.paper-warm`, `.ember-glow`, `.ember-glow-strong`, `.ink-stamp`, `.ink-line`, `.ember-line`, `.font-display`, `.font-display-soft`, `.font-mono-tag`.
- **Custom utilities** (to be kept): `.perspective-1000`, `.preserve-3d`, `.backface-hidden`, `.rotate-y-180` (needed for the 3D flip card).
- Custom keyframes: `ember-pulse`, `float-slow`, `shimmer`, `reveal-up`, `draw-line` (defined but not directly used in tsx — reveals go through framer-motion).
- Imports: `tailwindcss`, `tw-animate-css`, `shadcn/tailwind.css`.

### Fonts (`lib/fonts.ts`)

- `Geist` → `--font-sans` (body) — **keep**.
- `Fraunces` (opsz + SOFT axes) → `--font-serif` → `.font-display` / `.font-display-soft` — **drop** in neutral reset.
- `JetBrains Mono` → `--font-mono` → `.font-mono-tag` — **drop**; garn uses platform mono stack.

### Layout chrome (`components/layout/` — 11 files)

- `AppHeader` — shared header primitive (sticky, `bg-paper/70 backdrop-blur`, max-w-1280px).
- `DashboardShell` — wraps `AppHeader` + `<main max-w-6xl>`.
- `MobileNav` — `Dialog`-based right-drawer with heavy class overrides.
- `UserMenu` — `DropdownMenu` with avatar trigger.
- `Wordmark` — logo.png + Fraunces "Flash" + italic ember "forge".
- Admin chrome — separate `AdminShell` with its own nav set.

### Feature surface

- ~70 feature components across 13 directories.
- ~30 page routes across 5 layout groups: `(public)`, `(auth)`, `(dashboard)`, `admin/`, `explore/`.
- 11 framer-motion import sites (study + landing are motion-critical).
- ~95 `font-mono-tag` usages, ~30 `font-display` usages.
- No toast system — errors shown via inline `role="alert"` divs and `window.confirm()`.
- Admin views use raw HTML `<table>` elements (not a component).
- `app/(dashboard)/decks/[id]/page.tsx` is a 672-line inline page with `document.getElementById` form-reading anti-pattern.

---

## Token & Utility Mapping (Full Neutral Reset)

### Color tokens

| Current token | Current usage | garn replacement |
|---------------|-------------|------------------|
| `--paper` / `bg-paper` | page background | `--garn-background` / `bg-background` |
| `--ink` / `text-ink` | primary text | `--garn-foreground` / `text-foreground` |
| `--ember` / `--primary` | brand accent | `--garn-brand-solid` / `bg-brand-solid text-brand-solid` |
| `--ember-deep` | darker ember | `--garn-brand-strong` |
| `--honey` | warm yellow accent | (drop — use `chart-2` or `warning` if needed) |
| `--leaf` / `--forest` | success green | `--garn-success-solid` / `bg-success-solid` |
| `--brick` | "missed it" red | `--garn-danger-solid` / `bg-danger-solid` |
| `--rust` | brownish accent | (drop — map to `danger` or `warning`) |
| `--card` / `bg-card` | card surface | `--garn-card` / `bg-card` |
| `--popover` | popover surface | `--garn-popover` / `bg-popover` |
| `--secondary` | secondary surface | `--garn-secondary` / `bg-secondary` |
| `--muted` / `--muted-foreground` | muted text/surface | `--garn-muted` / `--garn-muted-foreground` |
| `--accent` | accent surface | `--garn-accent` / `bg-accent` |
| `--destructive` | destructive actions | `--garn-danger` / `text-danger` |
| `--border` | borders | `--garn-border` / `border-border` |
| `--input` | input borders | `--garn-input` / `border-input` |
| `--ring` | focus ring | `--garn-ring` / `ring-ring` |
| `--radius` | border radius | `--garn-radius` |

### Typography utilities

| Current utility | Replacement |
|----------------|-------------|
| `.font-display` (Fraunces opsz 144 SOFT 50) | Tailwind heading classes: `text-3xl font-semibold tracking-tight` (use garn's type scale) |
| `.font-display-soft` (Fraunces italic SOFT 100) | `text-3xl font-semibold tracking-tight italic` or drop the italic distinction |
| `.font-mono-tag` (JetBrains Mono uppercase tracking) | `font-mono text-xs uppercase tracking-wider text-muted-foreground` or `text-xs font-medium text-muted-foreground` for metadata chips |
| `font-heading` (undefined token, used in card/dialog titles) | `font-semibold` (garn headings use semibold) |

### Visual utilities

| Current utility | Action |
|----------------|--------|
| `.grain` (body class — global SVG noise) | **Remove** — drop from `<body>` in `app/layout.tsx` |
| `.paper-warm` | **Remove** — use `bg-background` |
| `.ember-glow` / `.ember-glow-strong` | **Remove** |
| `.ink-stamp` | **Remove** — use garn card border/ring |
| `.ink-line` / `.ember-line` | **Remove** — use `Separator` or `border-t` |
| `.perspective-1000` | **Keep** — needed for flip card |
| `.preserve-3d` | **Keep** — needed for flip card |
| `.backface-hidden` | **Keep** — needed for flip card |
| `.rotate-y-180` | **Keep** — needed for flip card |
| `.animate-ember-pulse` / `.animate-float-slow` / `.animate-reveal-up` / `.animate-draw-line` | **Remove** — unused in tsx (framer-motion handles reveals) |
| `.delay-100`…`.delay-500` | **Remove** — unused |
| `.text-balance` / `.text-pretty` | **Keep** — framework-agnostic, useful |

### Polymorphism API mapping

| Base UI pattern | garn-ui (Radix) equivalent |
|----------------|--------------------------|
| `<DialogTrigger render={<Button …/>}>` | `<DialogTrigger asChild><Button …/></DialogTrigger>` |
| `<DropdownMenuTrigger render={<Button …/>}>` | `<DropdownMenuTrigger asChild><Button …/></DropdownMenuTrigger>` |
| `<SelectTrigger render={<Button …/>}>` | `<SelectTrigger asChild><Button …/></SelectTrigger>` |
| `Button` `render` prop + `nativeButton={false}` | `Button` `asChild` prop |
| `Badge` `useRender` + `mergeProps` | `Badge` `asChild` prop (standard Radix Slot) |

---

## Component Mapping

| Current (`@/components/ui/`) | garn-ui (`@/components/garn/`) | Notes |
|---------------------------|-------------------------------|-------|
| `button` | `button` | Variants differ — garn uses `tone` + `emphasis` axes instead of `variant` |
| `badge` | `badge` | Drop custom `highlight` variant |
| `card` | `card` | Drop `size` prop if garn doesn't support it; use className |
| `dialog` | `dialog` | API change: Base UI → Radix |
| `dropdown-menu` | `dropdown-menu` | API change: Base UI → Radix |
| `form` | `form` | Radix Slot — should be compatible |
| `input` | `input` | Direct swap |
| `kbd` | `kbd` | Direct swap |
| `label` | `label` | Direct swap |
| `select` | `select` | API change: Base UI → Radix |
| `skeleton` | `skeleton` | Direct swap |
| `switch` | `switch` | API change: Base UI → Radix |
| `tabs` | `tabs` | API change: Base UI → Radix; `data-active` → `data-[state=active]` |
| `textarea` | `textarea` | Direct swap |
| — | `app-shell` | **New** — replaces DashboardShell/AppHeader/MobileNav |
| — | `sheet` | **New** — AppShell uses it for mobile drawer |
| — | `sonner` | **New** — toast system (replaces inline alert divs) |
| — | `tooltip` | **New** |
| — | `separator` | **New** |
| — | `avatar` | **New** — replaces custom avatar in UserMenu/profile |
| — | `table` | **New** — replaces raw HTML tables in admin |
| — | `pagination` | **New** — for history/admin |
| — | `alert` | **New** — for inline errors |
| — | `alert-dialog` | **New** — replaces `window.confirm()` and ConfirmDialog |
| — | `empty` | **New** — for empty states |
| — | `field` | **New** — pairs control with label/help |
| — | `spinner` | **New** — replaces `Loader2` icon spin |
| — | `progress` | **New** — for study progress bar |
| — | `breadcrumb` | **New** — for detail pages in AppShell |
| — | `stat` | **New** — for dashboard/profile stat tiles |
| — | `radio-group` | **New** — for theme selector in profile |
| — | `checkbox` | **New** — for forms |
| — | `popover` | **New** |
| — | `scroll-area` | **New** — optional |
| — | `navigation-menu` | **New** — for landing header |

---

## Phased Migration Plan

### Phase 0 — Foundation setup (no visual change)

**Goal:** Install garn-ui alongside the existing system with zero impact on running app.

1. **Install garn CLI and initialize**
   ```bash
   npx garn-ui init --yes --force
   ```
   - This writes `garn.json`, base files (`cn` helper, `garn-theme.css`, `.garn/rules.md`).
   - Configure `garn.json` to use `@/components/garn` as the ui alias (instead of `@/components/ui`).
   - Keep existing `cn` in `lib/utils.ts` — point garn at it (same implementation: `clsx + tailwind-merge`).

2. **Wire the garn theme into globals.css**
   ```css
   @import "tailwindcss";
   @import "./garn-theme.css";   /* ← new */
   @import "tw-animate-css";
   @import "shadcn/tailwind.css"; /* ← keep until Phase 11 cleanup */
   ```
   - garn's `--garn-*` tokens coexist with the old `--*` tokens (different variable names, no conflict).
   - Old components keep using old tokens; new garn components use garn tokens.

3. **Add core garn components** (into `@/components/garn/`):
   ```bash
   npx garn-ui add button card dialog dropdown-menu input label select \
     switch tabs textarea badge skeleton kbd form sonner sheet tooltip \
     separator avatar table pagination alert alert-dialog empty field \
     spinner progress breadcrumb stat radio-group checkbox popover \
     scroll-area navigation-menu app-shell
   ```

4. **Set up the garn MCP** for AI-assisted migration:
   ```bash
   npx garn-ui mcp install
   ```

5. **Import garn rules into AGENTS.md** — add:
   ```
   Before writing any UI, read `.garn/rules.md` and follow it.
   ```

6. **Verify:** `pnpm dev` — app unchanged, garn components available but unused.

**Deliverable:** garn-ui installed, themed, and available at `@/components/garn/` with no visual change.

---

### Phase 1 — AppShell layout (authed app)

**Goal:** Replace the top-nav chrome with garn's `AppShell` for all authed pages. This is the single biggest UX change — it affects every `(dashboard)` and `admin/` page at once, but only the chrome, not page content.

1. **Create `components/layout/app-shell.tsx`** — a wrapper around garn's `AppShell`:
   - `AppShellSidebar` with `collapsible="icon"` (auto-rails at tablet, drawer at mobile).
   - `AppShellNav` with nav items: Dashboard, My Decks, Collections, Explore, Study.
   - `AppShellHeader` with: `AppShellTrigger` (sidebar toggle), breadcrumb/title slot, actions (`ThemeQuickToggle`, `UserMenu`).
   - `AppShellContent` → `AppShellMain` wraps the page children.
   - `appearance="framed"` for the light, inset panel look.

2. **Update `app/(dashboard)/layout.tsx`** — replace `DashboardShell` with the new AppShell wrapper.

3. **Migrate `UserMenu`** — swap `DropdownMenu` from `@/components/ui/` to `@/components/garn/`. Replace custom avatar with garn `Avatar`.

4. **Migrate `ThemeQuickToggle`** — swap `Button` to garn `Button`.

5. **Replace `MobileNav`** — AppShell's adaptive compact tier floats the sidebar as a `Sheet` automatically. Delete `mobile-nav.tsx`, `mobile-user-footer.tsx`, `mobile-user-footer-with-admin.tsx`. Move footer items (Notifications, Study history, Profile, Sign out) into the sidebar nav or a sidebar footer.

6. **Create admin AppShell variant** — `components/layout/admin-app-shell.tsx` with admin nav items (Overview, Users, Decks, Collections, Prompts, Topics, Languages). Update `app/admin/layout.tsx`.

7. **Update `Wordmark`** — drop Fraunces `font-display` / `font-display-soft`. Use a clean sans wordmark: `Flash` + `forge` in `font-semibold` (no italic ember). Or simplify to just the logo.png + "FlashForge" in `text-lg font-semibold tracking-tight`.

8. **Public/landing stays plain** — `app/(public)/layout.tsx` and `app/explore/` (anon variant) keep a simple header, no AppShell. Migrate `SiteHeader` to garn `NavigationMenu` or keep as plain links with garn `Button`.

**Deliverable:** Authed app runs inside garn AppShell. All pages render correctly within the new shell. Old `AppHeader` / `DashboardShell` / `MobileNav` deleted.

---

### Phase 2 — Landing page (public marketing)

**Goal:** Migrate the marketing site to garn primitives with neutral aesthetic.

**Files:** `components/landing/` (13 files), `app/(public)/page.tsx`, `app/(public)/layout.tsx`.

1. **`hero-section.tsx`** — drop `paper-warm` + `ember-glow` backgrounds → `bg-background`. Keep framer-motion `Reveal` wrapper (decision 4). Replace `font-display` headings with garn type scale (`text-4xl font-semibold tracking-tight`). Replace ink-pill CTA with garn `Button` `size="lg"`.

2. **`flashcard-preview.tsx`** — keep `FlipCard` + `CardFront`/`CardBack` (framer-motion preserved). Restyle card faces: drop `ink-stamp`, drop `font-display`, use garn `Card` surfaces. The flip card is the one place a distinctive look can remain — but in neutral tones (`bg-card` / `bg-foreground text-background`).

3. **`flame-mark.tsx`** — simplify the SVG. Drop ember/honey gradients → single neutral or brand color. Or replace with a simple geometric mark.

4. **`gamification-section.tsx`** — keep framer-motion count-ups + streak bars. Replace `text-ember` / `text-honey` with `text-brand-solid` / `text-chart-2`. Replace `font-mono-tag` with `font-mono text-xs uppercase tracking-wider text-muted-foreground`.

5. **`library-section.tsx`** — replace hue-mapped gradient thumbnails with neutral card thumbnails. Use garn `Card`.

6. **`process-section.tsx`**, **`topics-section.tsx`** — replace `font-display-soft` step numbers with `text-3xl font-semibold`. Replace accent color maps with garn semantic tokens (`brand`, `success`, `warning`, `danger`, `info`).

7. **`cta-section.tsx`** — drop `ember-glow` → clean `bg-background` with a garn `Button` CTA.

8. **`site-header.tsx`** — migrate to garn `NavigationMenu` or keep plain links with garn `Button`. Migrate `HeaderActions` to garn `Button`.

9. **`landing-footer.tsx`** — neutral styling, garn `Separator`.

**Deliverable:** Landing page fully on garn, neutral aesthetic, framer-motion preserved.

---

### Phase 3 — Auth pages

**Goal:** Migrate Clerk-hosted auth pages.

**Files:** `app/(auth)/layout.tsx`, `app/(auth)/login/`, `app/(auth)/register/`.

1. **`app/(auth)/layout.tsx`** — drop `paper-warm` + `ember-glow` → clean `bg-background`. Center the wordmark link. Minimal.

2. **`lib/clerk/appearance.ts`** — remove `colorPrimary: "hsl(14 78% 55%)"` (ember). Set to garn's brand or leave default neutral:
   ```typescript
   export const clerkAppearance = {
     variables: {
       fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
     },
     options: {
       logoPlacement: "outside",
     },
   } as const
   ```

3. Clerk `<SignIn>` / `<SignUp>` components render their own UI — only the surrounding layout changes.

**Deliverable:** Auth pages clean and neutral.

---

### Phase 4 — Dashboard

**Goal:** Migrate the dashboard view.

**Files:** `components/dashboard/` (4 files), `app/(dashboard)/dashboard/page.tsx`.

1. **`dashboard-view.tsx`** — replace stat cards with garn `Stat` component (or garn `Card` + custom layout). Replace raw `text-orange-500` / `text-yellow-500` with garn semantic tokens (`text-brand-solid`, `text-warning`, `text-success`).

2. **`continue-studying-card.tsx`** — garn `Card`.

3. **`recent-deck-card.tsx`** — wraps `DeckCard` (migrated in Phase 5). Swap `Button` / `DropdownMenu` to garn.

4. **`dashboard-skeleton.tsx`** — garn `Skeleton`.

**Deliverable:** Dashboard on garn primitives, neutral stat tiles.

---

### Phase 5 — Decks

**Goal:** Migrate deck listing, deck card, deck detail, and deck import.

**Files:** `components/deck/` (5 files), `app/(dashboard)/decks/page.tsx`, `app/(dashboard)/decks/[id]/page.tsx` (672 lines).

1. **Extract `decks/[id]/page.tsx`** into `components/deck/deck-detail.tsx` before migrating. Fix the `document.getElementById` form-reading anti-pattern → use `react-hook-form` or `useState`. This is a prerequisite, not optional.

2. **`deck-card.tsx`** — compound `DeckCard` with `.Skeleton`, `.EmptyState`, `.VisibilityBadge`, `.CuratedBadge`, `.ForkedBadge`, `.TopicBadges`. Swap `Badge` / `Button` to garn. Replace `font-mono-tag` metadata chips with `font-mono text-xs uppercase tracking-wider text-muted-foreground`. Drop hover-reveal study button `[@media(hover:none)]` overrides — garn `Button` handles touch.

3. **`deck-list.tsx`** (521 lines) — swap `Dialog` / `Form` / `Input` / `Select` / `Switch` / `Button` to garn. The create-deck form uses `react-hook-form` + zod — garn `Form` is compatible. Replace `Wand2` AI toggle with garn `Switch`. Add garn `Sonner` toaster for success/error feedback (replaces inline alert divs).

4. **`deck-actions-menu.tsx`** — swap `DropdownMenu` to garn. `asChild` pattern for trigger.

5. **`deck-import-section.tsx`** (535 lines) — swap primitives. Consider garn `FileUpload` for the file input. Replace `Loader2` spin with garn `Spinner`.

6. **`deck-detail.tsx`** (extracted) — swap all primitives. Add garn `Breadcrumb` in the AppShell header. Use garn `AlertDialog` for delete confirmation (replaces `window.confirm()`).

**Deliverable:** Decks fully on garn, detail page extracted, toasts for feedback.

---

### Phase 6 — Collections

**Goal:** Migrate collection listing, detail, and import.

**Files:** `components/collection/` (9 files), `app/(dashboard)/collections/`, `app/explore/collections/[id]/page.tsx`.

1. **`collection-card.tsx`** — mirror of `DeckCard`, same migration pattern.

2. **`collection-list.tsx`** — same pattern as `deck-list.tsx`.

3. **`collection-detail.tsx`** (795 lines) — swap primitives. Replace `window.confirm()` with garn `AlertDialog`. Add garn `Breadcrumb`.

4. **`collection-add-decks-dialog.tsx`** — garn `Dialog`.

5. **`collection-import-section.tsx`** — same as `deck-import-section.tsx`.

6. **`collection-actions-menu.tsx`**, **`deck-in-collection-actions-menu.tsx`** — garn `DropdownMenu`.

**Deliverable:** Collections fully on garn.

---

### Phase 7 — Study session

**Goal:** Migrate the study experience. The 3D flip card is preserved (framer-motion kept).

**Files:** `components/study/` (10 files), `components/card/` (3 files), `app/(dashboard)/study/`.

1. **`flip-card.tsx`** — **no change to the flip mechanism**. framer-motion `rotateY` animation + CSS 3D utilities (`perspective-1000`, `preserve-3d`, `backface-hidden`, `rotate-y-180`) all preserved. Only the surrounding container classes may need token updates (`bg-card` etc.).

2. **`card-face.tsx`** — drop `ink-stamp` → use garn card border/ring. Drop `font-display` → `text-3xl font-semibold`. Drop `font-mono-tag` → `font-mono text-xs uppercase tracking-wider text-muted-foreground`. Drop custom shadow tokens → garn shadow tokens or `shadow-lg`. Front face: `bg-card text-card-foreground`. Back face: `bg-foreground text-background` (neutral inversion, was `bg-ink text-paper`). Topic chip: garn `Badge`.

3. **`study-frame.tsx`** — keep `AnimatePresence` + `motion.div` card swap. Swap `Kbd` to garn. Replace `pointer-fine:` variant usage — garn `Kbd` may handle this. Update token references.

4. **`study-progress.tsx`** — keep framer-motion `width` animation. Swap `Flame` icon color from `text-ember` to `text-brand-solid`.

5. **`study-controls.tsx`** — "Reveal answer" ink button → garn `Button variant="outline"`. "Missed it" `bg-brick` → `bg-danger-solid text-danger-solid-foreground`. "Got it" `bg-forest` → `bg-success-solid text-success-solid-foreground`. Swap `Kbd` to garn.

6. **`study-summary.tsx`** — keep `CountUp` (rAF-based). Swap stat cards to garn `Stat` or `Card`. Replace `text-ember` / `text-honey` with garn tokens.

7. **`study-context.tsx`** — no UI, just context + keyboard handlers. No change needed.

8. **`study-player.tsx`** / **`guest-study-player.tsx`** — swap primitives used in completion/summary rendering.

9. **`app/(dashboard)/study/page.tsx`** — interstitial with framer-motion flame. Simplify: drop ember styling, use `text-brand-solid` or a neutral loading state with garn `Spinner`.

10. **`app/(dashboard)/study/[sessionId]/page.tsx`** — loading state: replace framer-motion pulsing card silhouette with garn `Skeleton` or keep the motion silhouette with neutral tokens.

**Deliverable:** Study session on garn, flip card preserved, neutral card faces.

---

### Phase 8 — History, Profile, Notifications, Explore

**Goal:** Migrate remaining authed pages.

#### History

**Files:** `components/history/` (6 files), `app/(dashboard)/history/page.tsx`.

1. **`history-view.tsx`** — replace custom sort toggle (native `<button>` role=tab) with garn `Tabs` or `ToggleGroup`. Swap `Card` to garn. Add garn `Pagination`.

2. **`session-row.tsx`** — swap `Card` to garn. Replace custom accuracy/miss/XP pills with garn `Badge`. Replace `toneClasses` accent map with garn semantic tokens.

#### Profile

**Files:** `components/profile/` (5 files), `app/(dashboard)/profile/page.tsx`.

1. **`profile-view.tsx`** — drop `ember-glow` bg → `bg-background`. Swap `Card` to garn. Replace `StatTile` with garn `Stat`. Replace raw `text-orange-500` etc. with garn tokens. Swap `Avatar` to garn `Avatar`.

2. **`profile-settings-form.tsx`** (342 lines) — swap `Form` / `Input` / `Select` / `Button` to garn. Replace custom theme radio (Sun/Moon icons) with garn `RadioGroup`. Add garn `Sonner` for save feedback.

3. **`avatar-editor.tsx`** / **`avatar-picker.tsx`** — swap `Dialog` to garn. Swap `Avatar` to garn.

#### Notifications

**Files:** `app/(dashboard)/notifications/page.tsx` (stub), `components/notifications/` (empty).

1. This is currently a stub (`<h1>Notifications</h1>`). Either build it out with garn `List` / `Empty` / `Counter`, or leave as a stub on garn primitives. Low priority.

#### Explore

**Files:** `app/explore/page.tsx` (437 lines, client), `app/explore/decks/[id]/page.tsx`, `app/explore/decks/[id]/study/page.tsx`, `app/explore/collections/[id]/page.tsx`.

1. **`app/explore/page.tsx`** — swap `Tabs` / `Input` / `Card` / `Badge` / `Button` to garn. Replace inline grid markup with garn components. Add garn `Skeleton` / `Empty` for loading/empty states.

2. **`app/explore/decks/[id]/page.tsx`** — swap primitives. Add garn `Breadcrumb`. Replace `Badge` variants.

3. **`app/explore/decks/[id]/study/page.tsx`** — renders `<GuestStudyPlayer>` (migrated in Phase 7).

4. **`app/explore/collections/[id]/page.tsx`** — renders `<CollectionDetail>` (migrated in Phase 6).

**Deliverable:** All remaining authed pages on garn.

---

### Phase 9 — Admin

**Goal:** Migrate the admin backoffice.

**Files:** `components/admin/` (12 files), `app/admin/` (all pages).

1. **Admin AppShell** — already created in Phase 1. Verify nav items and breadcrumb.

2. **`admin-users-view.tsx`**, **`admin-decks-view.tsx`**, **`admin-collections-view.tsx`** — replace raw HTML `<table>` with garn `Table` primitives (`Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`). Add garn `Pagination`. Swap search `Input` to garn.

3. **`admin-overview-view.tsx`** — swap `Card` / `Skeleton` to garn. Replace stat tiles with garn `Stat`.

4. **Detail views** (`admin-user-detail-view.tsx`, `admin-deck-detail-view.tsx`, `admin-collection-detail-view.tsx`, `admin-prompt-detail-view.tsx`) — swap primitives. Add garn `Breadcrumb`.

5. **`admin-prompts-view.tsx`**, **`admin-topics-view.tsx`**, **`admin-languages-view.tsx`** — swap primitives.

6. **`confirm-dialog.tsx`** — replace with garn `AlertDialog`.

**Deliverable:** Admin fully on garn, tables using garn `Table`.

---

### Phase 10 — Global error/loading pages

**Files:** `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`, `app/(dashboard)/error.tsx`, `app/(public)/not-found.tsx`, `app/admin/error.tsx`.

1. Replace `font-display` headings with garn type scale.
2. Replace ember accents with `text-brand-solid` or neutral.
3. `global-error.tsx` uses raw inline HTML/CSS — update colors to neutral.

**Deliverable:** Error/404 pages neutral and on-brand.

---

### Phase 11 — Cleanup

**Goal:** Remove all old system artifacts. The app is now 100% garn-ui.

1. **Delete old primitives** — remove all files in `components/ui/` that have garn replacements. Verify no imports remain:
   ```bash
   rg "@/components/ui/" --type ts --type tsx
   ```
   If clean, delete `components/ui/`.

2. **Remove `@base-ui/react`** from `package.json`:
   ```bash
   pnpm remove @base-ui/react
   ```
   Also remove `@radix-ui/react-label` and `@radix-ui/react-slot` if no longer used (garn brings its own Radix deps).

3. **Remove `shadcn` dev dependency** and `components.json`:
   ```bash
   pnpm remove shadcn
   rm components.json
   ```

4. **Clean up `app/globals.css`**:
   - Remove `@import "shadcn/tailwind.css"`.
   - Remove `@import "tw-animate-css"` if garn provides equivalent animations (check garn's dialog/dropdown/sheet animations).
   - Remove old `:root` and `.dark` token blocks (the `--background`, `--foreground`, `--primary`, `--ember`, `--honey`, etc.).
   - Remove old `@theme inline` block mapping `--color-*` to old tokens.
   - Remove dropped utilities: `.grain`, `.paper-warm`, `.ember-glow`, `.ember-glow-strong`, `.ink-stamp`, `.ink-line`, `.ember-line`, `.font-display`, `.font-display-soft`, `.font-mono-tag`.
   - Remove dropped keyframes: `ember-pulse`, `float-slow`, `shimmer`, `reveal-up`, `draw-line` + `.delay-*`.
   - **Keep:** `.perspective-1000`, `.preserve-3d`, `.backface-hidden`, `.rotate-y-180`, `.text-balance`, `.text-pretty`, `::selection` (update to neutral), `@custom-variant dark`.

5. **Remove `tw-animate-css`** from `package.json` if no longer imported.

6. **Remove Fraunces font** from `lib/fonts.ts` — delete `fontSerif`. Remove `fontSerif.variable` from `app/layout.tsx`. Keep `Geist` (`--font-sans`). Optionally keep or drop `JetBrains Mono` — garn uses platform mono, so drop it and remove `fontMono` from `lib/fonts.ts` + `app/layout.tsx`.

7. **Remove old layout files** — delete `components/layout/app-header.tsx`, `dashboard-chrome.tsx`, `admin-chrome.tsx`, `mobile-nav.tsx`, `mobile-user-footer.tsx`, `mobile-user-footer-with-admin.tsx`, `admin-mobile-nav.tsx`, `admin-mobile-footer.tsx`, `mobile-auth-footer.tsx`, `header-actions.tsx`, `wordmark.tsx` (replaced in Phase 1). Keep `user-menu.tsx` if still used (migrated to garn).

8. **Remove old theme files** — `lib/theme.ts`, `lib/theme/server.ts`, `components/theme/theme-init-script.tsx`, `components/theme/theme-sync.tsx`, `components/theme/theme-quick-toggle.tsx` — **keep these**. The theme toggle system (cookie + classList) is runtime-agnostic and works with garn's dark mode. Only the visual styling of the toggle button changes (already done in Phase 1).

9. **Update `app/layout.tsx`** — remove `className="grain"` from `<body>`. Remove `fontSerif.variable` and `fontMono.variable` from `<html>`.

10. **Verify** — run full checks:
    ```bash
    pnpm lint
    pnpm build
    pnpm test
    ```

11. **Visual QA** — manually walk every route:
    - `/` (landing)
    - `/login`, `/register`
    - `/dashboard`, `/decks`, `/decks/[id]`, `/collections`, `/collections/[id]`
    - `/history`, `/profile`, `/notifications`
    - `/study`, `/study/[sessionId]`
    - `/explore`, `/explore/decks/[id]`, `/explore/decks/[id]/study`, `/explore/collections/[id]`
    - `/admin` + all admin sub-pages
    - Toggle dark mode on each.
    - Test mobile viewport (AppShell compact tier).
    - Test the flip card in study + landing preview.

**Deliverable:** Clean codebase, no old primitives, no Base UI, neutral theme only.

---

## Risk Areas

### High risk

1. **Base UI `render` prop → Radix `asChild`** — pervasive pattern. Every `DialogTrigger render={<Button/>}`, `DropdownMenuTrigger render={<Button/>}`, `SelectTrigger render={<Button/>}` needs rewriting. Missing one causes a runtime error (duplicate DOM nodes). Search: `rg "render=" --type tsx components/ app/`.

2. **`badge.tsx` `useRender` / `mergeProps`** — Base UI's polymorphic APIs have no garn equivalent. The custom `highlight` variant (ember) is dropped in the neutral reset. All `Badge` call sites need variant review.

3. **`tabs.tsx` `data-active` → `data-[state=active]`** — Base UI Tabs uses `data-active`; Radix Tabs uses `data-[state=active]`. Any component styling keyed on `data-active` breaks silently (no error, just missing styles). Used in: explore page, history sort toggle.

4. **AppShell adoption** — changes the layout for every authed page at once. If a page assumes `max-w-6xl` centered content, it may look different inside AppShell's content panel. Test all pages after Phase 1.

5. **`decks/[id]/page.tsx` (672 lines)** — inline page with `document.getElementById` form reading. Must be extracted + fixed before or during migration. High risk of regressions if rushed.

### Medium risk

6. **Two theme systems coexisting** — during the gradual migration, old pages use warm tokens, new pages use neutral garn tokens. The visual mismatch is expected but jarring if a user navigates between migrated and unmigrated pages. Consider migrating the layout chrome (Phase 1) first so at least the shell is consistent.

7. **`tw-animate-css` vs garn animations** — garn components may bring their own animation utilities. If both systems define `data-open:animate-in` etc., there could be conflicts. Check garn's base files during Phase 0.

8. **Clerk components** — `<SignIn>` / `<SignUp>` render their own UI. Only `clerkAppearance` variables transfer. The neutral reset means Clerk components will use their default styling (or whatever you set in `clerkAppearance`). Test auth flows.

9. **`font-mono-tag` (~95 usages)** — the most pervasive custom utility. Every metadata chip, eyebrow, kbd hint uses it. A search-and-replace is needed but must be done carefully (some usages may need different replacements depending on context).

10. **Admin HTML tables** — 3 admin views use raw `<table>` elements with custom styling. Migrating to garn `Table` primitives requires restyling each. The `contain:layout` grid fix may need re-evaluation.

### Low risk

11. **framer-motion** — no conflict with garn-ui. The flip card, study card swap, and landing animations all work unchanged. Only token references (`text-ember` → `text-brand-solid`) need updating in motion components.

12. **Zustand stores** — `useThemeStore`, `useStudyStore`, `useOnboardingStore` are runtime-agnostic. No changes needed.

13. **TanStack Query** — server state, no UI coupling. No changes needed.

14. **Drizzle / API routes** — no UI. No changes needed.

---

## Garn MCP Usage During Migration

The garn MCP server (wired in Phase 0) provides structured component knowledge. Use it throughout:

- **`garn_search`** — find the right component for a pattern (e.g. "right-aligned actions in header" → `AppShellHeader`).
- **`garn_view`** — read the full anatomy, props, and accessibility contract of a component before using it.
- **`garn_get_examples`** — pull live code examples for composition patterns (e.g. master-detail, command palette).
- **`garn_audit`** — check your composition after writing it (catches missing labels, broken keyboard models, slot misuse).

No MCP? Fetch `https://garn.ohuba.com/llms-full.txt` for the full corpus.

---

## Phase Summary

| Phase | Scope | Risk | Est. effort |
|-------|-------|------|-------------|
| 0 | Foundation setup | Low | Small |
| 1 | AppShell layout (authed) | High | Medium |
| 2 | Landing page | Medium | Medium |
| 3 | Auth pages | Low | Small |
| 4 | Dashboard | Low | Small |
| 5 | Decks | High | Large |
| 6 | Collections | Medium | Large |
| 7 | Study session | Medium | Medium |
| 8 | History, Profile, Notifications, Explore | Medium | Medium |
| 9 | Admin | Medium | Medium |
| 10 | Error/loading pages | Low | Small |
| 11 | Cleanup | Medium | Small |

Each phase is independently shippable. The app remains functional throughout — old and new components coexist until Phase 11.