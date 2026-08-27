# admin-projects-domain — Delta Spec

> Change: `portfolio-frontend-v1`. Status: spec.
> Capability: `admin-projects-domain` (new — see proposal §Capabilities → "New Capabilities").
> Source of truth: `openspec/changes/portfolio-frontend-v1/proposal.md` (corrected) §Approach "Screaming architecture, two surfaces" + the admin mockups at `assets/design/admin_console/{code.html,screen.png}` and `assets/design/admin_console_mobile/{code.html,screen.png}`.
> Consumed locked specs: `openspec/specs/admin-auth/spec.md` (REQ-GATE-1/REQ-GATE-2/REQ-GATE-3 session gate, REQ-SES-1/REQ-SES-2/REQ-SES-3/REQ-SES-4 store, REQ-LOG-1/…/REQ-LOG-6 login, REQ-LO-1/REQ-LO-2 logout, REQ-NEXT-1 `next` sanitization); `openspec/specs/http-client/spec.md` (REQ-CORE-2 error envelope, REQ-CLI-1/REQ-CLI-2 client fetch).
> Cross-references: backend `../roonder-portfolio-backend/openspec/specs/projects-domain/spec.md` (the canonical source of truth for the `GET /api/v1/projects`, `POST /api/v1/projects`, `PATCH /api/v1/projects/:id`, `DELETE /api/v1/projects/:id` contracts and the `project_urls` DIFF semantics); backend `../roonder-portfolio-backend/openspec/specs/auth-domain/spec.md` (the `JwtAuthGuard` contract — method-level, never global).

## Purpose

The admin projects subdomain is one of two v1 admin subdomains (`auth` ships in the archived `auth-fetch-client` change; `projects` ships here; `reviews` and the contact inbox are deferred per Q-3/Q-20). It contains three routes — list (`/admin/projects`), create (`/admin/projects/new`), edit + delete (`/admin/projects/:id`) — backed by the locked `projects-domain` capability on the backend. The session gate is wired by the archived change (per locked `admin-auth` REQ-GATE-1/REQ-GATE-2/REQ-GATE-3); this delta only fills the route bodies, the long form, the action, the SWR cache, and the mobile tab bar (Projects / Reviews placeholder / Inbox placeholder). The admin login page is re-skinned to the Aurelian palette (per Q-2), but the locked `admin-auth` spec is untouched.

> **DRIFT NOTE (admin overview + admin projects stats endpoints)**: the proposal's Q-12 disposition flags `GET /api/v1/admin/projects/stats` (and `GET /api/v1/home/metrics` for the home, see `home-domain` REQ-HOME-8) as endpoints to confirm against the backend. The backend's `projects-domain` capability today does NOT include a `/stats` endpoint. The design phase confirms; if the endpoint does not exist by P2, the active-works stat card on the admin overview hardcodes the count (with a `// TODO(admin-projects): wire to live stats` comment) and a follow-up SDD change adds the live fetch.

## Requirements

### REQ-ADM-1: List route (`/admin/projects`)

The system SHALL provide a route at `app/routes/admin.projects._index.tsx` with a loader that calls `serverFetch('GET /api/v1/admin/projects?page=<n>&pageSize=20&status=<s>')` (the admin list endpoint, behind the `JwtAuthGuard` per the locked `projects-domain` Requirement: Admin Project Create — same guard pattern). The loader MUST respect the `status` filter (`published` / `draft` / `all`) and the `page` query param from the URL. The page SHALL render an `AdminProjectsListPage` organism composed of an `AdminHeader`, a page title + `New Project` CTA, a filter row (status chips), and a grid of `AdminProjectCard` atoms (image + status badge + Edit / Delete buttons per the design at `admin_console/code.html:33-94`).

#### Scenario: Happy path renders the list

- GIVEN the admin session is valid AND the backend returns 200 with `{ data: Project[20], total: 24, page: 1, pageSize: 20 }`
- WHEN the loader returns AND the page renders
- THEN the page shows 20 project cards AND a pagination control AND a `New Project` CTA linking to `/admin/projects/new`

#### Scenario: 401 from the admin endpoint redirects to login

- GIVEN the admin session is expired AND the backend returns 401
- WHEN the loader runs
- THEN it throws `redirect('/admin/auth?next=' + encodeURIComponent('/admin/projects'))` per the locked `admin-auth` REQ-GATE-2

#### Scenario: status filter narrows the list

- GIVEN the user clicks the `Draft` filter chip
- WHEN the page re-renders
- THEN the URL query becomes `?status=draft` AND the loader re-runs with `status=draft` AND only draft projects are shown

### REQ-ADM-2: Create route (`/admin/projects/new`)

The system SHALL provide a route at `app/routes/admin.projects.new.tsx` that renders an `AdminProjectForm` molecule bound to the create schema (REQ-ADM-4) and posts to the route's `action`. The `action` SHALL call `serverFetch('POST /api/v1/admin/projects', { body: parsed })` and, on 201, SHALL `mutate(swrKeys.admin.projects.list())` AND redirect to `/admin/projects/:newId` (the edit page for the newly created project).

#### Scenario: Happy path creates and redirects

- GIVEN the user fills the form with valid values
- WHEN the action runs
- THEN the backend returns 201 with the new project AND the action calls `mutate(swrKeys.admin.projects.list())` AND `redirect('/admin/projects/' + newId)`

#### Scenario: 409 on duplicate slug

- GIVEN a project with `slug = 'portfolio-app'` already exists
- WHEN the user submits a new project with the same `slug`
- THEN the action returns the typed 409 error (per locked `http-client` REQ-CORE-2 mapping 409 to a `conflict`-like branch) AND the form shows the slug error inline

#### Scenario: 400 with field errors shows them per field

- GIVEN the backend returns 400 with `fieldErrors: { title: ['must be a non-empty string'] }`
- WHEN the action returns
- THEN the `title` field shows the message

### REQ-ADM-3: Edit + delete route (`/admin/projects/:id`)

The system SHALL provide a route at `app/routes/admin.projects.$id.tsx` that: (a) the `loader` calls `serverFetch('GET /api/v1/admin/projects/:id')` and pre-populates the `AdminProjectForm`; (b) the `action` supports `PATCH` (via a regular submit) and `DELETE` (via a confirm modal); on PATCH 200, the action calls `mutate(swrKeys.admin.projects.list())` AND `mutate(swrKeys.admin.projects.byId(id))` AND redirects to `/admin/projects`; on DELETE 204, the action calls `mutate(swrKeys.admin.projects.list())` AND redirects to `/admin/projects`.

> **NOTE**: the form below is a single React Router `<Form>` that submits to the same route. PATCH vs DELETE is dispatched by a `_method` field in the `FormData` (the standard React Router 8 pattern). The action inspects `_method` and calls the matching `serverFetch`.

#### Scenario: Edit happy path saves and redirects

- GIVEN the user edits a project's title
- WHEN the action runs
- THEN the backend returns 200 with the updated project AND the action invalidates both SWR keys AND `redirect('/admin/projects')`

#### Scenario: Delete requires confirm

- GIVEN the user clicks the `Delete` button
- WHEN the click is handled
- THEN a confirm modal opens AND the user must click `Confirm` before the action runs (no accidental delete)

#### Scenario: Delete happy path returns 204 and invalidates the list

- GIVEN the user confirms the delete
- WHEN the action runs
- THEN the backend returns 204 AND the action invalidates `swrKeys.admin.projects.list()` AND `redirect('/admin/projects')`

#### Scenario: 404 from the backend renders the not-found UI

- GIVEN the URL is `/admin/projects/<unknown-uuid>` AND the backend returns 404
- WHEN the loader runs
- THEN the route's `ErrorBoundary` (or React Router's `notFound`) renders a "Project not found" page

### REQ-ADM-4: Long form schema (title, slug, description, content, coverImage, tags, isPublished, urls)

The system SHALL declare the admin project form zod schema at `app/admin/projects/schema.ts`, declaring: `title` (string, min 1, max 200); `slug` (string, min 1, max 120, regex `^[a-z0-9-]+$`); `description` (string, min 1, max 500); `content` (string, optional); `coverImage` (string URL with `http`/`https` protocol, optional); `tags` (array of non-empty strings, normalized via trim + lowercase + dedupe, optional); `isPublished` (boolean, default `false`); `urls` (array of `{ title: string, url: string }`, optional, intra-array dedupe). The schema mirrors the backend's `CreateProjectDto` / `UpdateProjectDto` per the locked `projects-domain` Requirement: Admin Project Create.

#### Scenario: Slug regex rejects uppercase

- GIVEN the user types `My-Project` in `slug`
- WHEN the form validates
- THEN the `slug` field shows the regex error AND the form does NOT submit

#### Scenario: coverImage URL is validated

- GIVEN the user types `not-a-url` in `coverImage`
- WHEN the form validates
- THEN the `coverImage` field shows the URL error AND the form does NOT submit

#### Scenario: Duplicate urls in the array are rejected

- GIVEN the user adds two urls with the same `url` value
- WHEN the form validates
- THEN the form shows a "Duplicate url" error (per the backend's `UpdateProjectDto` validation)

### REQ-ADM-5: SWR cache invalidation on success

The system SHALL register `swrKeys.admin.projects.list()` (returns the admin list URL) and `swrKeys.admin.projects.byId(id)` (returns `/api/v1/admin/projects/${id}`) at `app/shared/swr/keys.ts`. On every successful `action` (create, edit, delete), the action MUST call `mutate(key)` for the relevant keys per the locked `http-client` REQ-SWR-2 (SWR keys equal the URL).

#### Scenario: Create invalidates the list

- GIVEN an admin creates a new project
- WHEN the action returns 201
- THEN `mutate(swrKeys.admin.projects.list())` is called AND any open `/admin/projects` tab revalidates the list

#### Scenario: Edit invalidates both the list and the item

- GIVEN an admin edits a project
- WHEN the action returns 200
- THEN `mutate(swrKeys.admin.projects.list())` AND `mutate(swrKeys.admin.projects.byId(id))` are called

#### Scenario: Delete invalidates the list

- GIVEN an admin deletes a project
- WHEN the action returns 204
- THEN `mutate(swrKeys.admin.projects.list())` is called

### REQ-ADM-6: Mobile tab bar (Projects / Reviews / Inbox)

The system SHALL render a `MobileTabBar` molecule (at `app/shared/ui/molecules/mobile-tab-bar.tsx`) on viewports < 768px within the admin layout. The bar shows three pills: `Projects` (active by default), `Reviews` (placeholder per Q-3 / Q-20 deferred), `Inbox` (placeholder per Q-3 / Q-20 deferred). The active tab is held in `useUIStore.activeAdminTab` (a new slice on the existing `useUIStore` from P0). Tapping a placeholder tab MUST show a "Coming soon" toast via `useToastStore` — the placeholder routes do not exist yet.

#### Scenario: Projects tab is active by default

- GIVEN the admin lands on `/admin` (or any `/admin/*` page) on mobile
- WHEN the page renders
- THEN the `Projects` pill is visually active (per the design) AND the bar is at the bottom of the viewport

#### Scenario: Tapping Reviews shows a coming-soon toast

- GIVEN the user taps the `Reviews` pill
- WHEN the click is handled
- THEN a toast appears with the message from the `admin` i18n namespace: `Coming soon`

#### Scenario: Active tab persists across navigations

- GIVEN the user taps `Projects` on the overview page
- WHEN they navigate to `/admin/projects`
- THEN the bar still shows `Projects` as active (the slice lives in zustand, not in URL state)

### REQ-ADM-7: Session gate (consumed from locked `admin-auth`)

The system SHALL rely on the `app/routes/admin.tsx` layout loader's session gate (already wired by the archived `auth-fetch-client` change) per locked `admin-auth` REQ-GATE-1/REQ-GATE-2/REQ-GATE-3. The projects routes MUST NOT add a second gate. On a 401 from any admin endpoint, the gate's redirect to `/admin/auth?next=…` is the only redirect; the projects routes MUST NOT redirect on their own.

#### Scenario: 401 from the list endpoint is handled by the gate

- GIVEN the admin session is expired
- WHEN the user navigates to `/admin/projects`
- THEN the admin layout loader returns 401 first AND the user is redirected to `/admin/auth?next=/admin/projects` (the projects loader never runs)

#### Scenario: Login route is exempt

- GIVEN the user is not signed in AND navigates to `/admin/auth`
- WHEN the admin layout loader runs
- THEN it does NOT redirect AND the login form renders (per locked `admin-auth` REQ-GATE-3)

### REQ-ADM-8: Login page re-skinned to Aurelian

The system SHALL re-skin the existing `app/admin/auth/pages/login.tsx` (the file currently exported by `app/routes/admin.auth.tsx`) to use the Aurelian palette + shadcn primitives. The form's BEHAVIOR is unchanged (per Q-2: the locked `admin-auth` spec is NOT modified). The visual treatment SHALL match the rest of the admin shell (Aurelian obsidian background, Aurelian Gold CTA, surface-container card).

#### Scenario: Login page uses Aurelian Gold on the submit button

- GIVEN the user lands on `/admin/auth`
- WHEN the page renders
- THEN the submit button background is `bg-primary` (Aurelian Gold) AND the page background is `bg-background` (Aurelian obsidian) AND the spec file `openspec/specs/admin-auth/spec.md` is unchanged

### REQ-ADM-9: Error rendering per locked http-client contract

The system SHALL render loader and action errors via the route's `ErrorBoundary`. For `ApiError { kind: 'unauthorized' }`, the boundary does not redirect (the admin gate already did). For `kind: 'server'`, `kind: 'network'`, and `kind: 'throttled'`, the boundary shows a retry button.

#### Scenario: 500 on the list endpoint surfaces a retry button

- GIVEN the backend returns 500 on `GET /api/v1/admin/projects`
- WHEN the loader throws `ApiError { kind: 'server' }`
- THEN the route's `ErrorBoundary` renders a "Retry" button AND clicking it re-runs the loader

### REQ-ADM-10: Meta tags for the admin surface

The system SHALL export a `meta()` function from each admin projects route that returns: a `title` (e.g. `Projects — Admin`, `New Project — Admin`, `Edit Project — Admin`); a `robots` meta of `noindex, nofollow` (the admin is not indexable); no `hreflang` (admin is English-only per locked decision D8). The strings live in the `admin` i18n namespace.

#### Scenario: /admin/projects is not indexable

- GIVEN the user lands on `/admin/projects`
- WHEN the page renders
- THEN the `<head>` contains `<meta name="robots" content="noindex, nofollow">` AND no `hreflang` links

### REQ-ADM-11: Active works stat card drift flag (Q-12)

The system SHALL render the `Active Works` stat card on the admin overview (`/admin` — see `admin._index.tsx`) with the value sourced from `GET /api/v1/admin/projects/stats` IF the backend ships that endpoint. **BLOCKED-ON-BACKEND**: the backend's `projects-domain` capability today does NOT include a `/stats` endpoint. The design phase MUST confirm; if the endpoint does not exist by P2, the stat card hardcodes the count (with a `// TODO(admin-projects): wire to live stats` comment) and a follow-up SDD change adds the live fetch.

#### Scenario: Endpoint exists — stat card is live

- GIVEN the backend ships `GET /api/v1/admin/projects/stats` returning `{ activeWorks: 24, delta: '+3 this month' }`
- WHEN the admin overview loader runs
- THEN the `Active Works` stat card displays `24` AND the delta text `+3 this month`

#### Scenario: Endpoint does NOT exist — hardcoded fallback

- GIVEN the backend has no `GET /api/v1/admin/projects/stats` endpoint
- WHEN the admin overview loader runs
- THEN the `Active Works` stat card displays the design-time value `24` AND a `// TODO` comment marks the call site

## Cross-references

- **Locked frontend** (consumed, not modified):
  - `openspec/specs/admin-auth/spec.md` — REQ-SES-1, REQ-SES-2, REQ-SES-3, REQ-SES-4 (session store), REQ-GATE-1, REQ-GATE-2, REQ-GATE-3, REQ-GATE-4 (gate), REQ-LOG-1, …, REQ-LOG-6 (login), REQ-LO-1, REQ-LO-2 (logout), REQ-NEXT-1 (`next` sanitization).
  - `openspec/specs/http-client/spec.md` — REQ-CORE-2 (error envelope), REQ-CLI-1, REQ-CLI-2 (client fetch), REQ-SWR-1, REQ-SWR-2 (SWR keys).
- **Backend** (read-only, mirror the contract):
  - `../roonder-portfolio-backend/openspec/specs/projects-domain/spec.md`:
    - Requirement: Project and ProjectUrl Entities (entity shape + `ProjectEntity.urls` relation).
    - Requirement: Public Project List (NOT used by the admin — the admin has its own list endpoint; this is the public one).
    - Requirement: Admin Project Create (`POST /api/v1/admin/projects`, 201, 409 on duplicate slug, DIFF semantics on `urls`).
    - Requirement: Admin Project Update with `project_urls` DIFF Semantics (`PATCH /api/v1/admin/projects/:id`, 404 on unknown id, 409 on slug collision, DIFF semantics — empty array removes all, omitted array leaves unchanged).
    - Requirement: Admin Project Delete with Cascade (`DELETE /api/v1/admin/projects/:id`, 204, cascades to `project_urls`).
  - `../roonder-portfolio-backend/openspec/specs/auth-domain/spec.md` (Requirement: JwtAuthGuard) — the guard is method-level on protected handlers; the frontend MUST send a valid `Authorization: Bearer <access>` (per locked `http-client` REQ-CLI-1).
- **i18n keys**: `admin.brand.title`, `admin.sidebar.*`, `admin.header.*`, `admin.overview.*`, `admin.projects.*` (list, new, edit, form fields, status, action, empty).
- **Proposal**: `openspec/changes/portfolio-frontend-v1/proposal.md` §Capabilities "admin-projects-domain" + Q-2, Q-3, Q-12, Q-14, Q-20 dispositions.

## Out of scope

- **Reviews and contact-inbox subdomains.** Q-3 / Q-20 are deferred. The route files under `app/routes/admin.reviews*` and `app/routes/admin.contact*` stay as TODO scaffolds. The mobile tab bar (REQ-ADM-6) shows placeholder pills that toast "Coming soon" when tapped.
- **Image upload.** The form accepts a `coverImage` URL (string), not a file upload. Adding multipart upload is a future SDD change (the backend does not yet expose an upload endpoint).
- **A `project_urls` admin UI on the create / edit page.** The form's `urls` field is a JSON textarea (one url per line, parsed to `{ title, url }`) — a structured UI is a future change. The backend's DIFF semantics are the contract.
- **Bulk operations** (multi-select + bulk delete / publish / unpublish). A future SDD change.
- **Server-side pagination on the admin list.** The admin endpoint is server-side paginated today (per `projects-domain`); the UI renders the `Pagination` molecule on top. Cursor-based pagination is a future change.
- **Visual regression tests.** A future SDD change adds Playwright + screenshots.
- **Pre-render target decision (Q-21).** Admin is dynamic; pre-render is not relevant.
