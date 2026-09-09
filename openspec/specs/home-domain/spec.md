# home-domain — Locked Spec

> Status: **locked** (promoted from `portfolio-frontend-v1` delta, archived 2026-08-27).
> Capability: `home-domain`.
> Source of truth: `openspec/changes/portfolio-frontend-v1/proposal.md` (corrected) §Approach "Home contact form is a real form" + `assets/design/home_juliam_aponte_portfolio/{code.html,screen.png}` and `assets/design/home_mobile_juliam_aponte/{code.html,screen.png}`.
> Consumed locked specs: `openspec/specs/http-client/spec.md` (REQ-CORE-2 error envelope, REQ-SRV-1/REQ-SRV-2/REQ-SRV-3 server fetch, REQ-CLI-1/REQ-CLI-2 client fetch).
> Cross-references: backend `../roonder-portfolio-backend/openspec/specs/projects-domain/spec.md` (the `GET /api/v1/projects?featured=true` contract); backend `../roonder-portfolio-backend/openspec/changes/domain-contact/specs/contact/spec.md` (the `POST /api/v1/contacts` contract — see **drift note** in REQ-HOME-6); Aurelian palette at `assets/design/aurelian_grid_v2/DESIGN.md`.

## Purpose

The public home at `/` (and `/es`) is the portfolio's one-pager. Today `app/routes/_public._index.tsx` is a 38-line placeholder with a `Navbar` + `NeuronCard` stub. This delta replaces it with the real home page composed from the Aurelian bento grid in `home_juliam_aponte_portfolio/` plus an expanded About section, mobile-responsive per `home_mobile_juliam_aponte/`. The loader fetches featured projects, featured reviews, and the home metrics summary; the page renders a hero, the bento metrics, the selected works, an About section, a reviews list, and the **home contact form** (a real form — NOT a CTA — that shares its schema and action with `/contact` per `contact-domain` REQ-CON-1).

> **Drift note (read before designing) — RESOLVED 2026-08-26**: the proposal originally referenced `POST /api/v1/contact` (singular); the backend's `contact-domain` change at `../roonder-portfolio-backend/openspec/changes/domain-contact/specs/contact/spec.md` Requirement: Public POST contact endpoint locks the path as **`POST /api/v1/contacts`** (plural). The proposal has been corrected. The home contact form and the `/contact` page MUST both POST to `/api/v1/contacts`.

## Requirements

### REQ-HOME-1: Home loader fetches featured data

The system SHALL provide a loader at `app/routes/_public._index.tsx` that performs a `Promise.all` of the following `serverFetch` calls: `GET /api/v1/projects?featured=true` (featured projects for the bento), `GET /api/v1/reviews?featured=true` (featured reviews for the testimonials list), and `GET /api/v1/home/metrics` (the home metrics summary — three numbers + labels per the design). The loader MUST return the typed payload; on a non-2xx from any of the three, the loader MUST throw the typed `ApiError` per the locked `http-client` REQ-CORE-2.

#### Scenario: Happy path returns the three payloads

- GIVEN the backend returns 200 for all three endpoints
- WHEN the loader returns
- THEN the data shape is `{ featuredProjects, featuredReviews, homeMetrics }` AND each list/summary is narrowed by the zod schema declared in `app/home/api/schema.ts`

#### Scenario: 500 on `/api/v1/projects` throws `server` ApiError

- GIVEN the backend returns 500 on `GET /api/v1/projects?featured=true`
- WHEN the loader runs
- THEN it throws `ApiError { kind: 'server' }` AND the route's `ErrorBoundary` renders the failure UI

### REQ-HOME-2: Bento composition (desktop + mobile responsive)

The system SHALL render the home page as a bento grid per `home_juliam_aponte_portfolio/code.html`. The composition order, top to bottom: (1) `PublicHeader` + `GrainOverlay`; (2) `HomeHero` (profile image, micro-label, headline, subhead, brand pill); (3) `TechnicalStrategyBento` (3-column metrics row from the home metrics payload); (4) `SelectedWorksBento` (2-column image-overlay row from the featured projects); (5) `ExpandedAboutBento` (NEW — the expanded About section per Q-4); (6) `TestimonialsSplit` (reviews list — note: the review form is deferred per Q-3); (7) `HomeContactForm` (real form, NOT a CTA — see REQ-HOME-6); (8) `PublicFooter`. On mobile (`< 768px`), the layout collapses to a single column with the bento cells stacking; the mobile hero uses the `home_mobile_juliam_aponte/` mockup copy (`Technical Strategist` micro-label, smaller `text-display-mobile` h1, primary `Connect` button).

#### Scenario: Desktop renders the 7-section composition

- GIVEN the viewport is ≥ 1280px
- WHEN the page renders
- THEN the 8 sections above are visible in order AND no section is hidden

#### Scenario: Mobile renders the stacked composition

- GIVEN the viewport is < 768px
- WHEN the page renders
- THEN every section is full-width AND the bottom nav dock is visible AND the desktop header is replaced by `MobileHeader`

### REQ-HOME-3: Expanded About section (Q-4)

The system SHALL include an expanded About bento in P1 (per Q-4 disposition). The About section SHALL render the brand micro-label, a heading, a body paragraph, and (optionally) a 2-3 column secondary stat row sourced from the home metrics payload. The copy lives in the `home` i18n namespace; the brand name resolves to `t('common.brand.name')` = `Juliam Aponte` per REQ-I18N-5.

#### Scenario: About section renders the brand name from i18n

- GIVEN the `en` locale is active
- WHEN the About section renders
- THEN the heading references `Juliam Aponte` (via `t('common.brand.name')`) AND no hardcoded `Aponte` string exists in `app/home/organisms/expanded-about-bento.tsx`

### REQ-HOME-4: Meta tags and hreflang for en/es

The system SHALL export a `meta()` function from `app/routes/_public._index.tsx` that returns: a `title` (per locale: `Home — Roonder Portfolio` / `Inicio — Roonder Portfolio`); a `description` (per locale, sourced from `home.meta.description`); a `link rel="canonical"` pointing to the current URL in the ACTIVE locale (e.g. `https://…/es/` for `/es`); and `link rel="alternate" hreflang="en"` and `hreflang="es"` entries pointing to the same page in the other locale (e.g. `https://…/` for the `en` alternate of the `es` home, and vice versa).

#### Scenario: en home advertises the es alternate

- GIVEN the URL is `/`
- WHEN the page renders
- THEN the `<head>` contains `<link rel="canonical" href="https://…/">` AND `<link rel="alternate" hreflang="es" href="https://…/es/">`

#### Scenario: es home advertises the en alternate

- GIVEN the URL is `/es`
- WHEN the page renders
- THEN the `<head>` contains `<link rel="canonical" href="https://…/es/">` AND `<link rel="alternate" hreflang="en" href="https://…/">`

### REQ-HOME-5: Error rendering per locked http-client contract

The system SHALL render loader errors via the route's `ErrorBoundary` (per `DESIGN.md` §10). For `ApiError { kind: 'unauthorized' }` (not expected on the home — the home is public), the boundary shows a generic "Something went wrong" message. For `ApiError { kind: 'server' }` or `kind: 'network' }`, the boundary shows a retry button that re-runs the loader.

#### Scenario: 500 surfaces a retry button

- GIVEN the loader throws `ApiError { kind: 'server' }`
- WHEN the ErrorBoundary renders
- THEN a "Retry" button is visible AND clicking it re-runs the loader

### REQ-HOME-6: Home contact form is a real form (NOT a CTA)

The system SHALL render a real form (name, email, subject, message) at the bottom of the home page — NOT a CTA button. The form SHALL be the same component as the `/contact` route uses (`app/contact/molecules/contact-form.tsx` per `contact-domain` REQ-CON-2), bound to the same zod schema declared in `app/contact/schema.ts` (per `contact-domain` REQ-CON-1) and submitted via `fetcher.submit` to the `/contact` route's `action` (which posts to the backend's `POST /api/v1/contacts`). Success renders a localized toast via `useToastStore.push({ kind: 'success', message: t('contact.form.success') })`. Failure renders the typed `ApiError` per the locked `http-client` REQ-CORE-2 (validation errors under each field; throttled 429 with a `Retry-After` countdown; network error with a retry).

> **DRIFT NOTE (action item for design phase)**: the proposal says `POST /api/v1/contact`; the backend's `contact-domain` change locks the path as `POST /api/v1/contacts` (plural). The frontend MUST use the locked plural form. Flag this drift in the design phase.

#### Scenario: Successful submit shows a localized toast

- GIVEN the user fills `name`, `email`, `subject`, `message` and clicks `Send Transmission`
- WHEN the action returns 201
- THEN a toast appears with the message from `t('contact.form.success')` for the active locale AND the form fields are reset

#### Scenario: 429 surfaces a retry-after countdown

- GIVEN the backend returns 429 with `Retry-After: 12`
- WHEN the action returns
- THEN the form shows an inline error under the submit button: `Too many submissions. Try again in 12 seconds.` AND the submit button is disabled until the countdown elapses

#### Scenario: Network error shows a retry button

- GIVEN the fetch fails with `ApiError { kind: 'network' }`
- WHEN the action returns
- THEN the form shows an inline error AND a `Retry` button is enabled

#### Scenario: Validation error renders under each field

- GIVEN the backend returns 400 with `fieldErrors: { email: ['must be an email'] }`
- WHEN the action returns
- THEN the `email` field shows the message `must be an email` (sourced from the typed `ApiError`) AND the other fields are unaffected

### REQ-HOME-7: SWR keys mirror REST paths

The system SHALL register the home's SWR keys at `app/shared/swr/keys.ts` (per proposal §Approach "Shared utilities, no drift"). The home loader populates the SWR cache via the same keys the client components read, so a successful contact submission (REQ-HOME-6) can invalidate the relevant key with `mutate(swrKeys.home.featured())` if the backend ever surfaces the new submission back into the home payload (today it does not — this requirement is forward-looking).

#### Scenario: SWR key equals the URL

- GIVEN `swrKeys.home.featured()` is called
- WHEN it returns
- THEN the value is the array `['/api/v1/projects?featured=true', '/api/v1/reviews?featured=true', '/api/v1/home/metrics']` (the URLs the loader calls) AND the same string is used as the SWR `key` in any client-side `useSWR` call (per locked `http-client` REQ-SWR-2)

### REQ-HOME-8: Home metrics endpoint drift flag (Q-12)

The system SHALL call `GET /api/v1/home/metrics` from the home loader (per REQ-HOME-1) IF the backend's `home-domain` capability ships a `home-metrics-summary` requirement. **BLOCKED-ON-BACKEND**: there is no `home-domain` capability in the backend's `openspec/specs/` tree today. The design phase MUST confirm whether `GET /api/v1/home/metrics` exists; if it does not, the home page SHALL hardcode the three numbers (124 / 48 / 92) and a follow-up SDD change will replace the hardcoded values with a real fetch.

#### Scenario: Endpoint exists — loader fetches live

- GIVEN the backend ships `GET /api/v1/home/metrics`
- WHEN the home loader runs
- THEN the metrics numbers are sourced from the live response AND the home page renders the dynamic values

#### Scenario: Endpoint does NOT exist — hardcoded fallback

- GIVEN the backend has no `home-domain` capability
- WHEN the home loader runs
- THEN the three numbers are the design-time values (124, 48, 92) AND a `// TODO(home-domain): swap for live fetch` comment marks the call site

## Cross-references

- **Locked frontend** (consumed, not modified): `openspec/specs/http-client/spec.md` (REQ-CORE-1, REQ-CORE-2, REQ-SRV-1, REQ-SRV-2, REQ-SRV-3, REQ-SWR-1, REQ-SWR-2).
- **Backend** (read-only, mirror the contract):
  - `../roonder-portfolio-backend/openspec/specs/projects-domain/spec.md` (Requirement: Public Project List) — the `GET /api/v1/projects?featured=true` contract.
  - `../roonder-portfolio-backend/openspec/changes/domain-contact/specs/contact/spec.md` (Requirement: Public POST contact endpoint) — the `POST /api/v1/contacts` contract (LOCKED plural, flag drift).
- **Sibling capability** (referenced for the form): `contact-domain` REQ-CON-1 (schema) and REQ-CON-2 (form molecule) in `openspec/changes/portfolio-frontend-v1/specs/contact-domain/spec.md`.
- **i18n keys**: `home.hero.*`, `home.metrics.*`, `home.selectedWorks.*`, `home.about.*`, `home.reviews.*`, `home.contact.*`, `common.brand.name`, `common.brand.handle`, `common.nav.*`, `common.footer.*` (see `openspec/changes/portfolio-frontend-v1/specs/i18n/spec.md` REQ-I18N-2 for the file layout and the explore report §"i18n namespace plan" for the key tables).
- **Proposal**: `openspec/changes/portfolio-frontend-v1/proposal.md` §Capabilities "home-domain" + Q-3, Q-4, Q-12 dispositions.

## Out of scope

- **A review submission form on the home.** Q-3 is deferred. The home shows the `TestimonialsSplit` (read-only list) only; the split's left column (form) renders as a "Reviews are coming soon" placeholder or is removed from the layout entirely.
- **An admin inbox widget on the home.** Admin is a separate surface; the home is anonymous.
- **Pre-render target decision (Q-21).** Deferred to a follow-up SDD change that adds the `react-router.config.ts` pre-render config. P1 ships with SSR.
- **A `/api/v1/about` single-doc About endpoint.** Q-4 was resolved as "use the i18n strings for the About copy"; the backend does not need to ship a separate endpoint.
- **Animations.** P0 lands the animation presets (page transitions, drawer slide, scroll reveal); P1 USES them per `DESIGN.md` §9 but the presets themselves are a cross-cutting concern (folded into the domain specs that need them).
