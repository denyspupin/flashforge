# Using garn — rules for AI tools

garn is a Radix + Tailwind v4 design system copied into this project as source you own. When you build or edit UI with garn here, follow these rules. (garn `0.4.2`.)

## 1. Discover before you write — don't invent APIs
- **Query the garn MCP for component knowledge** — a component's purpose, variant axes, parts/slots, a11y contracts, do/don't, recipes, and gotchas. It is a separate install (not copied into this repo): run `npx garn-mcp` and register it in your AI client, then use `garn_search` · `garn_view` · `garn_get_examples` · `garn_match_recipe` · `garn_relations` · `garn_audit`.
- No MCP configured? Read the hosted reference instead — the garn site's `/llms-full.txt` (full component corpus) or `/llms.txt` (index).
- Either way, the **props/types ground truth is the copied source in `components/ui/`** — don't guess a component's props or slots from its name.
- Need a component from the roster that isn't in `components/ui/` yet? Add it with `npx garn-ui add <id>` (run `npx garn-ui list` to see what exists) **before** importing it — don't hand-write the source.

## 2. Semantic tokens, never raw values
- Style only through garn's semantic Tailwind classes (`bg-brand-solid`, `text-muted-foreground`, `border-input`, …) or `--garn-*` tokens.
- Never hardcode a hex/`rgb`/`hsl`/`oklch` color or a `px`/`rem` length. Sizing comes from a component's `size` variant, not hand-padding.

## 3. Accessibility is non-negotiable
- garn ships machine-checkable a11y contracts (accessible names, control labels, dialog titles, keyboard model) — not every component has one. Honor each component's keyboard model and ARIA wiring; don't strip focus rings.

## 4. Compose via documented slots
- Use a component's published slots / subcomponents. Don't reach past the public API or restyle internals.

## Component roster

The components garn ships, grouped by category. For any component's purpose, props, examples, and a11y contracts, query the garn MCP (`npx garn-mcp`) or read the hosted reference.

- **actions** — `button`, `button-group`, `toggle`, `toggle-group`, `toolbar`
- **data-display** — `activity-grid`, `avatar`, `badge`, `bar-list`, `board`, `bullet`, `carousel`, `chart`, `collection-view`, `counter`, `data-list`, `data-toolbar`, `gallery`, `gantt`, `gauge`, `heatmap`, `kbd`, `list`, `sortable`, `sparkline`, `stat`, `table`, `tag`, `timeline`, `tracker`, `tree`
- **disclosure** — `accordion`, `collapsible`
- **feedback** — `alert`, `empty`, `progress`, `skeleton`, `sonner`, `spinner`
- **forms** — `badge-select`, `calendar`, `checkbox`, `combobox`, `date-picker`, `date-time-picker`, `field`, `file-upload`, `filters`, `form`, `inline-edit`, `input`, `input-otp`, `label`, `multi-select`, `number-field`, `radio-group`, `rating`, `select`, `slider`, `switch`, `textarea`, `time-field`, `time-picker`
- **layout** — `app-shell`, `aspect-ratio`, `card`, `resizable`, `scheduler`, `scroll-area`, `separator`
- **navigation** — `breadcrumb`, `menubar`, `navigation-menu`, `pagination`, `stepper`, `tabs`
- **overlay** — `alert-dialog`, `command`, `context-menu`, `dialog`, `drawer`, `dropdown-menu`, `hover-card`, `popover`, `sheet`, `tooltip`

_86 components._
