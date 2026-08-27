# works-domain — Locked Spec

> Status: **locked** (promoted from `portfolio-frontend-v1` delta, archived 2026-08-27).
> Capability: `works-domain`.
> Source of truth: `openspec/changes/portfolio-frontend-v1/proposal.md` (corrected) §Approach "Works client-side filter and pagination" + `assets/design/project_catalog/{code.html,screen.png}` and `assets/design/project_catalog_mobile/{code.html,screen.png}`.
> Consumed locked specs: `openspec/specs/http-client/spec.md` (REQ-CORE-2 error envelope, REQ-SVR-1/REQ-SRV-2/REQ-SRV-3 server fetch, REQ-SWR-1/REQ-SWR-2).
> Cross-references: backend `../roonder-portfolio-backend/openspec/specs/projects-domain/spec.md` (the `GET /api/v1/projects` and `GET /api/v1/projects/:slug` contracts).

## Purpose

The public works catalog at `/works` and the works detail at `/works/:slug` are the second-largest surfaces after the home. Today `app/routes/_public.works.tsx` and `app/routes/_public.works.$slug.tsx` are 21-line scaffolds. This delta fills them with the catalog from `project_catalog/` (4 project-card variants, search, filter chips, pagination) plus the detail page (canonical URL-shareable destination). The loader fetches the full project list ONCE (per Q-17/Q-18 client-side filter and pagination; assumes <50 projects for v1); the page holds `{ query, category, page }` in `useState` and filters in memory. The catalog offers a side drawer (desktop) and a full-screen bottom sheet (mobile) as in-page previews of the canonical `/works/:slug` URL (per Q-6: BOTH ship; the route is canonical, the drawer is a UX enhancement). The detail page renders the full hero, body, gallery, and related projects.

## Requirements

### REQ-WORKS-1: Catalog loader fetches the full list

The system SHALL provide a loader at `app/routes/_public.works.tsx` that calls `serverFetch('GET /api/v1/projects?isPublished=true&pageSize=100')` to fetch the full published list in one round-trip (per the backend's `projects-domain` spec, `pageSize` is capped at 100, so a v1 catalog of <50 projects fits in a single page). The loader returns the full list typed by `app/works/api/schema.ts`; on non-2xx, the loader throws the typed `ApiError` per locked `http-client` REQ-CORE-2 and the route's `ErrorBoundary` renders the failure UI.

#### Scenario: Happy path returns the list

- GIVEN the backend returns 200 with `{ data: Project[50], total: 50, page: 1, pageSize: 100 }`
- WHEN the loader returns
- THEN the data shape is `{ projects: Project[] }` (the envelope's `data` is unwrapped) AND the page renders all 50 cards

#### Scenario: 500 surfaces the error boundary

- GIVEN the backend returns 500
- WHEN the loader runs
- THEN it throws `ApiError { kind: 'server' }` AND the route's `ErrorBoundary` renders the retry UI

### REQ-WORKS-2: Client-side filter and pagination in `useState`

The system SHALL render the catalog page with three pieces of client-only state held in `useState`: `query: string` (the search input), `category: 'all' | Category` (the filter chip), and `page: number` (1-indexed). Filtering and pagination are PURE — no `useMemo` / `useCallback` (per `react-19` skill, the React Compiler handles stable references). The filtered + paginated list is derived inline at the top of the page component.

#### Scenario: Search filters by title and description

- GIVEN the user types `monolith` into the search input
- WHEN the page re-renders
- THEN only projects whose title OR description includes `monolith` (case-insensitive) are visible AND the pagination count updates

#### Scenario: Category filter narrows the list

- GIVEN the user clicks the `Architecture` filter chip
- WHEN the page re-renders
- THEN only projects tagged `architecture` are visible AND the filter chip is visually active (per the design)

#### Scenario: Combined query + category

- GIVEN the user types `quantum` AND selects `FinTech`
- WHEN the page re-renders
- THEN only projects matching BOTH conditions are visible

#### Scenario: Pagination is windowed

- GIVEN the filtered list has 24 projects AND the page size is 8
- WHEN the user is on page 1
- THEN 8 cards render AND the pagination shows `1 2 3` (next is enabled, prev is disabled)

### REQ-WORKS-3: Four project-card variants

The system SHALL render four variants of the project card per `project_catalog/code.html`: (1) **Featured** (`col-span-2` desktop, full-bleed mobile): large image cover with gradient overlay, category + hours + title + description + `View Details` hover CTA, height 480px; (2) **Compact** (`col-1` desktop): image with `mix-blend-luminosity` that goes to `mix-blend-normal` on hover, category + hours + title + description; (3) **Data-viz** (`col-1` desktop): SVG circle composition (no image), 75% complete progress bar, category + hours; (4) **Split** (`col-span-2` desktop): image left (1/2), text right (1/2) with absolute `04` giant watermark, progress bar. The 4 variants are sourced from the design; the page picks the variant per card based on the card's position in the layout (the design hardcodes variant 1 for the first card, variant 4 for the fourth, etc.).

#### Scenario: Featured variant renders the 480px hero card

- GIVEN the catalog has a featured project
- WHEN the page renders
- THEN the first card uses the Featured variant (large image, gradient overlay, `View Details` hover CTA)

#### Scenario: Compact variant renders the standard 480px card

- GIVEN the catalog has standard projects
- WHEN the page renders
- THEN the second and third cards use the Compact variant (image with `mix-blend-luminosity`)

### REQ-WORKS-4: Side drawer (desktop) and bottom sheet (mobile) as in-page previews

The system SHALL render a side drawer on desktop viewports (≥ 768px) and a full-screen bottom sheet on mobile viewports (< 768px) when the user clicks a project card. The drawer / bottom sheet shows the same content as the canonical `/works/:slug` page (hero image, title, category, hours, body, gallery) but is rendered inline as a preview. Clicking the drawer's `View Live Project` button (or the bottom sheet's equivalent) navigates to the canonical `/works/:slug` URL. Closing the drawer (X button, ESC key, or backdrop click) returns the user to the catalog with the same filter / search / page state.

> **Q-6 disposition (BOTH ship)**: the route is canonical; the drawer is a UX enhancement that lets visitors preview a project without leaving the catalog.

#### Scenario: Desktop click opens the side drawer

- GIVEN the viewport is ≥ 768px
- WHEN the user clicks a project card
- THEN a right-side drawer slides in (max-w-2xl, `bg-surface`, cubic-bezier(0.16,1,0.3,1) 500ms) AND the catalog behind is dimmed by `bg-surface-container-lowest/80 backdrop-blur-sm`

#### Scenario: Mobile click opens the bottom sheet

- GIVEN the viewport is < 768px
- WHEN the user clicks a project card
- THEN a full-screen bottom sheet slides up (`translate-y-full` → `translate-y-0` with cubic-bezier(0.32,0.72,0,1) 500ms; 50vh hero image; bottom card with `rounded-t-[32px]` and a handle bar)

#### Scenario: Drawer close preserves catalog state

- GIVEN the user has `query = "monolith"` AND `page = 2` AND the drawer is open
- WHEN they close the drawer (X button, ESC, or backdrop)
- THEN the catalog re-renders with `query = "monolith"` AND `page = 2` preserved

### REQ-WORKS-5: `/works/:slug` is the canonical URL

The system SHALL provide a loader at `app/routes/_public.works.$slug.tsx` that calls `serverFetch('GET /api/v1/projects/:slug')` and returns the single project. The detail page SHALL render the full hero, body, gallery, and (optionally) related projects per `project_catalog/`'s `code.html:148-194`. The route MUST be the canonical, URL-shareable, SEO-friendly destination; the drawer is a preview, not a replacement.

#### Scenario: Detail page renders the full project

- GIVEN the URL is `/works/the-monolith-pavilion` AND the backend returns the project
- WHEN the page renders
- THEN the hero image, title, category, hours, body, gallery, and `Launch Live Experience` CTA are all visible AND the page is deep-linkable (the URL is shareable)

#### Scenario: 404 from the backend renders the not-found UI

- GIVEN the URL is `/works/does-not-exist` AND the backend returns 404
- WHEN the loader runs
- THEN it throws the 404 response AND the route's `ErrorBoundary` (or React Router's `notFound`) renders a "Project not found" page

### REQ-WORKS-6: SWR keys mirror the REST path

The system SHALL register `swrKeys.works.list` (returns the full list URL, optionally with the `?isPublished=true&pageSize=100` query string) and `swrKeys.works.bySlug(slug)` (returns `/api/v1/projects/${slug}`) at `app/shared/swr/keys.ts`. The catalog page and the detail page MUST use the same keys, so a successful `mutate(swrKeys.works.list())` after an admin publish invalidates every open catalog tab.

#### Scenario: Admin publish invalidates the catalog cache

- GIVEN an admin publishes a new project
- WHEN `mutate(swrKeys.works.list())` is called from the admin's success handler
- THEN any open `/works` tab revalidates the full list (per locked `http-client` REQ-SWR-2)

### REQ-WORKS-7: Meta tags and hreflang for en/es

The system SHALL export a `meta()` function from BOTH the catalog route and the detail route that returns: a `title` (per locale, e.g. `Works — Roonder Portfolio` / `Proyectos — Roonder Portfolio`); a `description` (per locale, sourced from `works.meta.description` or from the project's own description on the detail page); a `link rel="canonical"` pointing to the current URL in the active locale; and `link rel="alternate" hreflang="en"` and `hreflang="es"` entries pointing to the same page in the other locale.

#### Scenario: en catalog advertises the es alternate

- GIVEN the URL is `/works`
- WHEN the page renders
- THEN the `<head>` contains `<link rel="canonical" href="https://…/works">` AND `<link rel="alternate" hreflang="es" href="https://…/es/works">`

#### Scenario: Detail page canonicalizes to the en URL

- GIVEN the URL is `/es/works/the-monolith-pavilion`
- WHEN the page renders
- THEN the canonical link is `https://…/works/the-monolith-pavilion` (NOT the `/es/...` variant — the canonical is the unprefixed default-locale URL) AND the `<link rel="alternate" hreflang="es">` points to `https://…/es/works/the-monolith-pavilion`

### REQ-WORKS-8: 50-project cap (forward-looking)

The system SHALL assume the v1 catalog has <50 projects (per the proposal's open question Q-17 disposition). The full-list fetch in REQ-WORKS-1 respects the backend's `pageSize` cap of 100. If the catalog ever exceeds 100 projects, the design phase MUST recommend a follow-up SDD change to switch to server-side pagination (URL `?page=…&pageSize=…`); this spec does NOT pre-implement that switch.

#### Scenario: Under the cap

- GIVEN the catalog has 50 published projects
- WHEN the loader runs
- THEN one fetch returns all 50

#### Scenario: At the cap (follow-up is required beyond this)

- GIVEN the catalog exceeds 100 published projects
- WHEN the loader runs
- THEN `pageSize` is silently capped at 100 by the backend (per `projects-domain` Requirement: Public Project List) AND the user sees only the first 100 — a follow-up SDD change MUST switch the catalog to server-side pagination

## Cross-references

- **Locked frontend** (consumed, not modified): `openspec/specs/http-client/spec.md` (REQ-CORE-1, REQ-CORE-2, REQ-SVR-1, REQ-SRV-2, REQ-SRV-3, REQ-SWR-1, REQ-SWR-2).
- **Backend** (read-only, mirror the contract): `../roonder-portfolio-backend/openspec/specs/projects-domain/spec.md` — Requirement: Public Project List (the `GET /api/v1/projects` envelope `{ data, total, page, pageSize }`) + Requirement: Public Project Detail by Slug (the `GET /api/v1/projects/:slug` 200/404 contract).
- **i18n keys**: `works.hero.*`, `works.filter.*`, `works.card.*`, `works.pagination.*`, `works.drawer.*` (see `openspec/changes/portfolio-frontend-v1/specs/i18n/spec.md` REQ-I18N-2 for the file layout and the explore report §"i18n namespace plan" for the full key table).
- **Proposal**: `openspec/changes/portfolio-frontend-v1/proposal.md` §Capabilities "works-domain" + Q-6, Q-17, Q-18 dispositions.

## Out of scope

- **Server-side filter / pagination.** Q-17/Q-18 are resolved as client-side for v1; the loader fetches the full list once. A follow-up SDD change adds server-side filter when the catalog exceeds ~50 projects.
- **A search backend (Algolia, Meilisearch, etc.).** Search is in-memory.
- **Optimistic UI on the catalog.** The catalog is read-only for visitors; no writes happen from this surface.
- **Tag-based filtering beyond the four `Category` chips in the design.** The design defines `All Works`, `Web Dev`, `UI/UX`, `Architecture` (desktop) and `Editorial`, `Digital Experience`, `Brand Identity`, `Art Direction` (mobile). The `app/works/schema.ts` may use different `Category` strings on the frontend if the backend's `tags` array uses free-form strings — the spec defers that mapping to the design phase.
