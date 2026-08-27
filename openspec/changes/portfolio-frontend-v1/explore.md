# Explore — `portfolio-frontend-v1`

> A read-only reconnaissance of the v1 frontend. The change implements the
> full UI defined in `assets/design/aurelian_grid_v2/` and the 6
> mockups under `assets/design/*` against the screaming-architecture
> skeleton in `app/`. Public surface is i18n'd in `en` (default) and
> `es` (prefixed); admin is English-only per locked decision D8.

## Table of contents

- [TL;DR](#tldr)
- [Scope](#scope)
- [Design system audit](#design-system-audit)
- [Per-screen inventory](#per-screen-inventory)
  - [1. `home_juliam_aponte_portfolio` — desktop public home](#1-home_juliam_aponte_portfolio--desktop-public-home)
  - [2. `home_mobile_juliam_aponte` — mobile public home](#2-home_mobile_juliam_aponte--mobile-public-home)
  - [3. `project_catalog` — desktop public works](#3-project_catalog--desktop-public-works)
  - [4. `project_catalog_mobile` — mobile public works](#4-project_catalog_mobile--mobile-public-works)
  - [5. `admin_console` — desktop admin](#5-admin_console--desktop-admin)
  - [6. `admin_console_mobile` — mobile admin](#6-admin_console_mobile--mobile-admin)
- [Component library plan](#component-library-plan)
- [i18n namespace plan](#i18n-namespace-plan)
- [Routes plan](#routes-plan)
- [State & data hooks](#state--data-hooks)
- [Open questions for the proposal](#open-questions-for-the-proposal)
- [Risks & dependencies](#risks--dependencies)
- [Ready for proposal](#ready-for-proposal)
- [Appendix A — change discovery index](#appendix-a--change-discovery-index)
- [Appendix B — out-of-scope reminder](#appendix-b--out-of-scope-reminder)

---

## TL;DR

| Item | Decision |
| --- | --- |
| In scope | All 6 mockups (public + admin), Aurelian Grid v2 theme re-token, full i18n (en/es + admin en), full auth-fetch-client plumbing, all atomic-design layers under `app/{home,works,contact,admin,shared}/` |
| Out of scope | Backend code, devops/CI, analytics, new locales, test runner wiring, theme toggle, new state libraries |
| Theme conflict | Aurelian obsidian palette vs shadcn `base-sera` (light) — **resolve by overriding shadcn's `--background/--foreground/--card/--popover/--primary/...` to the Aurelian values in `app/app.css`; keep the shadcn primitive names so `Button`/`Input`/`Field` continue to work** |
| Font | Drop Noto Sans + Playfair Display, keep only Hanken Grotesk (already imported); add the `Hanken Grotesk` 400/500/600 weights used in the design |
| Icon set | The mockups use Material Symbols Outlined; the project ships `lucide-react: ^1.28.0`. **Confirm icon set with the user (see open question Q-15)** |
| Brand text | "Juliam Aponte" (image alt, design folder) vs "Julia Aponte" (header text). **Confirm canonical spelling (Q-8)** |
| i18n | Currently `i18next` is a dep but the `_public.tsx` loader only sets `data-lang`. This change wires `i18next` + `react-i18next` and creates `useLocaleStore` |
| Admin gate | Already wired by archived `auth-fetch-client` change. This change fills the empty route bodies |
| 400-line budget | **Definitively over.** This is multi-PR work; `sdd-tasks` must forecast a chained PR split |

---

## Scope

### In

- **Public surface** (i18n'd `en` + `es`): `app/home/`, `app/works/`, `app/contact/`.
  - Routes: `/`, `/works`, `/works/:slug`, `/contact` (and `/es/...` mirrors).
- **Admin surface** (English only, locked decision D8): `app/admin/{auth,projects,reviews,contact}/`.
  - Routes: `/admin/auth`, `/admin/auth/logout`, `/admin`, `/admin/projects`, `/admin/projects/new`, `/admin/projects/:id`, `/admin/reviews`, `/admin/reviews/:id`, `/admin/contact`, `/admin/contact/:id`.
- **Cross-cutting shared modules**: `app/shared/{i18n,stores,swr,lib,animation}/`.
  - `useLocaleStore`, `useUIStore`, `useToastStore` (DESIGN.md §4 — currently absent; this change builds them).
  - i18next bootstrap (currently a `// TODO when wiring react-i18next` in `_public.tsx:9`).
  - Animation presets for `motion` + `animejs` (both already in `package.json` but unwired).
- **Design system re-skin** to Aurelian Grid v2 (see [Design system audit](#design-system-audit)).
- **Font load** (Hanken Grotesk 400/500/600 — already in `@fontsource/hanken-grotesk`; Noto Sans + Playfair Display to be removed).
- **i18n namespaces** (`common`, `home`, `works`, `contact`, `admin`) with full `en` and `es` translations.
- **All atomic-design layers** under each public/admin subdomain (`atoms/`, `molecules/`, `organisms/`, `templates/`, `pages/`).
- **All scaffolds in `app/routes/*.tsx`** get real implementations (currently all 19 routes are TODOs).
- **Pre-render target** decision per public route (per `DESIGN.md` §3, "should be pre-rendered; the decision is per route"). The proposal will set the default.

### Out

- Backend (`../roonder-portfolio-backend`): already has its own `openspec/` and is the source of truth for the contract. We **read but do not modify** backend code.
- DevOps / CI / deploy (Vercel ISR, Docker, etc.).
- Analytics (Plausible, PostHog, GA — none in `package.json`).
- A test runner (Vitest, Playwright) — see `openspec/specs/testing-capabilities.md`; **the typecheck-only gate remains**. Adding a runner is its own SDD change.
- A dark/light theme toggle or any second theme.
- A fourth state library (no Redux, no Jotai, no MobX).
- A new locale beyond `en` + `es`.
- Server Actions beyond login (already done) + logout (already done). Writes from `/contact` and `/admin/*` go through React Router `action`s — no new Server Actions.
- tRPC / GraphQL / a different router.
- styled-components / emotion / vanilla-extract.

---

## Design system audit

Source: `assets/design/aurelian_grid_v2/DESIGN.md` and the `code.html` of every
mockup (which encodes the same tokens into a Tailwind 3 config).

### Tokens the frontend must encode in `app/app.css`

The current `app/app.css` (lines 16–54) declares a **light** shadcn `base-sera` /
`taupe` palette via `oklch(...)` values. The Aurelian mockups declare a **dark
obsidian** palette via hex values. The two MUST be reconciled — the recommended
resolution is below.

#### Colors (override `:root` shadcn tokens to Aurelian)

| Token (use in `className` as `bg-{token}` etc.) | Current `app.css` | Aurelian value | Where it shows up |
| --- | --- | --- | --- |
| `--background` | `oklch(1 0 0)` (white) | `#131314` (obsidian) | Page bg |
| `--foreground` | `oklch(0.147 0.004 49.3)` | `#e5e2e3` (off-white) | Body text |
| `--card` | `oklch(1 0 0)` | `#1c1b1c` (surface-container-low) | Card bg |
| `--card-foreground` | `oklch(0.147 0.004 49.3)` | `#e5e2e3` | Card text |
| `--popover` | `oklch(1 0 0)` | `#201f20` (surface-container) | Popover bg |
| `--popover-foreground` | `oklch(0.147 0.004 49.3)` | `#e5e2e3` | Popover text |
| `--primary` | `oklch(0.214 0.009 43.1)` | `#f2ca50` (Gold) | Primary CTA bg, active states |
| `--primary-foreground` | `oklch(0.986 0.002 67.8)` | `#3c2f00` (on-primary) | Text on primary |
| `--secondary` | `oklch(0.96 0.002 17.2)` | `#aecfaf` (Sage) | Secondary accents |
| `--secondary-foreground` | `oklch(0.214 0.009 43.1)` | `#1a3620` (on-secondary) | Text on secondary |
| `--muted` | `oklch(0.96 0.002 17.2)` | `#1a1a1b` (tertiary) | Muted bg |
| `--muted-foreground` | `oklch(0.547 0.021 43.1)` | `#d0c5af` (on-surface-variant) | Muted text |
| `--accent` | `oklch(0.96 0.002 17.2)` | `#2a2a2b` (surface-container-high) | Accent surfaces |
| `--accent-foreground` | `oklch(0.214 0.009 43.1)` | `#e5e2e3` | Accent text |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `#ffb4ab` (error) | Error bg |
| `--border` | `oklch(0.922 0.005 34.3)` | `#4d4635` (outline-variant) | Borders |
| `--input` | `oklch(0.922 0.005 34.3)` | `#1a1a1b` (tertiary) | Input bg |
| `--ring` | `oklch(0.714 0.014 41.2)` | `#e9c349` (surface-tint) | Focus ring |

> The `--rndr-*` custom variables already declared in `app/app.css:50-54`
> capture only four of the Aurelian tokens (`--rndr-primary: #d4af37`,
> `--rndr-secondary: #a2c3a4`, `--rndr-tertiary: #1a1a1b`,
> `--rndr-neutral: #0f0f10`). These are a starting point but are
> **incomplete** — every surface tier (`surface-container`,
> `surface-container-high`, `surface-container-highest`, `outline`,
> `outline-variant`, etc.) needs to be added.

#### Surfaces (Aurelian's M3-inspired stack)

```
surface-container-lowest   #0e0e0f  (deepest, footer/canvas)
surface-container-low       #1c1b1c
surface-container           #201f20
surface-container-high      #2a2a2b
surface-container-highest   #353436
surface-variant             #353436
on-surface                  #e5e2e3
on-surface-variant          #d0c5af
outline                     #99907c
outline-variant             #4d4635
```

#### Typography (Hanken Grotesk across all levels)

| Token | Use | Size | Weight | Line-height | Letter-spacing |
| --- | --- | --- | --- | --- | --- |
| `text-display` | Hero h1 (desktop) | 68px | 600 | 1.1 | -0.02em |
| `text-display-mobile` | Hero h1 (mobile) | 42px | 600 | 1.1 | – |
| `text-headline-lg` | Section h2 (desktop) | 42px | 500 | 1.2 | -0.01em |
| `text-headline-lg-mobile` | Section h2 (mobile) | 32px | 500 | 1.2 | – |
| `text-headline-md` | Card h3 | 26px | 500 | 1.3 | – |
| `text-body-lg` | Body | 16px | 400 | 1.6 | – |
| `text-body-sm` | Caption / meta | 14px | 400 | 1.6 | – |
| `text-label-caps` | Micro-labels, button labels, nav | 12px | 600 | 1 | 0.1em (uppercase) |

- **Font family**: `font-family: "Hanken Grotesk", sans-serif;` (already imported via `@fontsource/hanken-grotesk` at `app.css:6`).
- **Remove**: `@fontsource-variable/noto-sans` and `@fontsource-variable/playfair-display` (not used by the design).
- **No italic for headlines**: the design's "Digital Horizons" is the one italic exception (a brand flourish); keep it as a single `italic` Tailwind utility, not a token.

#### Spacing (8px linear scale, custom units per design)

- `unit: 8px` — base scale step.
- `gutter: 24px` — padding inside `max-w-container-max`, gutter between bento cells.
- `margin: 40px` — section vertical padding.
- `bento-gap: 16px` — gap between bento cells (used in `grid gap-bento-gap`).
- `container-max: 1280px` — `max-w-container-max`.
- Map these to Tailwind's `theme.spacing` extension so `p-gutter`, `gap-bento-gap`, etc. are valid utility classes.

#### Radii

- `rounded-sm: 0.25rem`, `DEFAULT: 0.5rem`, `md: 0.75rem`, `lg: 1rem` (4px increments).
- `xl: 1.5rem` (12px) — input fields, small tags.
- **2xl (1rem)** and **3xl (1.5rem)** for the bento cells (24px padding × 16–24px corner).
- Design's "16px (1rem) corner radius" for primary bento cells = `rounded-2xl`.
- Design's "8px (0.5rem) radius" for tags/inputs = `rounded-lg`.
- Design's "32px / 40px rounded bottoms" for hero/contact sections = arbitrary values `rounded-b-[40px]`, `rounded-[40px]`.

#### Depth (tonal layering, no heavy shadows)

- `bg-surface-container-lowest` — page canvas (`#0e0e0f`).
- `bg-surface-container-low` — bento cells (`#1c1b1c`).
- `bg-surface-container` — elevated cells (`#201f20`).
- `bg-surface-container-high` — interactive / hover (`#2a2a2b`).
- Hover state: `0.5px glass stroke` (white/10%) on top + left edge, plus optional 1px solid stroke in Sage or Gold.
- Heavy shadow: `shadow-[0_0_20px_rgba(212,175,55,0.3)]` (gold-tinted, 20px radius) for primary CTA hover.

#### Grain overlay (custom resource)

- A fixed full-screen `<div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.05] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />` on every page. The URL is hardcoded in the mockups; consider hosting the SVG locally to avoid a third-party dependency.

#### Custom resources

- `GrainOverlay` (atoms) — the 5% noise overlay.
- `GoldTintedGradient` (utility class) — for image overlays on works cards.

### Theme conflict resolution

**The conflict**: shadcn `base-sera` is a **light** theme (`oklch(1 0 0)` for
`--background`). The Aurelian mockups are **dark obsidian** (`#131314`). A
single `components.json` cannot serve both.

**Recommendation** (this is a recommendation, not a locked decision —
[see open question Q-1](#open-questions-for-the-proposal)):

1. **Keep the shadcn primitive recipes** (`Button`, `Input`, `Field`,
   `Label`, `Separator`) untouched in `app/components/ui/*` — they read
   from CSS custom properties, so they will pick up the new palette
   automatically.
2. **Override the `:root` shadcn tokens** in `app/app.css` to the
   Aurelian values listed above. This is a one-file change.
3. **Drop the `--rndr-*` shorthand** (`--rndr-primary`, `--rndr-secondary`,
   `--rndr-tertiary`, `--rndr-neutral`) and migrate the two existing
   usages (`Navbar.tsx:11,13` and `NeuronCard.tsx:10` and
   `_public._index.tsx:21-22`) to the semantic shadcn tokens (`text-primary`,
   `bg-background`, `text-muted-foreground`, etc.). Single source of truth.
4. **Re-token** the `field.tsx` `aria-invalid` colors and any
   `data-` selectors that reference the light palette.

> Per AGENTS.md §"One shadcn style, one base color" we cannot
> introduce a second `components.json`. The shadcn recipe stays; only
> the token layer changes.

### Other audit findings

- **`app/lib/utils.ts` vs `app/shared/lib/`**: `cn()` lives at
  `app/lib/utils.ts:1-6` but AGENTS.md and DESIGN.md say it should be at
  `app/shared/lib/cn.ts`. Existing imports use `~/lib/utils` (e.g.
  `button.tsx:4`, `field.tsx:4`, `login.tsx:32`). **Migration**:
  either move `cn` to `app/shared/lib/cn.ts` and update imports, or
  update the docs to point at `app/lib/utils.ts`. Recommend moving +
  updating imports (the screaming-architecture rule is `app/shared/`).
- **Font imports**: `app.css:4-6` imports `noto-sans`, `playfair-display`,
  and `hanken-grotesk`. Only the latter is used in the design. **Remove
  the first two**.
- **`@theme inline` block in `app.css:56-103`**: maps the shadcn
  custom properties to Tailwind theme tokens. After the re-token, this
  block stays the same shape (it consumes the `--*` variables, not the
  hex values).
- **Icon set mismatch**: the mockups use **Material Symbols Outlined**
  (loaded via Google Fonts CSS in each `code.html`); the project
  ships `lucide-react: ^1.28.0`. Material Symbols is a Google font
  with thousands of glyphs; `lucide-react` is a curated SVG set. Most
  Material Symbols used (`home`, `palette`, `send`, `dashboard`,
  `folder_managed`, `mail`, `logout`, `shield_person`, `add`, `search`,
  `more_vert`, `inbox`, `rate_review`, `arrow_forward`, `arrow_outward`,
  `ios_share`, `close`, `chevron_left`, `chevron_right`, `format_quote`,
  `alternate_email`, `public`, `work`, `mail`, `dns`, `data_object`,
  `add_photo_alternate`, `delete`, `light_mode`, `texture`, `schedule`,
  `grid_view`, `view_agenda`, `info`, `open_in_new`) have direct
  `lucide-react` equivalents. **Recommend `lucide-react` for size +
  consistency; a per-icon migration map is needed** (Q-15).
- **No animations in current code**: `animejs` and `motion` are in
  `package.json` but no `import` exists in the codebase. The mockups
  are static (no scroll-tied choreography yet). `sdd-design` will
  decide which library per use case (DESIGN.md §9).

---

## Per-screen inventory

For each mockup: route mapping, atomic-design decomposition, captured
copy (as i18n keys + English value, **never inline**), notable
components, state hooks, animation needs.

> **Translation key convention** (used below):
> `<namespace>.<area>.<semantic-key>`. Examples:
> `common.nav.home`, `home.hero.headline`, `works.card.viewAll`,
> `admin.sidebar.overview`. The `es` mirror is the same key with a
> translated value. No English values are inlined in components.

---

### 1. `home_juliam_aponte_portfolio` — desktop public home

**Source**: `assets/design/home_juliam_aponte_portfolio/{code.html,screen.png}`

**Route**: `/` (and `/es/`). Pre-render candidate (DESIGN.md §3, "should
be pre-rendered"). The proposal confirms.

**Atoms**: `BentoCell`, `MicroLabel`, `Avatar`, `ProfileImage`, `GrainOverlay`,
`IconButton`, `LocaleSwitcher`, `LanguagePill`, `StatNumber`,
`SectionHeading`.

**Molecules**: `PublicHeader` (logo, EN/ES switcher, Admin button,
avatar), `PublicFooter` (logo, social icons, copyright), `GoldGlowOrb`
(the two blurred radial gradients in the hero — `bg-primary/10` and
`bg-secondary/10`).

**Organisms**: `HomeHero`, `TechnicalStrategyBento` (3-card metrics
row), `SelectedWorksBento` (2-card image-overlay row), `TestimonialsSplit`
(review form + testimonials list side-by-side), `ContactCTA` (email-only
"Send Transmission" card), `HomePage` (composes all five + Header +
Footer).

**Captured copy** (namespace: `home`):

| Key | English value | Source line |
| --- | --- | --- |
| `common.brand.name` | `Julia Aponte` | `code.html:2` header (`<span class="...uppercase">Julia Aponte</span>`) — see Q-8 |
| `common.brand.altName` | `Juliam Aponte` | Image alt (`code.html:22`) — the alt text spelling. See Q-8 |
| `common.nav.home` | `Home` | `code.html:2` |
| `common.nav.works` | `Works` | `code.html:2` |
| `common.nav.contact` | `Contact` | `code.html:2` |
| `common.locale.en` | `EN` | `code.html:2` (language switcher) |
| `common.locale.es` | `ES` | `code.html:2` |
| `common.nav.admin` | `Admin` | `code.html:2` |
| `home.hero.microLabel` | `Atmósfera Dinámica` | `code.html:11` (the design has a Spanish micro-label on the English version — keep as one string; the `es` translation can differ) |
| `home.hero.headline` | `Architecting Digital Horizons` | `code.html:12-15` (h1 — split: "Architecting" + italic "Digital Horizons") |
| `home.hero.subhead` | `Crafting bespoke digital experiences through surgical precision and immersive structural design.` | `code.html:16` |
| `home.metrics.heading` | `Technical Strategy` | `code.html:32` |
| `home.metrics.precisionBadge` | `[ Precision Metrics ]` | `code.html:33` |
| `home.metrics.card1.label` | `Identified Bottlenecks` | `code.html:39` |
| `home.metrics.card1.value` | `124` | `code.html:41` (number — may come from API) |
| `home.metrics.card1.detail` | `Resolved critical infrastructure chokepoints.` | `code.html:42` |
| `home.metrics.card2.label` | `Strategic Attacks` | `code.html:48` |
| `home.metrics.card2.value` | `48` | `code.html:50` |
| `home.metrics.card2.detail` | `Targeted optimizations across core platforms.` | `code.html:51` |
| `home.metrics.card3.label` | `Technological Implementations` | `code.html:57` |
| `home.metrics.card3.value` | `92` | `code.html:59` |
| `home.metrics.card3.detail` | `New systems integrated for peak performance.` | `code.html:60` |
| `home.selectedWorks.heading` | `Selected Works` | `code.html:69` |
| `home.selectedWorks.viewArchive` | `View Archive →` | `code.html:70` |
| `home.selectedWorks.card1.tag` | `Fintech Interface` | `code.html:77` |
| `home.selectedWorks.card1.title` | `Aura Capital` | `code.html:78` |
| `home.selectedWorks.card2.tag` | `Web3 Platform` | `code.html:85` |
| `home.selectedWorks.card2.title` | `Nexus Protocol` | `code.html:86` |
| `home.reviews.form.heading` | `Leave a Review` | `code.html:96` |
| `home.reviews.form.subhead` | `Share your experience collaborating with us.` | `code.html:97` |
| `home.reviews.form.namePlaceholder` | `Name` | `code.html:99` |
| `home.reviews.form.companyPlaceholder` | `Company` | `code.html:100` |
| `home.reviews.form.feedbackPlaceholder` | `Your feedback...` | `code.html:101` |
| `home.reviews.form.submit` | `Submit Review` | `code.html:103` |
| `home.reviews.list.microLabel` | `[ Client Voices ]` | `code.html:109` |
| `home.reviews.list.item1.body` | `"The attention to detail and structural precision completely transformed our digital presence. An absolute masterclass in restraint and impact."` | `code.html:113` |
| `home.reviews.list.item1.author` | `Elena Rostova` | `code.html:119` |
| `home.reviews.list.item1.role` | `CEO, Aura Capital` | `code.html:120` |
| `home.reviews.list.item2.body` | `"Unmatched aesthetic intuition. The interface feels alive yet flawlessly minimal. Exactly what our brand needed."` | `code.html:126` |
| `home.reviews.list.item2.author` | `Marcus Vance` | `code.html:133` |
| `home.reviews.list.item2.role` | `Director, Nexus` | `code.html:134` |
| `home.contact.heading` | `Initiate Contact` | `code.html:144` (icon + heading) |
| `home.contact.subhead` | `Open for select collaborations and strategic advisory roles.` | `code.html:145` |
| `home.contact.emailPlaceholder` | `Email Address` | `code.html:147` |
| `home.contact.submit` | `Send Transmission` | `code.html:149` |
| `common.footer.tagline` | `Curating digital experiences with surgical precision.` | `code.html:154` (footer) |
| `common.footer.copyright` | `© 2024 Julia Aponte. All rights reserved.` | `code.html:154` (year likely comes from a build-time constant; lock this as `{{year}}` template) |

**Notable components**:
- **Header with floating glass nav**: `bg-surface/60 backdrop-blur-xl border-b border-outline-variant/10`, fixed-top, `h-20 max-w-container-max mx-auto`.
- **Language switcher pill**: `bg-surface-container-high rounded-full px-3 py-1 gap-3` with a `1px` divider.
- **Admin button** (in public header): outlined pill, `border border-primary/20 text-primary hover:bg-primary hover:text-on-primary`, with `shield_person` icon.
- **Hero**: 70vh min-height, two blurred radial gradients (Gold + Sage), profile image (round, 320×320 desktop, mix-blend-luminosity → normal on hover), bottom-aligned name pill (`bg-surface-container-high px-6 py-3 rounded-full shadow-xl`).
- **Metrics bento**: 3 equal columns, 240px min-height, top accent line revealed on hover (`bg-gradient-to-r from-{color} to-transparent`), large `text-display` number.
- **Selected works bento**: 2 equal columns, 400px min-height, image cover with 60% opacity, hover scales to 105% and brightens to 80%, gradient overlay from background, micro-label + h3 at bottom.
- **Reviews split**: two equal columns, form on left (`bg-surface-container-high`), list on right (`bg-surface-container` with `max-h-[400px] overflow-y-auto`).
- **Contact CTA**: centered `max-w-xl`, 40px rounded corners, mail icon, primary CTA button with gold-tinted hover shadow.

**State hooks**:
- **Loader** (`app/routes/_public._index.tsx`): `Promise.all` of `serverFetch` for `/api/v1/projects?featured=true` and `/api/v1/reviews?featured=true` (per `DESIGN.md` §5 public table). Also fetch `/api/v1/about` if a single-doc About endpoint exists (Q-4).
- **Form state** (review form on home): `useForm` + `zodResolver` per DESIGN.md §6. The submission is `fetcher.submit` to `/contact` action (or a new `/reviews` action — depends on backend, see Q-3).
- **Form state** (contact CTA): same pattern, `fetcher.submit` to `/contact`.
- **SWR**: `useSWR('/api/v1/projects?featured=true', swrFetcher)` for the bento cards (lets the cache update on write). `useSWR('/api/v1/reviews?featured=true', swrFetcher)` for the list.
- **Zustand**: `useLocaleStore` (active locale), `useToastStore` (post-submit success/error).
- **No session**: public surface does not read `useSessionStore`; the "Admin" header button is a plain `<a href="/admin/auth">` or `/admin` depending on session (Q-14).

**Animation**:
- Hero orb gradient: CSS keyframe `blur` (animejs could replace; not necessary).
- Card hover (bento top accent line, image scale 1.05): `transition-all duration-300` (CSS, no library needed).
- Submit button hover (`hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]`): CSS.
- Page-load reveal of bento cards: candidate for `motion`'s `<AnimatePresence>` + `whileInView` if design wants choreographed reveal (DESIGN.md §9 — `motion` for state-driven, animejs for timeline).

---

### 2. `home_mobile_juliam_aponte` — mobile public home

**Source**: `assets/design/home_mobile_juliam_aponte/{code.html,screen.png}`

**Route**: `/` (and `/es/`). Same path, responsive layout.

**Atoms**: As desktop + `BottomNavDock`, `Sparkline`, `ProgressBar`.

**Molecules**: `MobileHeader` (logo center, hamburger left, avatar right),
`BottomNavDock` (3-pill bottom nav: Home / Works / Reach Out — fixed,
`bg-surface/80 backdrop-blur-xl`).

**Organisms**:
- `MobileHomeHero`: profile image ring, `Technical Strategist` micro-label, `Juliam Aponte` h1, subhead, primary `Connect` button.
- `MobileMetricsStack`: two cards stacked (System Architecture 99.9% + sparkline; Performance Optimization 85% + progress bar).
- `MobileSelectedWorksCarousel`: horizontal snap scroll (`snap-x snap-mandatory`, `w-[85%]` cards), arrow-forward microbutton.
- `MobileReviewForm` (Leave a Note) + `MobileTestimonialsList` (stacked).
- `MobileContactCTA` (`Let's Build.` with email + textarea + Send Message).
- `MobileHomePage`: composes all + Header + BottomNavDock.

**Captured copy** (additions / differences from desktop; same namespace `home`):

| Key | English value | Source |
| --- | --- | --- |
| `home.hero.microLabelMobile` | `Technical Strategist` | `code.html:9` (the mobile micro-label differs from desktop's `Atmósfera Dinámica`) |
| `home.hero.headline` (mobile reuses) | `Juliam Aponte` | `code.html:10` (mobile uses display-mobile = 42px) |
| `home.hero.cta` | `Connect` | `code.html:14` |
| `home.metrics.card1.labelMobile` | `System Architecture` | `code.html:22` |
| `home.metrics.card1.valueMobile` | `99.9%` | `code.html:25` |
| `home.metrics.card1.detailMobile` | `Uptime Maintained` | `code.html:26` |
| `home.metrics.card2.labelMobile` | `Performance Optimization` | `code.html:38` |
| `home.metrics.card2.valueMobile` | `85%` | `code.html:43` |
| `home.metrics.card2.detailMobile` | `Average reduction in load times across flagship applications.` | `code.html:45` |
| `home.selectedWorks.headingMobile` | `Selected Works` | `code.html:51` |
| `home.selectedWorks.card1.tagMobile` | `FinTech` | `code.html:62` |
| `home.selectedWorks.card1.titleMobile` | `Quantum Ledger API` | `code.html:63` |
| `home.selectedWorks.card2.tagMobile` | `Infrastructure` | `code.html:72` |
| `home.selectedWorks.card2.titleMobile` | `Global CDN Routing` | `code.html:73` |
| `home.reviews.form.headingMobile` | `Leave a Note` | `code.html:83` |
| `home.reviews.form.subheadMobile` | `Worked together? I'd love to hear your thoughts.` | `code.html:84` |
| `home.reviews.form.namePlaceholderMobile` | `Your Name` | `code.html:87` |
| `home.reviews.form.submitMobile` | `Submit Feedback` | `code.html:93` |
| `home.reviews.list.item1.bodyMobile` | `"Juliam completely restructured our backend, cutting infrastructure costs by 40% while improving load times."` | `code.html:101` |
| `home.reviews.list.item1.authorMobile` | `Sarah Jenkins` | `code.html:105` |
| `home.reviews.list.item1.roleMobile` | `CTO, Nexus Corp` | `code.html:106` |
| `home.reviews.list.item2.bodyMobile` | `"A rare blend of high-level strategic thinking and hands-on technical execution."` | `code.html:112` |
| `home.reviews.list.item2.authorMobile` | `Marcus Chen` | `code.html:116` |
| `home.reviews.list.item2.roleMobile` | `Founder, Elevate AI` | `code.html:117` |
| `home.contact.headingMobile` | `Let's Build.` | `code.html:130` |
| `home.contact.subheadMobile` | `Available for consulting and strategic roles in Q4.` | `code.html:131` |
| `home.contact.bodyPlaceholder` | `Project details...` | `code.html:138` |
| `home.contact.submitMobile` | `Send Message` | `code.html:142` |
| `common.nav.home` (reused) | `Home` | `code.html:148` |
| `common.nav.works` (reused) | `Works` | `code.html:148` |
| `common.nav.contactMobile` | `Reach Out` | `code.html:148` |

**Notable components**:
- **Bottom nav dock**: fixed-bottom, `h-16 px-gutter flex items-center justify-around`, `bg-surface/80 backdrop-blur-xl`, 3 vertical-icon+label items.
- **Snap carousel**: `flex overflow-x-auto snap-x snap-mandatory gap-4`, cards `snap-center shrink-0 w-[85%]`.
- **Contact CTA card**: two blurred orbs at corners (`bg-primary/10`, `bg-secondary/10`), 32px corners, 1px `surface-variant` border that lights to `primary` on focus-within.
- **Sparkline SVG**: `<svg viewBox="0 0 100 20">` with a path using `Q...T...T...` — pure decorative.

**State hooks**: Same as desktop + a `useUIStore` slice for the mobile
hamburger menu (open/close) and the bottom-nav active route.

**Animation**:
- Snap scroll: native CSS, no library.
- The mobile mockup's `code.html` is mostly static (no scroll-tied reveal). `sdd-design` decides.

---

### 3. `project_catalog` — desktop public works

**Source**: `assets/design/project_catalog/{code.html,screen.png}`

**Route**: `/works` (and `/es/works`). Pre-render candidate (DESIGN.md §3).

**Atoms**: `BentoCell`, `MicroLabel`, `Tag`, `SearchInput`, `FilterChip`,
`PaginationButton`, `IconButton`, `NumberBadge`, `MetricTag`.

**Molecules**: `WorksHero` (Index heading + subhead + search + filter chips),
`ProjectCard` (4 variants — see below), `ProjectMeta` (category pill +
hours), `Drawer` (slide-in side panel), `DrawerHeader`, `DrawerFeatureGrid`,
`DrawerGallery`, `DrawerAction`, `Pagination`.

**Organisms**:
- `WorksPage`: composes Header + WorksHero + WorksGrid + Pagination + ProjectDrawer (hidden by default) + Footer.

**Captured copy** (namespace: `works`):

| Key | English value | Source |
| --- | --- | --- |
| `works.hero.heading` | `Index` | `code.html:19` (h1) |
| `works.hero.subhead` | `An exhaustive catalog of digital interventions, architectural experiments, and crafted interfaces.` | `code.html:20` |
| `works.hero.searchPlaceholder` | `Search catalog...` | `code.html:26` |
| `works.filter.all` | `All Works` | `code.html:30` |
| `works.filter.webDev` | `Web Dev` | `code.html:31` |
| `works.filter.uiUx` | `UI/UX` | `code.html:32` |
| `works.filter.architecture` | `Architecture` | `code.html:33` |
| `works.card.category.architecture` | `Architecture` | `code.html:47` |
| `works.card.category.webDev` | `Web Dev` | `code.html:66` |
| `works.card.category.uiUx` | `UI/UX` | `code.html:84` |
| `works.card.category.process` | `Process` | `code.html:111` |
| `works.card.featured.title` | `The Monolith Pavilion` | `code.html:51` |
| `works.card.featured.description` | `A conceptual exhibition space designed to challenge spatial perception through raw concrete forms and strategic natural light apertures.` | `code.html:52` |
| `works.card.featured.viewDetails` | `View Details` | `code.html:55` |
| `works.card.card2.title` | `Aether OS` | `code.html:73` |
| `works.card.card2.description` | `A web-based operating system interface exploring spatial navigation patterns and high-performance DOM rendering.` | `code.html:74` |
| `works.card.card3.title` | `Finmetrica App` | `code.html:97` |
| `works.card.card3.description` | `Redefining institutional financial dashboards through micro-interactions and rigorous typographic hierarchies.` | `code.html:98` |
| `works.card.card4.title` | `Cartographic Archives` | `code.html:116` |
| `works.card.card4.description` | `A digital preservation project mapping historical city infrastructure using interactive WebGL layers and archival photography.` | `code.html:117` |
| `works.card.card4.objective` | `Objective: 75% Complete` | `code.html:121` (75% may be data-driven) |
| `works.pagination.prev` | (icon `chevron_left`) | `code.html:128` — purely icon, no string needed |
| `works.pagination.next` | (icon `chevron_right`) | `code.html:137` |
| `works.drawer.title` | `Project Details` | `code.html:148` |
| `works.drawer.close` | (icon `close`) | `code.html:150` |
| `works.drawer.feature1.title` | `Light Mapping` | `code.html:171` |
| `works.drawer.feature1.body` | `Precise seasonal shadow tracking for optimal aperture placement.` | `code.html:172` |
| `works.drawer.feature2.title` | `Materiality` | `code.html:176` |
| `works.drawer.feature2.body` | `Board-formed concrete textures to emphasize monumental scale.` | `code.html:177` |
| `works.drawer.gallery.heading` | `Gallery` | `code.html:182` |
| `works.drawer.action.launch` | `Launch Live Experience` | `code.html:192` |

**Notable components**:
- **Hero with radial glow**: `radialGradient` SVG, `opacity-30`, 600px tall.
- **Project card variants** (all use the same `BentoCell` shell):
  1. **Featured (col-span-2)**: large image cover, gradient overlay, category + hours + title + description + "View Details" hover CTA. Height 480px.
  2. **Compact (col-1)**: image with `mix-blend-luminosity` that goes to `mix-blend-normal` on hover, category + hours + title + description. Height 480px.
  3. **Data-viz (col-1)**: SVG circle composition (no image), 75% complete progress bar, category + hours. Height 480px.
  4. **Split (col-span-2)**: image left (1/2), text right (1/2) with absolute "04" giant watermark, progress bar. Height 480px.
- **Pagination**: 1, 2, 3, …, 8 with prev/next chevrons. Active page is `bg-primary text-on-primary`.
- **Side drawer**: max-w-2xl right panel, `bg-surface`, slide-in from right with `cubic-bezier(0.16,1,0.3,1)` 500ms, backdrop `bg-surface-container-lowest/80 backdrop-blur-sm`, sticky header with `Project Details` micro-label.
- **Glass bevel**: 0.5px white/10% on top + left edges of every card (`mix-blend-overlay`).

**State hooks**:
- **Loader**: `serverFetch('/api/v1/works?page=1&limit=8')` for the first page. Pagination is server-side (Q-17).
- **Filters**: query-string-driven (`?category=...&q=...&page=...`). The form is a `<Form method="get">` (no JS needed; React Router reloads the loader).
- **Drawer state**: `useUIStore` slice for `drawerOpen: boolean` + `drawerSlug: string | null`. OR a route to `/works/:slug` (Q-6).
- **SWR**: `useSWR('/api/v1/works?page=...&category=...&q=...', swrFetcher)` for the list (revalidate on filter change).
- **Toast**: `useToastStore` for filter errors / search no-results.

**Animation**:
- Card hover lift: `hover:-translate-y-1 hover:shadow-xl` (CSS).
- Card image zoom on hover: `group-hover:scale-105` 700ms (CSS).
- Progress bar reveal: `scale-x-0 group-hover:scale-x-100` 500ms (CSS).
- Drawer open/close: `motion` is the right tool (state-driven layout animation, DESIGN.md §9). `<AnimatePresence>` with initial/animate/exit on the panel and backdrop.
- Featured card's "View Details" CTA: opacity-0 → 100% + translate-y-2 → 0 on hover (CSS).

---

### 4. `project_catalog_mobile` — mobile public works

**Source**: `assets/design/project_catalog_mobile/{code.html,screen.png}`

**Route**: `/works` (and `/es/works`). Same path, mobile layout.

**Atoms**: As desktop + `BottomNavDock` (reused from home mobile).

**Molecules**:
- `MobileWorksHeader` (logo center, hamburger left, avatar right).
- `MobileSearchAndFilters` (sticky under the header, `bg-surface/90 backdrop-blur-md`, search input + horizontal-snap filter chips).
- `MobileProjectCard` (full-bleed image, micro-label pill, title, description).
- `MobileProjectDrawer` (full-screen, slide-up from bottom, hero image, content card with rounded-top 32px, handle bar).
- `MobileWorksPage`: composes Header + SearchAndFilters + cards + BottomNavDock + Drawer (hidden).

**Captured copy** (additions to `works` namespace):

| Key | English value | Source |
| --- | --- | --- |
| `works.hero.searchPlaceholderMobile` | `Search projects...` | `code.html:8` |
| `works.filter.editorial` | `Editorial` | `code.html:13` |
| `works.filter.digitalExperience` | `Digital Experience` | `code.html:14` |
| `works.filter.brandIdentity` | `Brand Identity` | `code.html:15` |
| `works.filter.artDirection` | `Art Direction` | `code.html:16` |
| `works.card.card1.tag` | `Editorial / 2023` | `code.html:30` |
| `works.card.card1.title` | `L'Aura Magazine` | `code.html:34` |
| `works.card.card1.description` | `Complete art direction and editorial design for the inaugural issue, blending classic typography with brutalist grid systems.` | `code.html:35` |
| `works.card.card2.tag` | `Digital / 2024` | `code.html:45` |
| `works.card.card2.title` | `Nexus Platform` | `code.html:49` |
| `works.card.card2.description` | `A fluid, motion-driven web experience for a next-gen fintech product, focusing on micro-interactions and dark mode elegance.` | `code.html:50` |
| `works.card.card3.tag` | `Identity / 2023` | `code.html:60` |
| `works.card.card3.title` | `Atelier Stone` | `code.html:64` |
| `works.card.card3.description` | `Brand identity and packaging design for a sustainable luxury skincare line, utilizing tactile materials and muted earth tones.` | `code.html:65` |
| `works.drawer.close` | (icon `close`) | `code.html:87` |
| `works.drawer.share` | (icon `ios_share`) | `code.html:90` |
| `works.drawer.body` | `The inaugural issue of L'Aura required a visual language that felt both timeless and aggressively modern. We developed a bespoke typographic system and established an art direction guideline that favored high-contrast, moody photography paired with brutalist layouts.` | `code.html:109` |
| `works.drawer.stat.roleLabel` | `Role` | `code.html:114` |
| `works.drawer.stat.roleValue` | `Art Direction` | `code.html:115` |
| `works.drawer.stat.clientLabel` | `Client` | `code.html:118` |
| `works.drawer.stat.clientValue` | `L'Aura Media` | `code.html:119` |
| `works.drawer.action.viewLive` | `View Live Project` | `code.html:124` |

**Notable components**:
- **Sticky search + filter bar**: 64px header + 16px gap + 48px search bar + 40px filter chip row, all sticky.
- **Project card**: full-bleed image with `from-surface-container via-surface-container/20 to-transparent` gradient; micro-label `bg-surface/80 backdrop-blur-sm` pill at top-left; title + description at bottom.
- **Full-screen drawer**: `translate-y-full` → `translate-y-0` with `cubic-bezier(0.32,0.72,0,1)` 500ms; 50vh hero image; bottom card with `rounded-t-[32px]`, handle bar (`w-12 h-1 bg-surface-variant rounded-full mx-auto`).
- **Pill dock** (the orange-ish floating dock at the bottom — note: NOT the same as the home's bottom nav dock; this is a 3-icon pill with `bg-surface/60 backdrop-blur-[20px] shadow-[0_0_0_1px_rgba(212,175,55,0.3)]`):
  - 3 icons: `grid_view`, `view_agenda` (active, with dot below), `info`.
  - 8-pixel gold border via shadow ring. The active state is a tiny gold dot under the icon.

**State hooks**:
- **Loader**: same as desktop (single data source), responsive layout only.
- **Drawer**: route to `/works/:slug` (URL-shareable) vs in-page state (Q-6).
- **Sticky header offset**: `top-[64px]` for the search/filter bar (matches header height).

**Animation**:
- Filter chip scroll: native CSS `snap-x snap-mandatory`.
- Drawer slide-up: `motion` (state-driven).
- Pill dock: 300ms opacity/scale transition on tab change (`code.html:99-122`).

---

### 5. `admin_console` — desktop admin

**Source**: `assets/design/admin_console/{code.html,screen.png}`

**Route**: `/admin` (the dashboard), `/admin/projects`,
`/admin/projects/new`, `/admin/projects/:id`, `/admin/reviews`,
`/admin/reviews/:id`, `/admin/contact`, `/admin/contact/:id`. The login
(`/admin/auth`) is its own page (already built, but its visual is not
in the mockup — see Q-2).

**Atoms**: `MicroLabel`, `Tag`, `Badge`, `Toggle`, `IconButton`,
`SearchInput`, `StatNumber`, `StatusBadge` (Published / Draft), `ActionIcon`.

**Molecules**: `AdminSidebar` (brand mark + 3 nav items + Exit Admin link),
`AdminHeader` (top bar, user avatar right), `AdminWelcomeCard`,
`AdminStatCard`, `AdminProjectCard` (image + status badge + Edit/Delete),
`AdminReviewRow` (quote + author + toggle), `AdminInboxRow` (sender + time + preview).

**Organisms**:
- `AdminOverviewPage`: composes AdminSidebar + AdminHeader + WelcomeCard + ActiveWorksStatCard + ProjectsPortfolio (3-col grid of project cards + "New Project" CTA) + Inbox widget (2 message rows + "View All Messages") + Reviews widget (2 review rows with toggles).
- `AdminProjectsListPage`: composes AdminSidebar + AdminHeader + page title + "New Project" CTA + grid of project cards.
- `AdminProjectNewPage`: form (long form: title, slug, description, category, hours, status, hero image upload, gallery).
- `AdminProjectEditPage`: same form, pre-populated, with save / delete actions.
- `AdminReviewsListPage`: list of reviews with toggle.
- `AdminReviewDetailPage`: full review view (read-only).
- `AdminContactListPage`: list of contact messages.
- `AdminContactDetailPage`: full message view.

**Captured copy** (namespace: `admin`):

| Key | English value | Source |
| --- | --- | --- |
| `admin.brand.title` | `Admin` | `code.html:2` (sidebar brand) |
| `admin.sidebar.overview` | `Overview` | `code.html:2` |
| `admin.sidebar.works` | `Works` | `code.html:2` |
| `admin.sidebar.contactLeads` | `Contact Leads` | `code.html:2` |
| `admin.sidebar.exit` | `Exit Admin` | `code.html:2` |
| `admin.header.user` | `Julia Aponte` | `code.html:2` (top-right user name — Q-8) |
| `admin.overview.welcome.heading` | `Overview` | `code.html:11` |
| `admin.overview.welcome.subhead` | `Manage portfolio projects, review client feedback, and track incoming inquiries.` | `code.html:12` |
| `admin.overview.stat.activeWorksLabel` | `Active Works` | `code.html:17` |
| `admin.overview.stat.activeWorksValue` | `24` | `code.html:21` (number — likely from API) |
| `admin.overview.stat.activeWorksDelta` | `+3 this month` | `code.html:22` |
| `admin.overview.projects.heading` | `Projects Portfolio` | `code.html:29` |
| `admin.overview.projects.newCta` | `New Project` | `code.html:33` |
| `admin.overview.projects.status.published` | `Published` | `code.html:41` |
| `admin.overview.projects.status.draft` | `Draft` | `code.html:61` |
| `admin.overview.projects.uncategorized` | `Uncategorized` | `code.html:84` |
| `admin.overview.projects.action.edit` | `Edit` | `code.html:49,69,87` |
| `admin.overview.projects.action.setup` | `Setup` | `code.html:87` (when title is "Untitled Project") |
| `admin.overview.projects.action.delete` | (icon `delete`) | `code.html:51,71,89` |
| `admin.overview.projects.card1.title` | `Villa Luminosa` | `code.html:45` |
| `admin.overview.projects.card1.meta` | `Architecture • 2023` | `code.html:46` |
| `admin.overview.projects.card2.title` | `Project Aeon` | `code.html:65` |
| `admin.overview.projects.card2.meta` | `Industrial Design` | `code.html:66` |
| `admin.overview.projects.card3.title` | `Untitled Project` | `code.html:83` (italic) |
| `admin.overview.inbox.heading` | `Inbox` | `code.html:102` |
| `admin.overview.inbox.unreadBadge` | `3 New` | `code.html:105` (count from API) |
| `admin.overview.inbox.item1.sender` | `Sarah Jenkins` | `code.html:112` |
| `admin.overview.inbox.item1.time` | `2h ago` | `code.html:113` (formatter: Intl.RelativeTimeFormat) |
| `admin.overview.inbox.item1.preview` | `Inquiry regarding commercial interior design project for our new flagship store in SoHo...` | `code.html:115` |
| `admin.overview.inbox.item2.sender` | `Marcus Vance` | `code.html:121` |
| `admin.overview.inbox.item2.time` | `1d ago` | `code.html:122` |
| `admin.overview.inbox.item2.preview` | `Requesting portfolio access password for the confidential automotive concepts.` | `code.html:124` |
| `admin.overview.inbox.viewAll` | `View All Messages` | `code.html:127` |
| `admin.overview.reviews.heading` | `Reviews` | `code.html:135` |
| `admin.overview.reviews.item1.body` | `"An absolute masterclass in spatial design. The attention to material details completely transformed our living space."` | `code.html:143` |
| `admin.overview.reviews.item1.author` | `— Elena R.` | `code.html:144` |
| `admin.overview.reviews.item2.body` | `"Delivered exactly what was promised, on time. The workflow was seamless from start to finish."` | `code.html:156` |
| `admin.overview.reviews.item2.author` | `— TechCorp Inc.` | `code.html:157` |
| `admin.overview.reviews.item2.muted` | `0.75` (opacity class for unpublished) | `code.html:153` |

**Notable components**:
- **Sidebar**: 288px (`w-72`) fixed-left, `bg-surface-container-low`, brand mark (Gold `shield_person` icon + "Admin" h3), 3 nav items, "Exit Admin" link at bottom with `logout` icon.
- **Header**: fixed-top, `h-16`, `bg-surface/60 backdrop-blur-xl`, user avatar + name on the right.
- **Welcome card**: large with blur-3xl primary orb in top-right corner, `h-48`.
- **Stat card**: 256px wide (`w-64`), label + icon, large number + delta with `text-secondary` for "growth".
- **Project card**: 40px image area, status badge top-right (`bg-surface-container/90 backdrop-blur`), Edit + Delete buttons (`bg-error/10 text-error`).
- **Review row**: quote + author, switch toggle on right (publish/unpublish).
- **Inbox row**: sender + relative time, hover reveals a `w-1 bg-primary` left bar via `scale-y-0 group-hover:scale-y-100`.

**State hooks**:
- **Layout loader** (`app/routes/admin.tsx`): already implemented — `getSession(request)` redirect to `/admin/auth?next=...` on 401.
- **Overview loader**: `Promise.all` of `serverFetch` for:
  - `/api/v1/admin/projects?limit=3&featured=true` (top 3 published)
  - `/api/v1/admin/contact-messages?limit=2&unread=true` (inbox widget)
  - `/api/v1/admin/reviews?limit=2` (reviews widget)
  - `/api/v1/admin/projects/stats` (active works count + delta) — Q-12
- **Project list loader**: `serverFetch('/api/v1/admin/projects?page=...&status=...')`.
- **Project new/edit action**: `POST` or `PATCH` via `serverFetch` to `/api/v1/admin/projects` or `/api/v1/admin/projects/:id`.
- **Review toggle action**: `PATCH /api/v1/admin/reviews/:id` with `{ published: boolean }`. Optimistic update via `mutate(swrKeys.admin.reviews.list())`.
- **Delete action**: `DELETE /api/v1/admin/projects/:id` with `confirm()` modal.

**Animation**:
- Sidebar nav active state: `bg-primary-container text-on-primary-container font-bold` (no animation).
- Stat card hover: `hover:-translate-y-1` (CSS, 300ms).
- Project card image hover: `group-hover:scale-105` 700ms (CSS).
- Inbox row reveal: `scale-y-0` → `scale-y-100` on the `bg-primary` left bar (CSS).

---

### 6. `admin_console_mobile` — mobile admin

**Source**: `assets/design/admin_console_mobile/{code.html,screen.png}`

**Route**: `/admin` (mobile), with tabs for Projects / Reviews / Inbox. The
desktop sidebar becomes a bottom tab on mobile (Q-9).

**Atoms**: As desktop + `Tabs`, `Tab`, `Avatar`, `ProgressBar`,
`AddButton`.

**Molecules**:
- `MobileAdminHeader` (hamburger left, "Admin" center, avatar right).
- `MobilePageHeader` (h1 + subhead + Search + Add buttons on the right).
- `MobileTabBar` (horizontal scroll, 3 pills: Projects / Reviews / Inbox, with a count badge on Inbox).
- `MobileProjectCard` (status pill, title, avatar stack (`-space-x-2`), progress bar).
- `MobileEmptyState` (icon + heading + body).
- `MobileAdminPage`: composes all + BottomNavDock (Home / Works / Reach Out — same as public mobile).

**Captured copy** (additions to `admin` namespace):

| Key | English value | Source |
| --- | --- | --- |
| `admin.overview.headingMobile` | `Dashboard` | `code.html:5` (note: desktop calls it "Overview", mobile calls it "Dashboard") |
| `admin.overview.subheadMobile` | `Manage your creative business` | `code.html:6` |
| `admin.tab.projects` | `Projects` | `code.html:18` |
| `admin.tab.reviews` | `Reviews` | `code.html:19` |
| `admin.tab.inbox` | `Inbox` | `code.html:20` |
| `admin.projects.card1.status` | `Active • Due Oct 12` | `code.html:31` |
| `admin.projects.card1.title` | `Aura Brand Identity` | `code.html:34` |
| `admin.projects.card2.status` | `Review • Due Oct 15` | `code.html:53` |
| `admin.projects.card2.title` | `Lumina App Design` | `code.html:56` |
| `admin.reviews.empty.heading` | `No Pending Reviews` | `code.html:75` |
| `admin.reviews.empty.body` | `All client feedback has been addressed. Great job!` | `code.html:76` |
| `admin.inbox.item1.tag` | `New Inquiry` | `code.html:83` |
| `admin.inbox.item1.time` | `2h ago` | `code.html:84` |
| `admin.inbox.item1.sender` | `Sarah Jenkins` | `code.html:86` |
| `admin.inbox.item1.preview` | `Looking for a portfolio redesign. I love the minimalist approach you took with the Aura project and was wondering if...` | `code.html:87` |

**Notable components**:
- **Header with two action buttons**: search (round) + add (round, primary).
- **Tab pills**: 3 buttons, active is `bg-primary text-on-primary`; inactive is `bg-surface-container-high text-on-surface-variant`.
- **Project card**: status pill (color-coded: `text-primary` for Active, `text-secondary` for Review), title, avatar stack (`-space-x-2`), horizontal progress bar with label.
- **Empty state**: 80×80 round icon container, heading, body.
- **Inbox card**: 4px primary left bar, "New Inquiry" tag, sender, time, preview (2-line clamp).

**State hooks**: Same as desktop overview + a `useUIStore` slice for
the active tab.

**Animation**:
- Tab switch: `opacity-0` → 1 with 300ms transition (CSS, `code.html:70-89`).
- Tab content show/hide: `hidden` class + `opacity-0` after 300ms (`code.html:118`).

---

## Component library plan

### Atoms (lives at `app/shared/ui/atoms/`)

| Atom | Purpose | Reused on |
| --- | --- | --- |
| `BentoCell` | The 16-px-radius, 32-px-padding card shell with optional micro-label slot, glass stroke (0.5px white/10% top + left), hover scale 1.02 | Home metrics, works cards, contact CTA, admin overview cards |
| `MicroLabel` | 12px uppercase tracking 0.1em — gold or on-surface-variant | Every bento cell, every section |
| `GrainOverlay` | Fixed full-screen noise overlay at 5% opacity, z-100 | All public + admin pages |
| `SectionHeading` | h2 with optional right-side badge, supports `text-headline-lg` and `text-headline-lg-mobile` | Home, works, admin |
| `IconButton` | Square round button with icon, multiple sizes | Header, admin header, project card delete, review toggle |
| `SearchInput` | Round full-pill with leading icon, gold focus ring | Works hero |
| `FilterChip` | Pill button, active = primary bg, inactive = surface-container | Works hero |
| `Tag` | Small pill, used inline on cards (category labels, status) | Works card, admin project card |
| `PaginationButton` | Square round button with number or chevron | Works pagination |
| `StatNumber` | Large display number with optional delta in secondary color | Home metrics, admin stat card |
| `StatusBadge` | Pill, two variants: Published (primary) / Draft (outline) | Admin project card |
| `Toggle` | Switch component, on/off state with primary track when checked | Admin review row |
| `Avatar` | Round profile image with ring and fallback | Header, reviews list, mobile admin |
| `EmptyState` | Centered icon + heading + body | Admin reviews empty state |
| `ProgressBar` | Horizontal bar with optional percentage label | Home mobile metrics, admin project card, works card |
| `Sparkline` | Inline SVG, 1 path, 12px tall | Home mobile metrics |
| `Button` (shadcn, existing) | Primary / secondary / ghost / destructive variants | All |
| `Input`, `Label`, `Field`, `FieldGroup`, `FieldError`, `Separator` (shadcn, existing) | Forms | All forms |

### Molecules (per area or shared)

| Molecule | Area | Reused on |
| --- | --- | --- |
| `PublicHeader` | `app/shared/ui/molecules/` | `/`, `/works`, `/works/:slug`, `/contact` |
| `PublicFooter` | `app/shared/ui/molecules/` | All public |
| `BottomNavDock` | `app/shared/ui/molecules/` | All public mobile + admin mobile (the pill at the bottom) |
| `MobileHeader` | `app/shared/ui/molecules/` | All mobile pages |
| `LocaleSwitcher` | `app/shared/ui/molecules/` | Public header |
| `AdminSidebar` | `app/admin/auth/components/` or `app/shared/ui/molecules/` | `/admin/*` desktop |
| `AdminHeader` | `app/admin/auth/components/` or `app/shared/ui/molecules/` | `/admin/*` desktop |
| `ProjectCard` | `app/works/molecules/` (4 variants) | Works catalog, home selected works |
| `ProjectMeta` | `app/works/molecules/` | Every project card |
| `Drawer` | `app/shared/ui/molecules/` | Works desktop drawer (used by any future drawer too) |
| `MobileProjectDrawer` | `app/works/molecules/` | Works mobile |
| `Pagination` | `app/works/molecules/` | Works catalog |
| `ReviewCard` | `app/home/molecules/` | Home testimonials, admin reviews |
| `ReviewForm` | `app/home/molecules/` | Home testimonials form |
| `ContactForm` | `app/contact/molecules/` | `/contact` route |
| `HeroProfileCard` | `app/home/molecules/` | Home hero |
| `MetricsBento` | `app/home/molecules/` | Home technical strategy |
| `SelectedWorksBento` | `app/home/molecules/` | Home selected works |
| `TestimonialsSplit` | `app/home/molecules/` | Home reviews split |
| `ContactCTA` | `app/home/molecules/` | Home bottom contact card |
| `AdminProjectCard` | `app/admin/projects/molecules/` | Admin projects list + overview widget |
| `AdminReviewRow` | `app/admin/reviews/molecules/` | Admin reviews list + overview widget |
| `AdminInboxRow` | `app/admin/contact/molecules/` | Admin contact inbox + overview widget |
| `AdminStatCard` | `app/shared/ui/molecules/` (reused home + admin) | Home metrics, admin overview |
| `MobileTabBar` | `app/shared/ui/molecules/` | Admin mobile |

### Unique to one surface (not reusable)

- `HeroProfileCard` — home-only.
- `AdminProjectForm` — admin projects new/edit only.
- `TestimonialsSplit` — home-only (the desktop mockup's two-column review form + list).
- `MobileContactCTA` — home mobile only.
- `WorksHero` — works only.

### Templates

- `PublicLayout` — extends existing `app/routes/_public.tsx`, adds Header + Outlet + Footer + GrainOverlay.
- `AdminLayout` — extends existing `app/routes/admin.tsx`, adds Sidebar + Header + Outlet + GrainOverlay.

### Pages (one per route)

See [Routes plan](#routes-plan).

---

## i18n namespace plan

Per `DESIGN.md` §8: one namespace per public area, single `admin` namespace (English-only).

### File paths

```
app/shared/i18n/
├── index.ts                    # i18next init, namespace registration
├── locales/
│   ├── en/
│   │   ├── common.json
│   │   ├── home.json
│   │   ├── works.json
│   │   ├── contact.json
│   │   └── admin.json
│   └── es/
│       ├── common.json
│       ├── home.json
│       ├── works.json
│       └── contact.json        # NO admin.json
```

### Initial key set per namespace

#### `common` (en + es)

Already captured in the per-screen inventories above:
- `common.brand.name`, `common.brand.altName`
- `common.nav.{home,works,contact}`, `common.nav.admin`, `common.nav.contactMobile`
- `common.locale.{en,es}`
- `common.footer.tagline`, `common.footer.copyright`
- `common.error.network`, `common.error.generic` (for SWR error toasts and ErrorBoundary)

#### `home` (en + es)

All keys captured in screens 1 and 2 above. ~50 keys.

#### `works` (en + es)

All keys captured in screens 3 and 4 above. ~40 keys.

#### `contact` (en + es)

```
contact.heading        "Get in touch" / "Ponte en contacto"
contact.subhead        "For project inquiries, press, or strategic collaborations." / "Para consultas de proyectos, prensa o colaboraciones estratégicas."
contact.form.name        "Name" / "Nombre"
contact.form.email       "Email" / "Correo electrónico"
contact.form.subject     "Subject" / "Asunto"
contact.form.body        "Message" / "Mensaje"
contact.form.submit      "Send" / "Enviar"
contact.form.submitting  "Sending..." / "Enviando..."
contact.success.title    "Message sent" / "Mensaje enviado"
contact.success.body     "I'll get back to you within 48 hours." / "Te responderé en 48 horas."
contact.error.throttled  "Too many submissions. Try again later." / "Demasiados envíos. Inténtalo más tarde."
contact.error.network    "You appear to be offline." / "Parece que estás sin conexión."
```

#### `admin` (en only)

All keys captured in screens 5 and 6 above, plus:
```
admin.auth.signIn.title       "Sign in"
admin.auth.signIn.subhead     "Admin access to the portfolio."
admin.auth.signIn.email       "Email"
admin.auth.signIn.password    "Password"
admin.auth.signIn.submit      "Sign in"
admin.auth.signIn.submitting  "Signing in…"
admin.auth.signIn.invalidCreds "Invalid credentials"
admin.auth.signIn.throttled   "Too many attempts. Try again in N seconds."
admin.auth.signOut.button     "Sign out"
admin.auth.signOut.submitting "Signing out…"
admin.projects.list.title     "Projects"
admin.projects.list.searchPlaceholder "Search projects…"
admin.projects.list.filter.all "All"
admin.projects.list.filter.published "Published"
admin.projects.list.filter.draft "Draft"
admin.projects.new.title      "New project"
admin.projects.edit.title    "Edit project"
admin.projects.form.title     "Title"
admin.projects.form.slug      "Slug"
admin.projects.form.category  "Category"
admin.projects.form.hours     "Hours"
admin.projects.form.status    "Status"
admin.projects.form.heroImage "Hero image"
admin.projects.form.gallery   "Gallery"
admin.projects.form.body      "Description"
admin.projects.form.save      "Save"
admin.projects.form.delete    "Delete"
admin.projects.form.deleteConfirm "Are you sure? This cannot be undone."
admin.reviews.list.title      "Reviews"
admin.reviews.list.published  "Published"
admin.reviews.list.unpublished "Unpublished"
admin.contact.list.title      "Messages"
admin.contact.list.unreadBadge "{count} New"
```

### i18n bootstrap (currently missing)

`_public.tsx:9` has `// TODO when wiring react-i18next`. This change:

1. Creates `app/shared/i18n/index.ts` that:
   - Initializes `i18next` with `react-i18next` and `initReactI18next`.
   - Loads `en` + `es` namespaces from the JSON files.
   - Detects the locale from the URL prefix (`/es/...` → `es`, otherwise `en`).
   - Sets `document.documentElement.lang` on change.
2. Wires the provider in `app/root.tsx` (between `<Outlet />` and `<Scripts />`).
3. Creates `app/shared/stores/locale.ts` (`useLocaleStore`) with `{ locale, setLocale }` — the mirror for non-hook readers (e.g. `meta`).
4. Creates a `setLocale(next)` helper that:
   - Updates i18next.
   - Updates the store.
   - Sets the `lang` cookie.
   - Sets `document.documentElement.lang`.
   - **Optionally** navigates the user to the equivalent URL in the new locale (Q-16).

---

## Routes plan

The `app/routes.ts` already declares the full route table (lines 27–70).
No structural changes are required. What this change fills in:

### Route modules (replace scaffolds)

| Path | File | Mode | Loader (new) | Action (new) |
| --- | --- | --- | --- | --- |
| `/` | `_public._index.tsx` | SSR / pre-render | `getHomePageData` (3 SWR keys: featured projects, featured reviews, home metrics) | none |
| `/works` | `_public.works.tsx` | SSR / pre-render | `getWorksList({ page, category, q })` | none |
| `/works/:slug` | `_public.works.$slug.tsx` | SSR / pre-render | `getWorkBySlug(slug)` | none |
| `/contact` | `_public.contact.tsx` | SSR | none | `contactAction` → `POST /api/v1/contact` |
| `/admin` | `admin._index.tsx` | SSR (session) | `getAdminOverview()` | none |
| `/admin/auth` | `admin.auth.tsx` | SSR (public) | (none — already done) | (already done — `loginAction`) |
| `/admin/auth/logout` | `admin.auth.logout.tsx` | SSR (session) | none | (already done — `logoutAction`) |
| `/admin/projects` | `admin.projects._index.tsx` | SSR (session) | `getAdminProjects({ page, status, q })` | none |
| `/admin/projects/new` | `admin.projects.new.tsx` | SSR (session) | none | `createProjectAction` → `POST /api/v1/admin/projects` |
| `/admin/projects/:id` | `admin.projects.$id.tsx` | SSR (session) | `getAdminProjectById(id)` | `updateProjectAction` / `deleteProjectAction` (via `_index` form) |
| `/admin/reviews` | `admin.reviews._index.tsx` | SSR (session) | `getAdminReviews({ published, page })` | none |
| `/admin/reviews/:id` | `admin.reviews.$id.tsx` | SSR (session) | `getAdminReviewById(id)` | `togglePublishAction` → `PATCH /api/v1/admin/reviews/:id` |
| `/admin/contact` | `admin.contact._index.tsx` | SSR (session) | `getAdminContactMessages({ unread, page })` | none |
| `/admin/contact/:id` | `admin.contact.$id.tsx` | SSR (session) | `getAdminContactMessageById(id)` | `markReadAction` → `PATCH /api/v1/admin/contact/:id` |

### Pre-render target (per `DESIGN.md` §3)

| Path | Pre-render? | Rationale |
| --- | --- | --- |
| `/` | **Yes** (ISR or build-time) | Updates ~weekly; the public home is the SEO landing |
| `/works` | **Yes** (ISR) | Updates per project add (~weekly) |
| `/works/:slug` | **Yes** (ISR per slug) | Project detail rarely changes; SEO-critical |
| `/contact` | **No** (SSR) | Form, no SEO need for pre-render |
| `/admin/*` | **No** (SSR) | Session-gated, user-specific |

> Confirm the pre-render mechanism (Vercel ISR vs static at build time) in `sdd-design` (carried over from `DESIGN.md` §13 open question 1).

### New pages (live under `app/<area>/pages/`)

The route files (`app/routes/_public._index.tsx` etc.) become thin
containers that import from the new page modules. The new page modules
live under the screaming-architecture folders:

- `app/home/pages/home.tsx`
- `app/works/pages/works.tsx`
- `app/works/pages/work-detail.tsx`
- `app/contact/pages/contact.tsx`
- `app/admin/projects/pages/list.tsx`
- `app/admin/projects/pages/new.tsx`
- `app/admin/projects/pages/edit.tsx`
- `app/admin/reviews/pages/list.tsx`
- `app/admin/reviews/pages/detail.tsx`
- `app/admin/contact/pages/list.tsx`
- `app/admin/contact/pages/detail.tsx`

### Server actions (per-area API folders)

- `app/home/api/home.ts` — `getHomePageData()` (no action; this is a read surface).
- `app/works/api/works.ts` — `getWorksList()`, `getWorkBySlug()`.
- `app/contact/api/contact.ts` — `contactAction()` (writes).
- `app/admin/projects/api/projects.ts` — `getAdminProjects()`, `getAdminProjectById()`, `createProjectAction()`, `updateProjectAction()`, `deleteProjectAction()`.
- `app/admin/reviews/api/reviews.ts` — `getAdminReviews()`, `getAdminReviewById()`, `togglePublishAction()`.
- `app/admin/contact/api/contact.ts` — `getAdminContactMessages()`, `getAdminContactMessageById()`, `markReadAction()`.

### SWR keys (extend `app/shared/swr/keys.ts`)

```ts
export const swrKeys = {
  home: {
    featured: () => ['/api/v1/projects?featured=true', '/api/v1/reviews?featured=true'] as const,
    metrics: () => '/api/v1/home/metrics' as const, // optional
  },
  works: {
    list: (filters?: { page?: number; category?: string; q?: string }) =>
      `/api/v1/works?${new URLSearchParams(filters ?? {}).toString()}` as const,
    bySlug: (slug: string) => `/api/v1/works/${slug}` as const,
  },
  contact: {
    submit: () => '/api/v1/contact' as const, // for the action, not a key
  },
  admin: {
    projects: {
      list: (filters?: { page?: number; status?: string; q?: string }) =>
        `/api/v1/admin/projects?${new URLSearchParams(filters ?? {}).toString()}` as const,
      byId: (id: string) => `/api/v1/admin/projects/${id}` as const,
      stats: () => '/api/v1/admin/projects/stats' as const,
    },
    reviews: {
      list: (filters?: { published?: boolean; page?: number }) =>
        `/api/v1/admin/reviews?${new URLSearchParams(filters ?? {}).toString()}` as const,
      byId: (id: string) => `/api/v1/admin/reviews/${id}` as const,
    },
    contact: {
      list: (filters?: { unread?: boolean; page?: number }) =>
        `/api/v1/admin/contact?${new URLSearchParams(filters ?? {}).toString()}` as const,
      byId: (id: string) => `/api/v1/admin/contact/${id}` as const,
    },
  },
} as const;
```

---

## State & data hooks

### `useSessionStore` (existing, `app/shared/stores/session.ts`)

- **No change** — already wired by the archived `auth-fetch-client` change.

### `useLocaleStore` (new, `app/shared/stores/locale.ts`)

```ts
type LocaleState = { locale: 'en' | 'es' };
type LocaleActions = { setLocale: (next: 'en' | 'es') => void };
type LocaleStore = LocaleState & LocaleActions;
```

- Initialized from the URL prefix in `_public.tsx` loader (server) and rehydrated on the client.
- Selector form only (DESIGN.md §4 rule).

### `useUIStore` (new, `app/shared/stores/ui.ts`)

```ts
type UIState = {
  mobileMenuOpen: boolean;
  drawerOpen: boolean;
  drawerSlug: string | null;
  activeAdminTab: 'projects' | 'reviews' | 'inbox';
};
```

- `mobileMenuOpen` — public mobile hamburger.
- `drawerOpen` + `drawerSlug` — works catalog side drawer (Q-6).
- `activeAdminTab` — mobile admin tab.

### `useToastStore` (new, `app/shared/stores/toasts.ts`)

```ts
type Toast = { id: string; kind: 'success' | 'error' | 'info'; message: string; durationMs?: number };
type ToastState = { toasts: Toast[] };
type ToastActions = { push: (t: Omit<Toast, 'id'>) => void; dismiss: (id: string) => void };
```

- Used by: contact form success/error, review form success/error, SWR error toasts.
- Auto-dismiss after `durationMs` (default 4000).

### Forms (`useForm` + `zod`)

| Form | Schema (lives at) | Submit via |
| --- | --- | --- |
| Contact (`/contact`) | `app/contact/schema.ts` | `fetcher.submit` to `/contact` action |
| Review (home) | `app/home/schema.ts` | `fetcher.submit` to a new review action (Q-3) |
| Login (`/admin/auth`) | `app/admin/auth/schema.ts` (existing) | `fetcher.submit` to `/admin/auth` (existing) |
| Project new/edit | `app/admin/projects/schema.ts` | `fetcher.submit` to `/admin/projects/new` or `/admin/projects/:id` |
| Review toggle (admin) | (none — single field) | `fetcher.submit` to `/admin/reviews/:id` with `{ published: boolean }` |
| Contact message read (admin) | (none — single field) | `fetcher.submit` to `/admin/contact/:id` with `{ read: boolean }` |

### Optimistic updates

- **Review toggle** in admin: optimistic flip the toggle immediately,
  roll back on `PATCH` failure.
- **Project delete**: optimistic remove from list, roll back on failure.
- **Contact message read**: optimistic mark, no rollback needed (low stakes).

---

## Open questions for the proposal

> These are product decisions the user must answer before `sdd-propose`
> can be written. Do NOT answer them yourself — surface them.

### Theme & visual

- **Q-1**: Confirm the theme conflict resolution. Recommended: keep
  the shadcn primitive recipes, override `:root` shadcn tokens to
  Aurelian values, drop `--rndr-*` shorthand, migrate existing
  usages. Alternative: re-do the shadcn install with a custom
  `components.json` (heavier, but cleaner separation).
- **Q-2**: Is the admin `/admin/auth` login page covered by a separate
  mockup, or is the desktop admin mockup its visual reference? The
  existing login form (archived `auth-fetch-client` change) uses
  shadcn primitives — does it need a custom Aurelian re-skin?
- **Q-3**: The home has a public "Leave a Review" form. Is the
  backend endpoint `POST /api/v1/reviews` (public write) confirmed?
  Or does the home form submit to `/api/v1/contact` (no review
  moderation)? If the former, the form needs throttling and
  moderation (Q-19).

### Layout & IA

- **Q-4**: The home `code.html` does NOT show an explicit "About"
  section — it goes hero → metrics → works → reviews → contact.
  `DESIGN.md` §3 says home is "about, reviews, projects highlights".
  Add an About bento? Skip it? Make the metrics bento the About
  substitute?
- **Q-5**: Admin mobile uses a tab bar (Projects / Reviews / Inbox)
  for the dashboard. The desktop uses a sidebar (Overview / Works /
  Contact Leads). Do they share the same data, or are they
  intentionally different surfaces (mobile = "what's pending",
  desktop = "everything")?
- **Q-6**: The works catalog has a side drawer (desktop) and a
  full-screen bottom sheet (mobile). Should the detail ALSO be at
  `/works/:slug` (URL-shareable, SEO-friendly) with the drawer as
  the in-page preview, or is the drawer the only detail surface?
  Recommendation: both — drawer is a preview, `/works/:slug` is the
  canonical URL.
- **Q-7**: The home has an "Initiate Contact" mini-form (email-only,
  "Send Transmission"). The dedicated `/contact` route has a full
  form (name + email + subject + body). Is the home mini-form just
  a CTA to `/contact`, or is it a real submission? (Affects
  throttling + which endpoint it posts to.)
- **Q-8**: The brand text is "Juliam Aponte" in the image alt + the
  design folder name, but "Julia Aponte" in the header text. Which
  is canonical? The footer copyright says "© 2024 Julia Aponte".
  Recommend locking to "Julia Aponte" and treating the alt-text
  "Juliam" as a typo to fix in the design.

### i18n

- **Q-9**: The desktop home has `Atmósfera Dinámica` (Spanish) as the
  hero micro-label. The English version. Translate as a single i18n
  key, or keep as a brand flourish (untranslated)?
- **Q-10**: The mobile home has `Technical Strategist` (English) as
  the micro-label. Same Q-9 — translate or not?
- **Q-11**: When the user switches `EN ↔ ES` in the header, should
  the URL prefix change (`/works` ↔ `/es/works`) with a navigation,
  or stay on the same path and just flip the language cookie?
  Recommendation: navigate to the equivalent path (Q-16).
- **Q-12**: The home metrics values (124, 48, 92) and admin "Active
  Works: 24" look like they come from the API. Confirm endpoints:
  - `GET /api/v1/home/metrics` — home metrics summary
  - `GET /api/v1/admin/projects/stats` — admin stats
  Or are these hardcoded in v1 (with a backend ticket to expose)?

### API contract

- **Q-13**: Confirm the `app/shared/swr/keys.ts` keys against the
  backend's locked specs (read
  `../roonder-portfolio-backend/openspec/specs/`). The frontend
  mirrors the backend, never re-derives. Any drift becomes a
  frontend bug.
- **Q-14**: The public header's "Admin" button — link to
  `/admin/auth` (login) if not signed in, or to `/admin` (dashboard)
  if signed in? The button is visible to anonymous users (per
  mockup). Recommendation: always link to `/admin/auth`; the layout
  gate redirects to `/admin` once the session is valid.
- **Q-15**: Icon set — Material Symbols Outlined (per mockup) or
  `lucide-react` (per `package.json`)? Lucide is consistent with
  the shadcn install. Confirm: use `lucide-react` and find
  equivalents for the Material Symbols used, OR add the Material
  Symbols font.
- **Q-16**: Locale switch: navigate to equivalent path with new
  prefix, OR just flip the cookie + `lang` attribute without
  navigation? (See Q-11.)
- **Q-17**: Works pagination — server-side (query param `?page=N`)
  or client-side windowing? The mockup shows 1, 2, 3, …, 8 which
  implies server-side.
- **Q-18**: Works search — `?q=...` against the backend, or
  client-side filter on the loaded page? Backend search is the only
  way to scale past 100 projects.
- **Q-19**: The public review form on home — is its submission
  public-write (`POST /api/v1/reviews` with rate limit), or does it
  require login, or does it go to `/api/v1/contact` (no review
  object created)? Confirm with the backend.
- **Q-20**: Admin "Reviews" widget in the overview — is its toggle
  the primary moderation surface, or just a summary? The mockup
  shows 2 reviews with toggles. The `admin.reviews._index.tsx`
  route exists separately. Confirm the IA: are both surfaces needed?

### Pre-render & build

- **Q-21**: Pre-render target per route (DESIGN.md §13 open question
  1). Vercel ISR vs static at build time? This affects `react-router.config.ts`
  (the `prerender` export) and the deploy platform.

### Out of scope confirmation

- **Q-22**: Confirm the "add a fourth state library" anti-pattern
  holds — no Redux, no Jotai. The `useSessionStore` + `useLocaleStore`
  + `useUIStore` + `useToastStore` quartet is the full state model.
- **Q-23**: Confirm the test runner stays out of scope (`bun run
  typecheck` is the only quality gate). Adding Vitest + Playwright
  is a separate SDD change.
- **Q-24**: Confirm no new locales beyond `en` + `es` in v1.

---

## Risks & dependencies

### High

- **R-theme**: Aurelian obsidian vs shadcn `base-sera` light. **Mitigation**: override shadcn `:root` tokens; keep primitives untouched. See Q-1.
- **R-size**: The full v1 implementation is **definitively over the 400-line review budget**. Likely 3,000–5,000 changed lines across 30+ new files. **Mitigation**: `sdd-tasks` MUST recommend chained PRs (PR 1: foundation + theme + i18n + atoms; PR 2: public surface; PR 3: admin surface; PR 4: per-page atomic-design fills). The Review Workload Guard (§E in `sdd-phase-common.md`) will require this.
- **R-i18n-bootstrap**: `i18next` is a dependency but not wired. The `// TODO when wiring react-i18next` in `_public.tsx:9` is the entry point. Without it, all i18n keys will silently render as `home.hero.headline` in the UI. **Mitigation**: the proposal names this as the first task of PR 1.

### Medium

- **R-font**: Drop Noto Sans + Playfair Display, add Hanken Grotesk 400/500/600 (already imported). Risk: any pre-existing string that depends on Noto Sans breaks. **Mitigation**: none of the existing components reference those fonts explicitly; safe to remove.
- **R-icon-set**: Material Symbols vs `lucide-react`. See Q-15. **Mitigation**: if Material Symbols is locked, add the font; if `lucide-react` is locked, do the per-icon migration map.
- **R-no-test-runner**: No safety net for the i18n keys, no regression for the theme re-skin, no E2E for the contact form. **Mitigation**: explicit `bun run typecheck` gate; manual smoke checklist per route in the verify phase.
- **R-no-prerender-target**: `DESIGN.md` §13 leaves the pre-render target open. **Mitigation**: `sdd-design` resolves it (Q-21).
- **R-admin-mobile-tabs**: The mobile admin uses a tab bar that doesn't appear in the desktop sidebar. **Mitigation**: `useUIStore.activeAdminTab` slice + responsive component (Q-5).
- **R-project-drawer-vs-route**: The catalog's side drawer is a preview; `/works/:slug` is the canonical URL. Without both, sharing a project is broken. **Mitigation**: both — drawer previews, route is canonical (Q-6).
- **R-backend-mirror**: The frontend mirrors the backend's locked specs. If a spec drifts, the frontend is wrong. **Mitigation**: read `../roonder-portfolio-backend/openspec/specs/` in the design phase; flag any drift as a frontend bug to fix (per AGENTS.md "Mirror the backend's locked specs").

### Low

- **R-canonical-brand-spelling**: "Juliam" vs "Julia" (Q-8). One-time string decision.
- **R-shared-swr-keys-location**: `app/shared/swr/keys.ts` is referenced by DESIGN.md §4 but the file doesn't exist yet (only `app/shared/swr/fetcher.ts` does). **Mitigation**: create it in the foundation PR.
- **R-locale-store-missing**: `useLocaleStore` is in DESIGN.md §4 but not in the codebase. **Mitigation**: create it in the i18n-bootstrap task.
- **R-existing-cn-location**: `app/lib/utils.ts` vs `app/shared/lib/cn.ts` (per AGENTS.md). Two `cn()` definitions could drift. **Mitigation**: move + update imports as part of the foundation PR.

### Dependencies

- **D-backend**: Backend at `../roonder-portfolio-backend` is the source of truth for types. The frontend NEVER re-derives them. **Read before write.**
- **D-auth-fetch-client**: Already archived. The HTTP client, `useSessionStore`, login + logout, admin gate are all in place. This change consumes them; does not modify them.
- **D-shadcn**: `app/components/ui/*` has 5 primitives (`button`, `field`, `input`, `label`, `separator`). The home + works + admin will need more (`select`, `textarea`, `dropdown-menu`, `dialog` for confirm modals, `popover` for the language switcher, `switch` for the review toggle). **Add via the `shadcn` MCP**, not by hand.
- **D-base-ui**: `@base-ui/react` is the only headless layer. New components from the shadcn MCP come with Base UI primitives already (the existing `button.tsx` is `import { Button as ButtonPrimitive } from "@base-ui/react/button"`).
- **D-i18next**: Already in `package.json`. No new dependencies for the foundation PR. If Q-15 locks Material Symbols, add the Google Fonts link (or self-host the font); if Q-11 locks animated tab indicators, add `framer-motion-12` (already in `package.json` as `motion: ^12.42.2`).

### Skill resolution

- `react-router`: paths-injected (project-local
  `.agents/skills/react-router/SKILL.md`).
- `react-19`: paths-injected.
- `tailwind-4`: paths-injected.
- `sdd-explore`: paths-injected.
- `cognitive-doc-design`: paths-injected.
- All five skills loaded BEFORE this report was drafted. See
  [Appendix A](#appendix-a--change-discovery-index) for the exact
  files read.

---

## Ready for proposal

**Status**: ready, with the 24 open questions above as gates.

**Next phase**: `sdd-propose portfolio-frontend-v1`. The proposal must:

1. Lock decisions on the 24 open questions (or carry them forward to `sdd-design` with an explicit "needs user" flag).
2. Define the chained-PR strategy (PR 1: foundation; PR 2: public surface; PR 3: admin surface; PR 4: per-page fills + animations + drawer logic). The forecast MUST include the §E guard lines: `Decision needed before apply: Yes|No`, `Chained PRs recommended: Yes|No`, `400-line budget risk: Low|Medium|High`.
3. Confirm the in-scope / out-of-scope list (this explore report is the seed).
4. Identify the cross-project dependency on the backend's
   `openspec/specs/` (read-only reference; flag any drift to fix
   on the frontend).

**No blockers** for moving to `sdd-propose` once the open questions are answered.

---

## Appendix A — change discovery index

Files and folders read in this exploration, in order:

### Project docs
- `DESIGN.md` (439 lines, full read)
- `AGENTS.md` (168 lines, full read)
- `openspec/config.yaml` (71 lines, full read)
- `openspec/specs/testing-capabilities.md` (39 lines, full read)
- `openspec/specs/admin-auth/spec.md` (514 lines, full read)
- `openspec/specs/http-client/spec.md` (454 lines, full read)
- `openspec/changes/archive/2026-08-03-auth-fetch-client/proposal.md` (385 lines, full read)
- `.atl/skill-registry.md` (39 lines, full read)
- `package.json` (47 lines, full read)

### Skills
- `~/.config/opencode/skills/sdd-explore/SKILL.md` (full read)
- `~/.config/opencode/skills/_shared/sdd-phase-common.md` (109 lines, full read)
- `~/.config/opencode/skills/_shared/openspec-convention.md` (119 lines, full read)
- `/home/roonder/Personal-Development/roonder-portfolio-frontend/.agents/skills/react-router/SKILL.md` (122 lines, full read)
- `~/.config/opencode/skills/react-19/SKILL.md` (124 lines, full read)
- `~/.config/opencode/skills/tailwind-4/SKILL.md` (199 lines, full read)
- `~/.config/opencode/skills/cognitive-doc-design/SKILL.md` (81 lines, full read)

### Design assets
- `assets/design/aurelian_grid_v2/DESIGN.md` (177 lines, full read)
- `assets/design/home_juliam_aponte_portfolio/code.html` (154 lines, full read)
- `assets/design/home_juliam_aponte_portfolio/screen.png` (image, read)
- `assets/design/home_mobile_juliam_aponte/code.html` (148 lines, full read)
- `assets/design/home_mobile_juliam_aponte/screen.png` (image, read)
- `assets/design/project_catalog/code.html` (237 lines, full read)
- `assets/design/project_catalog/screen.png` (image, read)
- `assets/design/project_catalog_mobile/code.html` (157 lines, full read)
- `assets/design/project_catalog_mobile/screen.png` (image, read)
- `assets/design/admin_console/code.html` (169 lines, full read)
- `assets/design/admin_console/screen.png` (image, read)
- `assets/design/admin_console_mobile/code.html` (123 lines, full read)
- `assets/design/admin_console_mobile/screen.png` (image, read)

### App skeleton
- `app/root.tsx` (79 lines, full read)
- `app/routes.ts` (71 lines, full read)
- `app/app.css` (115 lines, full read)
- `app/lib/utils.ts` (6 lines, full read)
- `app/components/global/Navbar.tsx` (17 lines, full read)
- `app/components/cards/NeuronCard.tsx` (14 lines, full read)
- `app/components/ui/button.tsx` (55 lines, full read)
- `app/components/ui/input.tsx` (20 lines, full read)
- `app/components/ui/label.tsx` (18 lines, full read)
- `app/components/ui/field.tsx` (236 lines, full read)
- `app/components/ui/separator.tsx` (25 lines, full read)
- `app/shared/stores/session.ts` (108 lines, full read)
- `app/shared/lib/cookies.ts` (71 lines, full read)
- `app/shared/lib/fetch-client/core.ts` (229 lines, full read)
- `app/shared/lib/fetch-client/client.ts` (92 lines, full read)
- `app/shared/lib/fetch-client/server.ts` (143 lines, full read)
- `app/shared/lib/fetch-client/errors.ts` (237 lines, full read)
- `app/shared/lib/fetch-client/refresh.ts` (148 lines, full read)
- `app/shared/lib/fetch-client/get-session.ts` (88 lines, full read)
- `app/shared/swr/fetcher.ts` (20 lines, full read)
- `app/admin/auth/schema.ts` (38 lines, full read)
- `app/admin/auth/api/login.ts` (127 lines, full read)
- `app/admin/auth/api/logout.ts` (86 lines, full read)
- `app/admin/auth/pages/login.tsx` (221 lines, full read)
- `app/admin/auth/components/sign-out-button.tsx` (69 lines, full read)
- `app/routes/_public.tsx` (40 lines, full read)
- `app/routes/_public._index.tsx` (38 lines, full read)
- `app/routes/_public.works.tsx` (21 lines, full read)
- `app/routes/_public.works.$slug.tsx` (22 lines, full read)
- `app/routes/_public.contact.tsx` (21 lines, full read)
- `app/routes/admin.tsx` (101 lines, full read)
- `app/routes/admin._index.tsx` (21 lines, full read)
- `app/routes/admin.auth.tsx` (10 lines, full read)
- `app/routes/admin.auth.logout.tsx` (14 lines, full read)
- `app/routes/admin.projects.tsx` (39 lines, full read)
- `app/routes/admin.projects._index.tsx` (21 lines, full read)
- `app/routes/admin.projects.new.tsx` (20 lines, full read)
- `app/routes/admin.reviews._index.tsx` (19 lines, full read)
- `app/routes/admin.contact._index.tsx` (20 lines, full read)

### Directory listings
- `app/`, `app/admin/`, `app/components/`, `app/lib/`, `app/routes/`, `app/shared/`, `app/shared/lib/`, `app/shared/swr/`, `app/shared/stores/`, `app/admin/auth/`, `app/admin/auth/api/`, `app/admin/auth/components/`, `app/admin/auth/pages/`, `app/shared/lib/fetch-client/`, `app/components/ui/`, `app/components/global/`, `app/components/cards/`, `openspec/`, `openspec/specs/`, `openspec/changes/`, `openspec/changes/archive/`, `openspec/changes/archive/2026-08-03-auth-fetch-client/`

### NOT read (intentionally)
- `node_modules/`, `bun.lock` (line count only)
- `assets/design/**/screen.png` (already read as images)
- `openspec/changes/archive/2026-08-03-auth-fetch-client/{design,tasks,verify-report,archive-report,specs}.md` (the proposal was enough context for this explore)

---

## Appendix B — out-of-scope reminder

Hard-no for this change (do not add as a task):

- Backend code, devops, CI, deploy configuration
- A new HTTP client, state library, or icon library
- A dark/light theme toggle
- A new locale beyond `en` + `es`
- Server Actions beyond the existing login + logout
- A test runner (Vitest, Playwright) — separate SDD change
- A new dep without a typecheck pass + an entry in `package.json`
- A change to `openspec/specs/http-client/` or `openspec/specs/admin-auth/` — those are LOCKED. The proposal may add NEW specs (e.g. `works-domain`, `reviews-domain`, `contact-domain`, `home-domain`, `i18n`, `theme-tokens`, `navigation-ia`) but must NOT modify the locked ones.
- A change to the auth cookie spec (locked by `openspec/specs/admin-auth/spec.md` REQ-SRV-2 and DESIGN.md §5).

If any of the open questions above require modifying a locked spec, the answer is **"no, add a new spec instead"** — that becomes part of the next SDD change's scope.
