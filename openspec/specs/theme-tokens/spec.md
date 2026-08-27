# theme-tokens — Locked Spec

> Status: **locked** (promoted from `portfolio-frontend-v1` delta, archived 2026-08-27).
> Capability: `theme-tokens`.
> Source of truth: `openspec/changes/portfolio-frontend-v1/proposal.md` (corrected) §Approach "Theme override, not a re-skin of shadcn" + the Aurelian design system at `assets/design/aurelian_grid_v2/DESIGN.md`.
> Consumed locked specs: none directly. The shadcn primitives in `app/components/ui/*` consume the CSS variables this spec declares (no spec change to those primitives).
> Cross-references: Aurelian palette at `assets/design/aurelian_grid_v2/DESIGN.md` (read-only source of truth for hex values); `app/app.css` (the file modified by this delta).

## Purpose

The current `app/app.css` declares a light shadcn `base-sera` / `taupe` palette via `oklch(...)` and the four `--rndr-*` shorthand tokens (`--rndr-primary`, `--rndr-secondary`, `--rndr-tertiary`, `--rndr-neutral`). The Aurelian Grid v2 design system that the six mockups in `assets/design/*/` are built against is a dark obsidian palette. A single `components.json` cannot serve both. This delta overrides the shadcn `:root` with the Aurelian values, retires the `--rndr-*` shorthand, drops the `@fontsource-variable/noto-sans` import, keeps `@fontsource/hanken-grotesk` as `--font-sans`, and KEEPS `@fontsource-variable/playfair-display` as a NEW `--font-display` Tailwind token (opt-in editorial accent for hero headlines, editorial pull-quotes, brand micro-labels). The shadcn primitive recipes are not touched; they read from the CSS variables and pick the new palette up automatically.

## Requirements

### REQ-THEME-1: Override `:root` shadcn tokens to Aurelian obsidian

The system SHALL override every shadcn semantic token declared in `app/app.css` `:root` to the Aurelian obsidian hex values listed in `assets/design/aurelian_grid_v2/DESIGN.md`, replacing the `oklch(…)` `base-sera` light values. The override MUST cover at minimum `--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--destructive`, `--border`, `--input`, `--ring`, plus the `--sidebar-*` family and the `--chart-*` family.

#### Scenario: Aurelian background is obsidian

- GIVEN `app/app.css` is rebuilt
- WHEN the browser computes `body { background: var(--background); }`
- THEN the rendered page background is `#131314` (Aurelian obsidian), NOT `oklch(1 0 0)` (shadcn white)

#### Scenario: Primary CTA renders in Aurelian Gold

- GIVEN a `Button` with `variant="default"` (which applies `bg-primary text-primary-foreground`)
- WHEN the page renders
- THEN the button background is `#f2ca50` (Aurelian Gold) AND the text color is `#3c2f00` (Aurelian `on-primary`)

#### Scenario: Card surface uses surface-container-low

- GIVEN a `BentoCell` atom (added by the `home-domain` and `works-domain` specs) with `class="bg-card"`
- WHEN the page renders
- THEN the cell background is `#1c1b1c` (Aurelian `surface-container-low`), contrasting against the `#131314` page background

### REQ-THEME-2: Retire the four `--rndr-*` shorthand tokens

The system SHALL remove the four `--rndr-*` shorthand declarations (`--rndr-primary`, `--rndr-secondary`, `--rndr-tertiary`, `--rndr-neutral`) from `app/app.css` and SHALL remove the four corresponding `--color-rndr-*` Tailwind theme entries. Every existing usage of `bg-rndr-*` and `text-rndr-*` classes SHALL be migrated to the semantic shadcn equivalents: `bg-rndr-primary` → `text-primary` (per-component per the design), `bg-rndr-secondary` → `text-secondary`, `bg-rndr-tertiary` → `bg-card` or `bg-muted` (per context), `bg-rndr-neutral` → `bg-background`.

#### Scenario: No `--rndr-*` declarations survive

- GIVEN the theme override is applied
- WHEN `app/app.css` is searched for `--rndr-`
- THEN no matches exist in the `:root` block AND no matches exist in the `@theme inline` block

#### Scenario: Existing call sites compile

- GIVEN the three existing files that reference `rndr-*` classes (`Navbar.tsx`, `NeuronCard.tsx`, `_public._index.tsx`) are migrated in the P0 apply slice
- WHEN `bun run typecheck` runs AND `bun run build` runs
- THEN no class-not-found errors AND no `var(--rndr-*)` references remain

### REQ-THEME-3: Drop `@fontsource-variable/noto-sans` import

The system SHALL remove the `@import "@fontsource-variable/noto-sans";` line from `app/app.css`. No existing component references Noto Sans explicitly (per proposal §Risks R-font), so the removal MUST NOT change any rendered glyph on any current page.

#### Scenario: Noto Sans import is gone

- GIVEN `app/app.css` is updated
- WHEN the file is searched for `noto-sans`
- THEN no match exists

#### Scenario: No regression on Hanken Grotesk pages

- GIVEN the home route renders `Hanken Grotesk` text
- WHEN the page is loaded
- THEN the rendered glyphs are still Hanken Grotesk (no fallback to system sans because the Noto Sans removal)

### REQ-THEME-4: Keep Hanken Grotesk as the default `--font-sans`

The system SHALL keep the `@import "@fontsource/hanken-grotesk";` import AND SHALL keep `--font-sans: "Hanken Grotesk", sans-serif;` in the `@theme inline` block. The body SHALL continue to use `font-sans` (per the existing `@apply font-sans` on `html` in `app.css:113`).

#### Scenario: Body text is Hanken Grotesk by default

- GIVEN any page renders
- WHEN the browser computes `html { font-family: var(--font-sans); }`
- THEN the rendered family is `Hanken Grotesk, sans-serif`

### REQ-THEME-5: Keep Playfair Display as opt-in `--font-display`

The system SHALL keep the `@import "@fontsource-variable/playfair-display";` import AND SHALL add a new `--font-display: "Playfair Display Variable", serif;` declaration in the `@theme inline` block. The new token MUST be opt-in per component: only hero headlines, editorial pull-quotes, and brand micro-labels use `font-display`; body copy stays on `font-sans`.

#### Scenario: Default body copy is NOT Playfair

- GIVEN a paragraph in the home body
- WHEN the page renders without an explicit `font-display` class
- THEN the family is `Hanken Grotesk, sans-serif` (NOT Playfair)

#### Scenario: A hero with `font-display` renders Playfair

- GIVEN the home hero `<h1>` carries the `font-display` Tailwind utility
- WHEN the page renders
- THEN the h1 family is `Playfair Display Variable, serif`

#### Scenario: Playfair token is available as a Tailwind utility

- GIVEN the `@theme inline` block declares `--font-display`
- WHEN a developer writes `className="font-display"`
- THEN Tailwind compiles the class to `font-family: var(--font-display)`

### REQ-THEME-6: Surface tier tokens (M3 stack)

The system SHALL add CSS custom properties (and matching `--color-*` Tailwind entries) for the M3 surface tier stack: `--surface-container-lowest` (`#0e0e0f`), `--surface-container-low` (`#1c1b1c`), `--surface-container` (`#201f20`), `--surface-container-high` (`#2a2a2b`), `--surface-container-highest` (`#353436`), `--outline` (`#99907c`), `--outline-variant` (`#4d4635`), and `--on-surface` (`#e5e2e3`). These MUST be available as `bg-surface-container-low` etc. Tailwind utilities.

#### Scenario: BentoCell can target surface tiers

- GIVEN a bento cell needs a hover state brighter than its rest state
- WHEN the developer writes `className="bg-surface-container-low hover:bg-surface-container-high"`
- THEN the rest background is `#1c1b1c` AND the hover background is `#2a2a2b`

### REQ-THEME-7: Brand micro-label color token

The system SHALL add a `--brand-micro-label: #d0c5af` (`on-surface-variant`) token and map it to a `text-brand-micro-label` Tailwind utility so the brand-flourish micro-labels (`[ Precision Metrics ]`, `[ Client Voices ]`, etc.) have a single canonical color reference.

#### Scenario: Micro-labels render in the canonical color

- GIVEN a `<MicroLabel>` atom renders the string `[ Precision Metrics ]`
- WHEN the page renders
- THEN the label color is `#d0c5af` AND the rest of the body text is `#e5e2e3` (different shade, brand-flourish reads as a separate layer)

### REQ-THEME-8: Grain overlay (5% opacity, fixed full-screen)

The system SHALL provide a `GrainOverlay` atom (at `app/shared/ui/atoms/grain-overlay.tsx`) that renders a fixed full-screen `<div>` at `z-[100]` with `opacity-[0.05]` and a noise background image (`bg-[url(…)]`). The atom MUST be mounted once per public and admin page (in `_public.tsx` and `admin.tsx` layouts), MUST be `pointer-events-none`, and MUST NOT block clicks. The asset URL MAY be the `grainy-gradients.vercel.app/noise.svg` URL the mockups use, or a local copy; the design MUST pick one source.

#### Scenario: Grain renders at 5% opacity on every page

- GIVEN the user navigates from `/` to `/works` to `/contact`
- WHEN each page paints
- THEN a fixed full-screen noise overlay is visible at 5% opacity AND clicks pass through it (no element above it is blocked)

### REQ-THEME-9: Single theme; no light/dark toggle

The system SHALL NOT introduce a dark/light theme toggle. The single Aurelian obsidian theme is the only theme. The `prefers-color-scheme: dark` media query in the existing `app.css:10-12` SHALL remain (the page is always dark; the media query is a no-op but kept for browser-level `color-scheme` consistency on form controls and scrollbars).

#### Scenario: No theme switcher exists

- GIVEN a user inspects every public and admin page
- WHEN they look for a theme switcher in the header
- THEN no switcher renders AND the page is always Aurelian obsidian regardless of OS-level dark/light preference

### REQ-THEME-10: No `var(--*)` in className

Per `tailwind-4` skill and the project anti-pattern list in `AGENTS.md`, no component SHALL write `className="bg-[var(--rndr-primary)]"` or any `var(--*)` in className. The `rndr-*` shorthand is removed; components reference semantic tokens (`text-primary`, `bg-card`, `text-brand-micro-label`).

#### Scenario: Linter/grep finds no `var()` in className

- GIVEN `bun run typecheck` and `bun run build` pass
- WHEN the `app/` tree is searched for the pattern `className=.*var\(--`
- THEN no match exists

## Cross-references

- **Aurelian design system** (read-only): `assets/design/aurelian_grid_v2/DESIGN.md` — the source of truth for every hex value this delta encodes.
- **Locked frontend** (consumed, not modified): `openspec/specs/http-client/spec.md`, `openspec/specs/admin-auth/spec.md`.
- **Mockups** (read-only): `assets/design/*/{code.html,screen.png}` — visual diff targets for the verify phase.
- **Proposal**: `openspec/changes/portfolio-frontend-v1/proposal.md` §Capabilities "theme-tokens" + §Approach "Theme override, not a re-skin of shadcn" + §Success criteria.

## Out of scope

- **A light/dark toggle.** Single Aurelian obsidian theme. Adding a switcher is a future SDD change.
- **A second `components.json`.** AGENTS.md "One shadcn style, one base color" is non-negotiable.
- **Editing shadcn primitive recipes** in `app/components/ui/*`. The recipes stay; only the CSS variables they consume change.
- **Material Symbols icon font.** The icons in the mockups map to `lucide-react` per Q-15 (already in `components.json`); the per-icon migration is a P0 task, not a theme task.
- **Custom Tailwind `theme.spacing` extension** for the `gutter: 24px`, `bento-gap: 16px`, `margin: 40px`, `container-max: 1280px` units. Per the proposal, the design maps these in; whether they become Tailwind utilities or arbitrary values (`p-[24px]`, `gap-[16px]`) is a design-phase call.
