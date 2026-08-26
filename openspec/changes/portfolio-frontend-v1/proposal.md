# Proposal: `portfolio-frontend-v1` — Public Site + Admin v1 Re-Skin

> Slug: `portfolio-frontend-v1`. Status: proposal. Decisions baked in
> from the user round (10 consolidated decisions, see §Approach) plus
> the 24-question disposition (see §Open questions). The explore
> report at `openspec/changes/portfolio-frontend-v1/explore.md` is
> the deep reference; this is the decision record.

## Table of contents

- [Intent](#intent)
- [Capabilities](#capabilities)
- [Scope](#scope)
- [Approach](#approach)
- [Affected areas](#affected-areas)
- [PR slicing preview](#pr-slicing-preview)
- [Cross-references](#cross-references)
- [Risks](#risks)
- [Open questions disposition](#open-questions-disposition)
- [Review budget forecast](#review-budget-forecast)
- [Alternatives considered](#alternatives-considered)
- [Rollback plan](#rollback-plan)
- [Success criteria](#success-criteria)

---

## Intent

The frontend skeleton under `app/` exists, but the **public surface
is a single TODO stub** and the **admin surface is mostly empty**
(only `auth/` is wired from the archived `auth-fetch-client` change).
The design is fully drafted in `assets/design/` (6 mockups — public
home desktop/mobile, works catalog desktop/mobile, admin console
desktop/mobile — plus the Aurelian Grid v2 system document) but none
of it is implemented.

This change closes that gap. It builds the v1 of the portfolio UI
against the screaming-architecture skeleton (`app/{home,works,
contact,admin,shared}/`) per `DESIGN.md` and `AGENTS.md`, wires the
Aurelian design system as a single Tailwind 4 + shadcn theme, stands
up `i18next` with `en` (default, root) and `es` (prefixed `/es/...`)
locales, and fills the `auth` + `projects` admin subdomains. It
consumes — and does not modify — the locked `http-client` and
`admin-auth` capabilities shipped by the archived `auth-fetch-client`
change.

After this lands, a visitor can land on the public home in either
language, browse the works gallery, open a project detail, and send a
real contact message. A signed-in admin can list, create, edit, and
delete portfolio projects. The shared utility surface (`useLocaleStore`,
`useUIStore`, `useToastStore`, `swrKeys`, `cn()` at `app/shared/lib/`)
is in place for the next change to extend.

## Capabilities

### New Capabilities

- `theme-tokens` — Aurelian Grid v2 palette + Hanken Grotesk typography
  + spacing/radius/elevation tokens, wired to Tailwind 4 via the
  shadcn `:root` override in `app/app.css`. Owns the `--rndr-*`
  shorthand retirement (the four declared tokens migrate to semantic
  shadcn tokens).
- `i18n` — `i18next` + `react-i18next` bootstrap in
  `app/shared/i18n/`; one namespace per public area (`common`, `home`,
  `works`, `contact`) plus a single `admin` namespace (en-only); URL
  prefix as the source of truth with a `useLocaleStore` mirror.
- `home-domain` — public home route (`/`, `/es`) with the bento
  composition from `home_juliam_aponte_portfolio/` + an expanded
  About section, responsive to mobile (`home_mobile_juliam_aponte/`).
  Reads featured projects, featured reviews, and the home metrics
  summary via `serverFetch`; renders the home contact CTA as a real
  form that posts to the `/contact` action.
- `works-domain` — public works catalog (`/works`, `/works/:slug`,
  `/es/...`) with **client-side** filter and pagination
  (see Q-17/Q-18 disposition), the 4 project-card variants from
  `project_catalog/`, the full-screen bottom sheet on mobile, and
  the side drawer (desktop) as an in-page preview of the canonical
  `/works/:slug` URL.
- `contact-domain` — public contact route (`/contact`, `/es/contact`)
  with a real form (name, email, subject, message), zod schema in
  `app/contact/schema.ts`, and a server action that posts to
  `POST /api/v1/contacts` via `serverFetch`.
- `admin-projects-domain` — admin projects CRUD:
  `/admin/projects` (list), `/admin/projects/new` (create),
  `/admin/projects/:id` (edit + delete). Forms use the shadcn
  `Field` primitive with a long-form schema (title, slug,
  description, category, hours, status, hero image, gallery).
  Mutations go through `fetcher.submit` to the route's `action`
  which calls `serverFetch`.
- `shared-ui` — atomic-design layer shared across public and admin
  under `app/shared/ui/atoms/` and `app/shared/ui/molecules/`.
  Atoms: `BentoCell`, `MicroLabel`, `GrainOverlay`, `SectionHeading`,
  `IconButton`, `SearchInput`, `FilterChip`, `Tag`, `PaginationButton`,
  `StatNumber`, `StatusBadge`, `Toggle`, `Avatar`, `EmptyState`,
  `ProgressBar`, `Sparkline`. Molecules: `PublicHeader`, `PublicFooter`,
  `BottomNavDock`, `MobileHeader`, `LocaleSwitcher`, `AdminSidebar`,
  `AdminHeader`, `Drawer`, `Pagination`, `MobileTabBar`, `AdminStatCard`.
- `shared-state` — Zustand stores at `app/shared/stores/`:
  `useLocaleStore` (cross-route, mirrors i18next), `useUIStore`
  (mobile menu open, drawer open + slug, mobile admin tab),
  `useToastStore` (toast queue, auto-dismiss).
- `shared-swr-keys` — `swrKeys` registry at `app/shared/swr/keys.ts`
  per `DESIGN.md` §4. Keys mirror REST paths; mutators invalidate by
  the same key.

### Modified Capabilities

- `http-client` — `app/shared/swr/keys.ts` is **new**; `swrFetcher`
  stays the thin wrapper the archived change already shipped. No
  client behavior change. The change ADDS new key exporters; it does
  NOT modify `core`/`serverFetch`/`clientFetch`/`errors`.
- `admin-auth` — the login page at `/admin/auth` is **re-skinned** to
  the Aurelian palette and the existing `useSessionStore` /
  `loginSchema` / login action are unchanged. The
  `openspec/specs/admin-auth/spec.md` spec is NOT modified (locked).
- `api-contract` (the table in `DESIGN.md` §5) — extend the public
  and admin endpoint tables to include the home metrics summary,
  the admin projects stats summary, and the admin reviews + contact
  inbox endpoints. **Add a new row, do not edit locked rows.** If
  the backend's locked specs at
  `../roonder-portfolio-backend/openspec/specs/` drift, the
  frontend is wrong (per `AGENTS.md` "Mirror the backend's locked
  specs") and the drift is fixed in this change.

> `openspec/specs/` currently contains `http-client`, `admin-auth`,
> and `testing-capabilities`. The two new capability specs (theme +
> domain set) are written in the spec phase, not here.

## Scope

### In scope

- Theme override of the shadcn `:root` to the Aurelian obsidian
  palette; retire the four `--rndr-*` tokens; drop the Noto Sans
  font import; keep Hanken Grotesk as the primary body family; keep
  Playfair Display as the optional editorial display accent, mapped
  to a `--font-display` Tailwind token for selective use in hero
  headlines, editorial pull-quotes, and brand micro-labels.
- `i18next` bootstrap with `en` (default, root) and `es` (prefixed
  `/es/...`); one JSON namespace per public area; `useLocaleStore`
  mirror; `setLocale(next)` helper that updates i18next, the store,
  the `lang` cookie, and `document.documentElement.lang`, and
  **navigates to the equivalent path** in the new locale.
- Public i18n surface: home (`/`, `/es`) with bento + About + real
  contact CTA; works catalog (`/works`, `/es/works`) with the 4
  project-card variants; works detail (`/works/:slug`,
  `/es/works/:slug`); contact (`/contact`, `/es/contact`).
- Admin v1 surface: `/admin` (overview) + `/admin/auth` (re-skinned
  login, Aurelian visuals) + `/admin/projects` (list) +
  `/admin/projects/new` + `/admin/projects/:id` (edit/delete).
- Shared utilities: `cn()` at `app/shared/lib/cn.ts` (moved from
  `app/lib/utils.ts`); `swrKeys` at `app/shared/swr/keys.ts`;
  `useLocaleStore`, `useUIStore`, `useToastStore` in
  `app/shared/stores/`.
- Atomic-design component library under `app/shared/ui/atoms/` and
  `app/shared/ui/molecules/`, plus per-area components under
  `app/{home,works,contact,admin/projects}/{atoms,molecules,organisms,
  pages}/`.
- All scaffolds in `app/routes/*.tsx` get real loader/action
  implementations (today every route file is a 10–40 line TODO).
- Contact form as a real submission (name + email + subject + body
  → `POST /api/v1/contacts` via the route's `action`); home contact
  CTA as a real submission to the same endpoint.
- Works catalog client-side filter and pagination (`useState` in
  the page; assumes <50 projects for v1; the explore report flags
  this as a follow-up if the catalog ever exceeds that).
- Locale switch that **navigates to the equivalent path** AND sets
  the `lang` cookie as a side effect. URL prefix remains the source
  of truth per `DESIGN.md` §8.

### Out of scope

- **Backend** — `../roonder-portfolio-backend` is read-only reference
  for shared domain types. No backend code change ships here.
- **DevOps / CI / deploy** — Vercel, Docker, GitHub Actions. The
  pre-render target decision (Vercel ISR vs static at build time) is
  a **separate change** (see Q-21 disposition).
- **Analytics** — Plausible, PostHog, GA. None in `package.json`;
  adding any is a future change.
- **A test runner** — `bun run typecheck` stays the only quality
  gate. Adding Vitest + Playwright is the existing follow-up change
  tracked in `openspec/specs/testing-capabilities.md`.
- **Dark/light theme toggle** — single Aurelian obsidian theme.
  Adding a switcher is a future change.
- **A fourth state library** — no Redux, no Jotai, no MobX. The
  SWR + react-hook-form + zustand + `useState` quartet is the full
  state model.
- **A third locale** — `en` and `es` only.
- **Reviews subdomain** — `/admin/reviews*` and the public review
  form on home are deferred. Contact resolves via the real
  `/contact` form; the admin does not get a contact inbox in v1.
  The route files in `app/routes/admin.reviews*` and
  `app/admin/reviews/` stay as TODO scaffolds.

## Approach

**Screaming architecture, two surfaces.** The `app/` tree keeps the
public / admin split per `DESIGN.md` §2: `app/home/`, `app/works/`,
`app/contact/` are the public surface (each with
`atoms/` → `molecules/` → `organisms/` → `pages/` and a colocated
`api/` + `schema.ts`); `app/admin/projects/` is the v1 admin
subdomain; `app/shared/` holds `ui/`, `i18n/`, `swr/`, `stores/`,
`animation/`, `lib/`. The route files under `app/routes/` are thin
containers that import the page modules from their area; they own
the `loader` and `action` (where applicable) and forward to the
page. AGENTS.md "Screaming Architecture" + "Atomic Design inside each
domain" rules apply without exception.

**Theme override, not a re-skin of shadcn.** Aurelian obsidian and
shadcn `base-sera` light cannot both be served by one
`components.json`. The recipe stays; only the token layer changes.
`app/app.css` `:root` is rewritten to the Aurelian hex values listed
in the explore report's "Tokens the frontend must encode" table;
the existing `@theme inline` block already maps those CSS custom
properties into Tailwind tokens, so the rest of the app picks the
new palette up without changes. The four `--rndr-*` shorthands
(`--rndr-primary`, `--rndr-secondary`, `--rndr-tertiary`,
`--rndr-neutral`) are removed and the two existing usages
(`Navbar.tsx`, `NeuronCard.tsx`, `_public._index.tsx`) migrate to
the semantic shadcn tokens (`text-primary`, `bg-background`,
`text-muted-foreground`). Fonts: drop the `@fontsource-variable/
noto-sans` import; keep `@fontsource/hanken-grotesk` as the primary
body family mapped to `--font-sans`; keep `@fontsource-variable/
playfair-display` as the optional editorial display accent mapped
to a new `--font-display` Tailwind token (and the semantic shadcn
counterpart). The `--font-display` token is opt-in per component
(hero headlines, editorial pull-quotes, brand micro-labels); the
default body remains Hanken Grotesk.

**i18n, one namespace per area.** Per `DESIGN.md` §8, the public
surface ships one JSON file per area per locale
(`app/shared/i18n/locales/{en,es}/{common,home,works,contact}.json`)
plus a single `admin.json` (en-only). The `_public.tsx` layout
loader reads the URL prefix and seeds `useLocaleStore`; a
`setLocale(next)` helper updates i18next, the store, the `lang`
cookie, and `document.documentElement.lang`, and **navigates to
the equivalent path** (Q-11/Q-16 disposition: navigate + cookie
side effect; URL prefix stays the source of truth). The active
locale is mirrored in `useLocaleStore` so non-hook readers
(meta tags, the top-of-page `<html lang>`) can read it.

**Home contact form is a real form.** Both the home CTA ("Initiate
Contact" / "Let's Build.") and the dedicated `/contact` route use
`react-hook-form` + `zodResolver(contactSchema)`, validate on
client, and submit to the `/contact` route's `action` via
`fetcher.submit` (per the locked `http-client` REQ-CORE-2 error
shape, the form renders the typed `ApiError` discriminated union
on failure). On success, a `useToastStore.push({ kind: 'success' })`
renders a localized "Message sent" toast. Throttled (429) and
network errors are rendered inline. Same for the dedicated
`/contact` page.

**Works client-side filter and pagination.** Per Q-17/Q-18, the
works loader fetches the full catalog once (assumes <50 projects
for v1; the explore report flags a server-side follow-up if that
ceases to hold). The page holds `{ query, category, page }` in
`useState`; filtering is `useMemo`-free (Compiler era — see the
`react-19` skill) and pagination is windowed over the filtered
list. SWR with the full-list key is still used for cache
invalidation when an admin publishes a new project. The `/works/:
slug` detail route is the canonical, URL-shareable, SEO-friendly
destination; the side drawer (desktop) and full-screen bottom
sheet (mobile) are **in-page previews** of the same data
(Q-6 disposition).

**Micro-labels, hybrid.** Brand-flourish labels — the uppercase,
tracked `[ Precision Metrics ]`, `[ Client Voices ]`, `PROYECTOS`,
`SOBRE MÍ`, etc. — stay as fixed visual identity. Contextual
labels — form labels, button copy, helper text, validation
messages — go through i18n. The brand micro-labels are an Aurelian
design language, not English content; translating them would
dilute the system. The explore report §"Open questions" Q-9 / Q-10
disposition locks this.

**Shared utilities, no drift.** The existing `cn()` at
`app/lib/utils.ts` is **moved** to `app/shared/lib/cn.ts` and all
imports updated to `~/shared/lib/cn`. The two existing files
(`button.tsx`, `field.tsx`, `login.tsx`, etc.) are touched; the
`app/lib/` directory is removed after the move. The
`swrKeys` registry is created at `app/shared/swr/keys.ts` (the
`swrFetcher` already exists at `app/shared/swr/fetcher.ts` from
the archived change). The new stores live at
`app/shared/stores/{locale,ui,toasts}.ts`. AGENTS.md
"Screaming Architecture" + DESIGN.md §4 rules apply.

**Admin re-skin defaults.** Per Q-2 / Q-5 / Q-14 disposition, the
admin login page is re-skinned to the Aurelian palette (no
behavior change; the locked `admin-auth` spec is untouched). The
admin mobile shows the same data as the desktop — the
`useUIStore.activeAdminTab` slice holds a different presentation,
not a different data set. The public header's "Admin" button
always links to `/admin/auth`; the admin layout's session gate
(`app/routes/admin.tsx` loader) is the one that redirects
authenticated users onward to `/admin`.

## Affected areas

| Area | Impact | Description |
| --- | --- | --- |
| `app/app.css` | **Modified** | Override shadcn `:root` with Aurelian hex; drop the Noto Sans import; keep Playfair Display as `--font-display` (optional editorial accent); retire `--rndr-*` shorthands. |
| `app/root.tsx` | Modified | Mount i18n provider between `<Outlet />` and `<Scripts />`; add `useLocaleStore` hydration step (mirrors the existing `useSessionStore.hydrate` pattern). |
| `app/routes.ts` | None | Already declares the full route table; no edits. |
| `app/routes/_public.tsx` | Modified | Replace `loader` body with i18n init + `useLocaleStore` seed; extend `meta` from the new page-level `meta()` exports. |
| `app/routes/_public._index.tsx` | Modified | Replace TODO with `<HomePage />` import from `app/home/pages/home.tsx`; route `meta()` becomes a re-export. |
| `app/routes/_public.works.tsx` | Modified | Real loader → full-list fetch; render `<WorksPage />` from `app/works/pages/works.tsx`. |
| `app/routes/_public.works.$slug.tsx` | Modified | Real loader → single-project fetch; render `<WorkDetailPage />` from `app/works/pages/work-detail.tsx`. |
| `app/routes/_public.contact.tsx` | Modified | Real `action` → `POST /api/v1/contacts`; render `<ContactPage />` from `app/contact/pages/contact.tsx`. |
| `app/routes/admin.tsx` | None | Already wired (session gate) by archived `auth-fetch-client`. |
| `app/routes/admin._index.tsx` | Modified | Replace TODO with `<AdminOverviewPage />`; loader fetches featured projects + inbox + reviews + stats. |
| `app/routes/admin.auth.tsx` | Modified | Re-skin (Aurelian visuals). Locked `admin-auth` spec unchanged. |
| `app/routes/admin.projects._index.tsx` | Modified | Replace TODO with `<AdminProjectsListPage />`; loader fetches the admin projects list. |
| `app/routes/admin.projects.new.tsx` | Modified | Replace TODO with `<AdminProjectNewPage />` + `action` → `POST /api/v1/admin/projects`. |
| `app/routes/admin.projects.$id.tsx` | Modified | Replace TODO with `<AdminProjectEditPage />` + `action` → `PATCH` / `DELETE`. |
| `app/routes/admin.auth.logout.tsx` | None | Already wired. |
| `app/routes/admin.reviews*` | None | Deferred (out of scope for v1). Stays as TODO scaffold. |
| `app/routes/admin.contact*` | None | Deferred (out of scope for v1). Stays as TODO scaffold. |
| `app/lib/utils.ts` | **Removed** | Moved to `app/shared/lib/cn.ts`; all imports updated; directory deleted after the move. |
| `app/components/global/Navbar.tsx` | **Removed** | Replaced by `PublicHeader` + `MobileHeader` + `BottomNavDock` (reusable). |
| `app/components/cards/NeuronCard.tsx` | **Removed** | Superseded by `BentoCell` atom. |
| `app/components/ui/*` | Modified (additive) | New shadcn primitives added via the `shadcn` MCP: `textarea`, `select`, `dropdown-menu`, `dialog`, `popover`, `switch`, `tabs`, `badge`, `sonner` (toast). |
| `app/home/` | **New** | `atoms/`, `molecules/`, `organisms/`, `pages/`, `api/`, `schema.ts` per the explore report §"Component library plan". |
| `app/works/` | **New** | Same atomic-design layout; includes the 4 project-card variants and the side drawer. |
| `app/contact/` | **New** | `molecules/contact-form.tsx`, `pages/contact.tsx`, `api/contact.ts`, `schema.ts`. |
| `app/admin/projects/` | **New** | `molecules/admin-project-card.tsx`, `molecules/admin-project-form.tsx`, `organisms/projects-list.tsx`, `pages/{list,new,edit}.tsx`, `api/projects.ts`, `schema.ts`. |
| `app/admin/reviews/` | None (deferred) | Route files stay as TODO. |
| `app/admin/contact/` | None (deferred) | Route files stay as TODO. |
| `app/shared/ui/atoms/` | **New** | `BentoCell`, `MicroLabel`, `GrainOverlay`, `SectionHeading`, `IconButton`, `SearchInput`, `FilterChip`, `Tag`, `PaginationButton`, `StatNumber`, `StatusBadge`, `Toggle`, `Avatar`, `EmptyState`, `ProgressBar`, `Sparkline`. |
| `app/shared/ui/molecules/` | **New** | `PublicHeader`, `PublicFooter`, `BottomNavDock`, `MobileHeader`, `LocaleSwitcher`, `AdminSidebar`, `AdminHeader`, `Drawer`, `Pagination`, `MobileTabBar`, `AdminStatCard`. |
| `app/shared/i18n/` | **New** | `index.ts` (i18next init), `locales/en/{common,home,works,contact,admin}.json`, `locales/es/{common,home,works,contact}.json` (no `es/admin.json` per locked decision D8). |
| `app/shared/swr/keys.ts` | **New** | `swrKeys` registry per DESIGN.md §4. |
| `app/shared/swr/fetcher.ts` | None | Already wired by archived `auth-fetch-client`. |
| `app/shared/stores/session.ts` | None | Already wired; not modified. |
| `app/shared/stores/locale.ts` | **New** | `useLocaleStore` (active locale, mirror of i18next). |
| `app/shared/stores/ui.ts` | **New** | `useUIStore` (mobile menu, drawer, mobile admin tab). |
| `app/shared/stores/toasts.ts` | **New** | `useToastStore` (queue, auto-dismiss). |
| `app/shared/lib/cn.ts` | **New** | `cn()` (moved from `app/lib/utils.ts`). |
| `app/shared/lib/cookies.ts` | None | Already wired; `lang` cookie addition only. |
| `app/shared/lib/fetch-client/*` | None | Already wired; consumed, not modified. |
| `app/shared/animation/presets/` | **New** | Motion + animejs presets per DESIGN.md §9 (page transitions, drawer slide, scroll reveal). |
| `app/admin/auth/` | Modified (re-skin only) | Visual refresh to Aurelian palette; no spec or behavior change. |
| `DESIGN.md` | Modified | Add §14 (animation presets), §15 (theme tokens recap), document the `cn()` move and the `app/lib/` removal. |
| `AGENTS.md` | None | Already names the screaming-architecture rules this change implements. |
| `openspec/specs/http-client/spec.md` | None (locked) | Consumed; not modified. |
| `openspec/specs/admin-auth/spec.md` | None (locked) | Consumed; not modified. |

## PR slicing preview

v1 will exceed the **400-line review budget** by an order of
magnitude. The orchestrator's Review Workload Guard (per
`AGENTS.md`) will require a chained split. The proposal previews
the slice shape; `sdd-tasks` finalizes the per-task breakdown.

- **P0 — Foundation (~600–900 lines).** Theme override of
  `app/app.css` to the Aurelian palette; font import cleanup (drop
  Noto Sans; wire Playfair Display to `--font-display`); `cn()` move from `app/lib/utils.ts`
  to `app/shared/lib/cn.ts` (delete `app/lib/`); `i18n` bootstrap
  (locales, namespaces, `useLocaleStore`, `setLocale` helper with
  navigate + cookie side effect); new `swrKeys` registry at
  `app/shared/swr/keys.ts`; `useUIStore` + `useToastStore`; shared
  atoms (`BentoCell`, `MicroLabel`, `GrainOverlay`,
  `SectionHeading`, `IconButton`, `SearchInput`, `FilterChip`,
  `Tag`, `PaginationButton`, `StatNumber`, `StatusBadge`, `Toggle`,
  `Avatar`, `EmptyState`, `ProgressBar`, `Sparkline`); shared
  molecules (`PublicHeader`, `PublicFooter`, `BottomNavDock`,
  `MobileHeader`, `LocaleSwitcher`, `Drawer`, `Pagination`,
  `MobileTabBar`, `AdminSidebar`, `AdminHeader`, `AdminStatCard`).
  No page fills. Reviewable in isolation: the home route can still
  render the existing `Navbar` + `NeuronCard` placeholder under the
  new theme, proving the token override and the font cleanup.
- **P1 — Public surface (~1,200–1,800 lines).** Home page (`/`,
  `/es`) with bento + About + real contact CTA; works catalog
  (`/works`, `/es/works`) with the 4 project-card variants,
  client-side filter, side drawer preview, and the mobile
  carousel; works detail (`/works/:slug`, `/es/works/:slug`) as the
  canonical URL; contact (`/contact`, `/es/contact`) with the real
  form + action. Per-area atoms/molecules/organisms (e.g.,
  `HeroProfileCard`, `MetricsBento`, `SelectedWorksBento`,
  `TestimonialsSplit`, `ContactCTA`, `WorksHero`, `ProjectCard`,
  `ProjectMeta`, `ContactForm`). Animation presets landed in P0
  become useful here (`motion` for the drawer, native CSS for
  hover lifts).
- **P2 — Admin surface (~800–1,200 lines).** Admin overview widget
  (welcome + Active Works stat + 3-card projects + inbox widget
  [if a real `contact-messages` endpoint exists by then] + reviews
  widget [deferred]). Admin projects list (`/admin/projects`),
  new (`/admin/projects/new`), and edit/delete
  (`/admin/projects/:id`) with the long form. Login re-skin to
  Aurelian visuals (the locked `admin-auth` spec is untouched).
  Mobile admin tab bar (Projects / Reviews / Inbox) on small
  viewports.

**Total forecast**: ~2,600–3,900 lines across 50+ new files. The
chained split keeps each PR inside the 400-line budget; the
P0/P1/P2 sequence is staged so P1 can begin as soon as P0 lands
(PRs are stacked, not parallel — P1 imports from P0; P2 imports
from P0 and the public atoms P1 lands).

**Decision needed before apply**: chained PRs (recommended), single
PR with `size:exception` (faster, harder to review), or another
split (e.g., split P1 into "home + contact" and "works + works/:slug").

**400-line budget risk**: **High** for single-PR, **Low** for
chained.

## Cross-references

- **Backend openspec** (read-only reference, the source of truth for
  the contract):
  - `../roonder-portfolio-backend/openspec/specs/auth-domain/spec.md` —
    the canonical admin auth domain. Mirror; do not re-derive.
  - `../roonder-portfolio-backend/openspec/specs/projects-domain/spec.md` —
    the projects CRUD endpoints. This change consumes them.
  - `../roonder-portfolio-backend/openspec/specs/reviews-domain/spec.md` —
    deferred (out of scope for v1).
  - `../roonder-portfolio-backend/openspec/specs/contact-domain/spec.md` —
    the public `POST /api/v1/contacts` and the admin inbox (the
    inbox side is deferred for v1).
- **Locked frontend specs** (consumed, NOT modified):
  - `openspec/specs/http-client/spec.md` — the unified fetch client.
    This change extends `swrKeys` and consumes the client; it does
    not touch `core` / `serverFetch` / `clientFetch` / `errors`.
  - `openspec/specs/admin-auth/spec.md` — the session store, login,
    logout, session gate, `next` sanitization. This change re-skins
    the login page to the Aurelian palette; the spec is NOT
    modified.
- **Sibling docs**:
  - `DESIGN.md` — screaming-architecture tree, data flow, animation
    matrix, i18n rules, API contract summary. Drift fix in scope.
  - `AGENTS.md` — locked-spec mirroring rule, atomic design,
    state model, anti-patterns. No change.
  - `assets/design/aurelian_grid_v2/DESIGN.md` — the design system
    the theme override encodes. Source of truth for the tokens.
  - `assets/design/*/{code.html,screen.png}` — the 6 mockups the
    components are built against.

## Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| **R-theme** — Aurelian obsidian vs shadcn `base-sera` light; tokens need to be re-bound or the shadcn primitives render light on dark with the wrong contrast. | Med | Override `:root` in one file (`app/app.css`); keep the shadcn recipes untouched; the `@theme inline` block (lines 56–103) already maps the variables into Tailwind tokens. Visual diff against the 6 mockups in `assets/design/*/screen.png` during verify. |
| **R-font** — Dropping Noto Sans (Playfair Display is kept as `--font-display`); any pre-existing string that depends on Noto Sans breaks. | Low | None of the existing components reference Noto Sans explicitly (confirmed by reading `Navbar.tsx`, `NeuronCard.tsx`, `_public._index.tsx`, and `app.css`). Playfair Display is preserved (only its import is kept; the `--font-display` token is new). Safe to land in P0. |
| **R-size** — v1 implementation is ~2,600–3,900 lines across 50+ new files; far over the 400-line budget. | High | P0/P1/P2 chained PR split (see §PR slicing preview). Each PR is inside the budget. The orchestrator's Review Workload Guard enforces this. |
| **R-i18n-bootstrap** — `i18next` is a dep but not wired. The `// TODO when wiring react-i18next` in `_public.tsx:9` is the entry point. Without it, all keys render as raw `home.hero.headline` strings. | Med | P0 names this as the first task. The P0 deliverable is the entire i18n infrastructure; the public routes in P1 are the proof it works. |
| **R-no-test-runner** — No Vitest, no Playwright; no safety net for the i18n keys, the theme re-skin, or the contact form. | Med | `bun run typecheck` is the only automated gate (locked by `openspec/specs/testing-capabilities.md`). Manual smoke per route during verify. Adding a runner is the existing follow-up SDD change. |
| **R-backend-mirror** — If a backend spec drifts (renamed endpoint, new cookie attribute, new error kind), the frontend is wrong. Per `AGENTS.md` "Mirror the backend's locked specs", the frontend catches the drift. | Med | Read `../roonder-portfolio-backend/openspec/specs/` at the start of the design phase; flag any drift and fix it in this change. |
| **R-no-prerender-target** — `DESIGN.md` §13 leaves the pre-render target open. The v1 home + works + works/:slug are SEO-critical and benefit from pre-rendering. | Low | Q-21 disposition: deferred to a separate change. P0/P1/P2 ship with SSR; the next change adds pre-render config to `react-router.config.ts`. |
| **R-shared-cn-location** — Two `cn()` definitions (`app/lib/utils.ts` vs `app/shared/lib/cn.ts` per `DESIGN.md` §7) could drift if not consolidated in P0. | Low | P0 moves the file, updates every import, deletes `app/lib/`. Single source. |

## Open questions disposition

| Q | Topic | Disposition |
| --- | --- | --- |
| Q-1 | Theme conflict resolution | **Resolved.** Override shadcn `:root` with Aurelian; keep recipes; drop `--rndr-*`. |
| Q-2 | Admin `/admin/auth` re-skin | **Resolved.** Re-skin to Aurelian visuals in P2. Behavior + spec unchanged. |
| Q-3 | Home review form (`POST /api/v1/reviews`) | **Deferred (out of scope).** Reviews subdomain is out of scope for v1. Home contact CTA is the only public form. |
| Q-4 | About section on home | **Resolved.** Add an expanded About bento in P1. |
| Q-5 | Mobile vs desktop admin data parity | **Resolved.** Same data; responsive layout. `useUIStore.activeAdminTab` holds the active tab, not a different fetch. |
| Q-6 | Drawer vs `/works/:slug` route | **Resolved.** `/works/:slug` is canonical (URL-shareable, SEO). Drawer is in-page preview. |
| Q-7 | Home "Initiate Contact" CTA | **Resolved.** Real form (name, email, message, submit) in P1. Schema + action + validation. Posts to the `/contact` action. |
| Q-8 | Brand spelling "Juliam" vs "Julia" | **Resolved.** "Juliam Aponte" is canonical (per user Q5 confirmation, ronda 1: "La marca es 'Juliam Aponte', y mi seudónimo de desarrollador es 'Roonder'"). "Julia Aponte" in the design is a typo to be fixed in P1. i18n keys: `common.brand.name` = "Juliam Aponte"; `common.brand.handle` = "Roonder" (the dev pseudonym per user Q5). |
| Q-9 | Desktop home micro-label "Atmósfera Dinámica" | **Resolved (hybrid).** Brand-flourish micro-labels stay as fixed visual identity; contextual labels go to i18n. |
| Q-10 | Mobile home micro-label "Technical Strategist" | **Resolved (hybrid).** Same as Q-9. |
| Q-11 | Locale switch behavior | **Resolved.** NAVIGATE to the equivalent path AND set the cookie as a side effect. URL prefix is the source of truth. |
| Q-12 | Home metrics + admin stats endpoints | **To spec.** Confirm `GET /api/v1/home/metrics` and `GET /api/v1/admin/projects/stats` against the backend's `home-domain` and `projects-domain` specs. If they don't exist, v1 hardcodes the numbers and the backend ships a follow-up. |
| Q-13 | SWR keys mirror backend paths | **To design.** Cross-check `swrKeys` against `../roonder-portfolio-backend/openspec/specs/` in the design phase. Flag any drift. |
| Q-14 | Public header "Admin" button target | **Resolved.** Always `/admin/auth`; the admin layout gate (already wired by `auth-fetch-client`) redirects to `/admin` once the session is valid. |
| Q-15 | Icon set (Material Symbols vs `lucide-react`) | **Resolved.** `lucide-react` (already in `components.json`; per-icon migration map is part of P0). |
| Q-16 | Locale switch cookie behavior | **Resolved.** Same as Q-11. |
| Q-17 | Works pagination (server vs client) | **Resolved.** Client-side. Full-list fetch in the loader; `useState` filter + windowed pagination. Assumes <50 projects for v1. |
| Q-18 | Works search | **Resolved.** Client-side. Same as Q-17. |
| Q-19 | Home review form submission target | **Deferred (out of scope).** Same as Q-3. |
| Q-20 | Admin "Reviews" widget | **Deferred (out of scope).** Same as Q-3. |
| Q-21 | Pre-render target (Vercel ISR vs static) | **Deferred to a separate change.** P0/P1/P2 ship with SSR. A follow-up change adds the pre-render config to `react-router.config.ts` and the deploy pipeline. |
| Q-22 | No fourth state library | **Resolved.** Confirmed. SWR + react-hook-form + zustand + `useState` is the full state model. |
| Q-23 | No test runner | **Resolved.** `bun run typecheck` only for v1. Adding Vitest + Playwright is the existing follow-up change. |
| Q-24 | No third locale | **Resolved.** `en` and `es` only. |

## Review budget forecast

| Area | Lines |
| --- | --- |
| `app/app.css` (theme override + font cleanup) | 40–60 |
| `app/shared/lib/cn.ts` + import updates + `app/lib/` removal | 30–50 |
| `app/shared/i18n/` (init + 9 JSON files) | 200–280 |
| `app/shared/stores/{locale,ui,toasts}.ts` | 90–130 |
| `app/shared/swr/keys.ts` | 40–60 |
| `app/shared/ui/atoms/*` (16 atoms) | 320–480 |
| `app/shared/ui/molecules/*` (11 molecules) | 360–520 |
| `app/shared/animation/presets/*` | 60–100 |
| `app/home/` (full atomic-design tree + page + API + schema) | 400–600 |
| `app/works/` (full atomic-design tree + 3 pages + API) | 500–800 |
| `app/contact/` (form + page + action + API + schema) | 120–200 |
| `app/admin/projects/` (list + new + edit + form + API + schema) | 400–600 |
| `app/admin/auth/` (re-skin only) | 40–80 |
| `app/routes/*.tsx` (10 real implementations) | 250–380 |
| `DESIGN.md` drift fix | 10–20 |
| **Total** | **~2,860–4,360** |

This is **definitively over the 400-line review budget**. The
P0/P1/P2 chained split (see §PR slicing preview) keeps each PR
inside the budget.

## Alternatives considered

- **Re-do the shadcn install with a custom `components.json`** —
  rejected: heavier (full reinstall, full re-audit of every
  primitive); the `One shadcn style, one base color` rule makes a
  second registry a non-starter.
- **Server-side works filter (`?q=…&category=…&page=…`)** — rejected
  for v1: the explore report says <50 projects is the assumption,
  and the URL-shareable detail route already covers the deep-link
  use case. The loader fetches the full list once; SWR is the cache.
  If the catalog ever exceeds ~50 projects, this becomes a follow-up.
- **Material Symbols Outlined icon font** (per the mockups) —
  rejected: `lucide-react` is already in `components.json`; a second
  icon library violates the "one icon library" rule. The per-icon
  migration map is part of P0.
- **Reviews subdomain in scope** — rejected: the user disposition
  explicitly defers reviews and the contact inbox. Including them
  would push v1 well past 4,000 lines and add a moderation surface
  with no current requirement.
- **Add a test runner in the same change** — rejected: the testing
  follow-up is its own SDD change (tracked in
  `openspec/specs/testing-capabilities.md`). Mixing the two would
  bloat P0 past 900 lines.
- **Pre-render target decision (Q-21) in this change** — rejected:
  the decision is platform-coupled (Vercel ISR vs static at build
  time) and is its own scoped change. P0/P1/P2 ship with SSR; the
  pre-render config lands in the follow-up.

## Rollback plan

The public surface is a **from-scratch build** (the `app/` skeleton
is mostly empty for public routes — only `Navbar.tsx`,
`NeuronCard.tsx`, and the one-line TODO in `_public._index.tsx`
exist). The admin surface is a **re-skin + page fills** on top of
the locked `auth-fetch-client` change.

**Per-PR rollback (each PR is independently revertible):**

- **P0 rollback** — `git revert` of the P0 commit. Restores the
  light shadcn theme (the `app.css` override is removed), restores
  the Noto Sans import (Playfair Display was kept, no restore needed), restores `app/lib/`
  with `cn()` (and updates the three callers back to `~/lib/utils`),
  removes the new `app/shared/{i18n,stores/locale,stores/ui,
  stores/toasts,swr/keys,ui/atoms,ui/molecules,animation}/`
  directories. The `Navbar` and `NeuronCard` placeholders stay
  (they were already there). The home route still renders under
  the old theme.
- **P1 rollback** — `git revert` of the P1 commit. Removes
  `app/{home,works,contact}/` and the P1 entries in `app/routes/`
  (`_public._index`, `_public.works`, `_public.works.$slug`,
  `_public.contact`). The P0 atoms and molecules stay (P2 needs
  them). The public home route falls back to the P0 placeholder.
- **P2 rollback** — `git revert` of the P2 commit. Removes
  `app/admin/projects/` and reverts the P2 entries in `app/routes/`
  (`admin._index`, `admin.projects._index`, `admin.projects.new`,
  `admin.projects.$id`). The P2 re-skin of `/admin/auth` is
  reverted to the pre-P2 visuals. The locked `auth-fetch-client`
  admin gate and session store are untouched; the admin still
  works, just without the projects CRUD and without the Aurelian
  login visuals.

**Cross-project rollback**: no backend change ships in this change.
The `../roonder-portfolio-backend` repo is read-only here; there is
nothing to revert on the backend.

**If a PR has already merged and caused a regression**: `git revert
-m 1 <merge-commit>` per PR, or `git reset --hard <pre-P0-sha>` if
the entire change needs to come out. The pre-P0 `app/` state is
recoverable from the locked `auth-fetch-client` archive.

## Success criteria

- [ ] `bun run typecheck` passes (sole automated gate).
- [ ] `bun run build` passes.
- [ ] P0 lands first and is reviewable in isolation (home route
      renders the new theme under the existing `Navbar` + `NeuronCard`
      placeholders; i18n infrastructure is exercised by a single
      `t('home.hero.headline')` in a test route).
- [ ] P1 lands second and renders the public home in both `en`
      and `es`, the works catalog with client-side filter, the
      works detail page, and the real contact form.
- [ ] P2 lands third and the admin can sign in, list projects,
      create a project, edit it, and delete it.
- [ ] `app/app.css` `:root` is overridden to the Aurelian obsidian
      palette; the four `--rndr-*` shorthands are gone; the Noto Sans
      import is removed; Hanken Grotesk remains as the primary
      `--font-sans`; Playfair Display remains as the optional
      `--font-display` (editorial accent).
- [ ] `app/lib/` is deleted; `cn()` lives at `app/shared/lib/cn.ts`;
      no second copy exists.
- [ ] `useLocaleStore`, `useUIStore`, `useToastStore` exist at
      `app/shared/stores/`; the session store at
      `app/shared/stores/session.ts` is unchanged from the archived
      `auth-fetch-client` change.
- [ ] `swrKeys` exists at `app/shared/swr/keys.ts`; every key
      mirrors a backend REST path; no transformation in the fetcher.
- [ ] i18n namespaces (`common`, `home`, `works`, `contact` in `en`
      + `es`; `admin` in `en` only) ship with the full key set
      captured in the explore report.
- [ ] Locale switch navigates to the equivalent path AND sets the
      `lang` cookie; URL prefix is the source of truth per
      `DESIGN.md` §8.
- [ ] Works catalog is client-side filter + pagination; the loader
      fetches the full list once.
- [ ] Home contact CTA and `/contact` route are real forms
      (`react-hook-form` + `zodResolver`); submission via
      `fetcher.submit` to the route's `action`; success renders a
      localized toast.
- [ ] All 24 open questions are dispositioned (see §Open questions
      disposition); Q-21 is flagged as a follow-up change.
- [ ] Locked specs `http-client` and `admin-auth` are not modified.
- [ ] No `useMemo` / `useCallback` / `React.memo` introduced
      (Compiler era per the `react-19` skill).
- [ ] No `var(--*)` in `className` (per the `tailwind-4` skill).
- [ ] Zero new runtime dependencies in `package.json` — the change
      uses what's already there (`i18next`, `react-i18next`,
      `lucide-react`, `motion`, `animejs`, `swr`, `zustand 5`,
      `react-hook-form`, `zod`).
- [ ] Manual smoke checklist per route in the verify phase
      (covered in the verify report, not here).
