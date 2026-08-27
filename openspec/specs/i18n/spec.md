# i18n — Locked Spec

> Status: **locked** (promoted from `portfolio-frontend-v1` delta, archived 2026-08-27).
> Capability: `i18n`.
> Source of truth: `openspec/changes/portfolio-frontend-v1/proposal.md` (corrected) §Approach "i18n, one namespace per area" + `DESIGN.md` §8.
> Consumed locked specs: none directly. The `useLocaleStore` and `setLocale` helper are read by the route files in `app/routes/_public.tsx` and by every domain spec.
> Cross-references: backend `../roonder-portfolio-backend/openspec/specs/auth-domain/spec.md` (read-only — the i18n layer is frontend-only; no backend contract).

## Purpose

`i18next` and `react-i18next` are already in `package.json` but not wired. The public layout at `app/routes/_public.tsx:9` carries a `// TODO when wiring react-i18next` marker. This delta wires the bootstrap, loads the two locales (`en` default at root, `es` at the `/es/...` prefix), creates one JSON namespace per public area (`common`, `home`, `works`, `contact`) plus a single `admin` namespace (en-only), introduces a `useLocaleStore` zustand store that mirrors `i18next.language` for non-hook consumers, and ships a single `setLocale(next)` helper that updates i18next, the store, the `lang` cookie, `document.documentElement.lang`, AND navigates to the equivalent path (URL prefix is the source of truth per `DESIGN.md` §8). The brand canonical name is **"Juliam Aponte"** (i18n key `common.brand.name`); the dev pseudonym handle is **"Roonder"** (i18n key `common.brand.handle`).

## Requirements

### REQ-I18N-1: Two locales — `en` (default) and `es` (prefixed)

The system SHALL load exactly two locales. The `en` locale is the default and is served at the unprefixed root (`/`, `/works`, `/works/:slug`, `/contact`). The `es` locale is served at the `/es/...` prefix (`/es`, `/es/works`, `/es/works/:slug`, `/es/contact`). The locale is determined by the URL pathname; the cookie and `Accept-Language` header are NOT consulted on a navigation (the URL is the single source of truth per `DESIGN.md` §8).

#### Scenario: Root path resolves to `en`

- GIVEN the URL is `/`
- WHEN the public layout loader runs
- THEN `i18next.language` is `'en'` AND `useLocaleStore.locale` is `'en'`

#### Scenario: `/es/...` path resolves to `es`

- GIVEN the URL is `/es/works`
- WHEN the public layout loader runs
- THEN `i18next.language` is `'es'` AND `useLocaleStore.locale` is `'es'`

#### Scenario: Admin paths do not consult i18n

- GIVEN the URL is `/admin/projects`
- WHEN the admin layout renders
- THEN no `i18next` init runs AND no locale is read from the URL (admin is English-only per locked decision D8)

### REQ-I18N-2: One namespace per public area

The system SHALL ship JSON namespaces at `app/shared/i18n/locales/{en,es}/{namespace}.json` for the four public namespaces (`common`, `home`, `works`, `contact`) AND a single `admin` namespace at `app/shared/i18n/locales/en/admin.json` (no `es/admin.json` per locked decision D8 — admin is English-only). The `common` namespace owns shared chrome strings (nav, footer, brand); each per-area namespace owns the strings for one route family.

#### Scenario: The `home` namespace has `en` and `es` files

- GIVEN the i18n bootstrap runs
- WHEN it loads the `home` namespace
- THEN both `app/shared/i18n/locales/en/home.json` and `app/shared/i18n/locales/es/home.json` are present AND both expose the same key set

#### Scenario: The `admin` namespace is en-only

- GIVEN the admin login form renders
- WHEN the i18n runtime looks up any `admin.*` key
- THEN it returns the `en` value AND no `es/admin.json` file exists (the lookup falls back to the en file)

### REQ-I18N-3: `useLocaleStore` mirrors `i18next.language`

The system SHALL provide a zustand store `useLocaleStore` at `app/shared/stores/locale.ts` that holds the active locale as `'en' | 'es'`. The store MUST be updated whenever `i18next.language` changes (the bootstrap subscribes to `i18next.on('languageChanged', …)`). Components that cannot call hooks (e.g. `meta()` exports that need to build a `<html lang>` attribute or canonical/hreflang tags) MUST read `useLocaleStore.getState().locale` directly.

#### Scenario: Store reflects i18next on initial load

- GIVEN the public layout loader runs at `/es/works`
- WHEN the loader returns `{ lang: 'es' }`
- THEN `useLocaleStore.getState().locale` is `'es'`

#### Scenario: Store updates on language change

- GIVEN the user clicks the `LocaleSwitcher` and picks the other language
- WHEN `setLocale('en')` is called from `/es/works`
- THEN `i18next.language` becomes `'en'` AND `useLocaleStore.getState().locale` becomes `'en'` (in the same tick)

### REQ-I18N-4: `setLocale(next)` updates everything and navigates

The system SHALL expose a `setLocale(next: 'en' | 'es')` helper at `app/shared/i18n/set-locale.ts` that, in a single call, performs ALL of the following steps in order: (1) calls `i18next.changeLanguage(next)`; (2) updates `useLocaleStore.locale`; (3) writes the `lang` cookie (`Path=/; SameSite=Lax; Max-Age=31536000`); (4) sets `document.documentElement.lang = next`; (5) computes the equivalent path in the new locale and navigates to it via `useNavigate()` (or a server-side equivalent on full navigations). The URL prefix is the source of truth; the cookie and the store are side effects.

#### Scenario: Switch from `en` to `es` from the home page

- GIVEN the user is on `/`
- WHEN they click the `LocaleSwitcher` and pick `ES`
- THEN `setLocale('es')` runs AND the browser navigates to `/es` (the equivalent of `/` in the `es` locale)

#### Scenario: Switch preserves the deep path

- GIVEN the user is on `/works/the-monolith-pavilion`
- WHEN they pick `ES`
- THEN the browser navigates to `/es/works/the-monolith-pavilion` (the same slug, just under the `es` prefix)

#### Scenario: All side effects land before the URL changes

- GIVEN `setLocale('es')` is called
- WHEN the call returns
- THEN the cookie is set AND the store is updated AND `document.documentElement.lang` is `'es'` AND a navigation to the equivalent path is in flight

#### Scenario: Cookie is set with the documented attributes

- GIVEN `setLocale('es')` runs
- WHEN the `Set-Cookie` header is inspected
- THEN its name is `lang` AND its value is `es` AND it carries `Path=/; SameSite=Lax; Max-Age=31536000`

### REQ-I18N-5: Brand canonical name is "Juliam Aponte"

The system SHALL define the i18n key `common.brand.name` with the value `Juliam Aponte` in the `en` locale (and the corresponding Spanish translation in the `es` locale). The "Julia Aponte" spelling that appears in some `code.html` mockups (e.g. `assets/design/home_juliam_aponte_portfolio/code.html:2`, `home_juliam_aponte_portfolio/code.html:22` alt, `home_juliam_aponte_portfolio/code.html:154` footer, `admin_console/code.html:2` sidebar) is a typo to be corrected in P1 — the spec locks the canonical spelling.

#### Scenario: Brand name key resolves to "Juliam Aponte"

- GIVEN the `en` locale is active
- WHEN a component calls `t('common.brand.name')`
- THEN the rendered string is exactly `Juliam Aponte` (NOT `Julia Aponte`, NOT `Julia A.`, no abbreviation)

#### Scenario: No component inlines the brand name

- GIVEN the home hero renders
- WHEN a developer greps `app/home/` for the string `Aponte`
- THEN the only matches are in `app/home/i18n.ts` (the namespace export) or in `t('common.brand.name')` calls — no hardcoded `Juliam` or `Julia` strings inside JSX

### REQ-I18N-6: Brand handle is "Roonder"

The system SHALL define the i18n key `common.brand.handle` with the value `Roonder` in the `en` locale (and the corresponding Spanish translation in the `es` locale). The handle is the developer pseudonym and appears in the footer copyright and in the `code.html` "Powered by" lines, where present.

#### Scenario: Brand handle key resolves to "Roonder"

- GIVEN the `en` locale is active
- WHEN a component calls `t('common.brand.handle')`
- THEN the rendered string is exactly `Roonder`

### REQ-I18N-7: Hybrid micro-label treatment (Q-9, Q-10)

The system SHALL treat brand-flourish micro-labels (the uppercase, tracked strings like `[ Precision Metrics ]`, `[ Client Voices ]`, `PROYECTOS`, `SOBRE MÍ`, `Atmósfera Dinámica`, `Technical Strategist`, `[ Initiate Contact ]`) as FIXED visual identity — they do NOT go through i18n, they are hard-coded English (or the design's locked copy) inside the `MicroLabel` atom. Contextual labels (form labels, button copy, helper text, validation messages, navigation) SHALL go through i18n.

#### Scenario: Brand micro-labels are not in the JSON

- GIVEN a developer greps `app/shared/i18n/locales/en/*.json` for `Precision Metrics`
- THEN no match exists (the string is hardcoded in `MicroLabel`, not in the locale)

#### Scenario: Form labels are in the JSON

- GIVEN the contact form renders
- WHEN a developer greps `app/shared/i18n/locales/en/contact.json` for `Name`
- THEN a match exists AND the form reads the label via `t('contact.form.name')`

### REQ-I18N-8: URL prefix is the source of truth

The system SHALL NOT re-derive the locale from the `lang` cookie or from `navigator.language` on a navigation. The URL pathname (`/es/...` vs `/`) is the only input the public layout loader uses to seed `i18next` and `useLocaleStore`. The cookie is a SIDE EFFECT of `setLocale`, not a source. (`Accept-Language` is only consulted on the very first visit when no URL prefix is present — the redirect sets the cookie and lands the user at the locale-appropriate URL.)

#### Scenario: Direct navigation to `/es/contact` loads `es`

- GIVEN the user pastes `/es/contact` into the address bar
- WHEN the request lands
- THEN the public layout loader seeds `i18next` with `'es'` regardless of the browser's `Accept-Language` header

#### Scenario: Direct navigation to `/contact` loads `en`

- GIVEN the user pastes `/contact` into the address bar
- WHEN the request lands
- THEN the public layout loader seeds `i18next` with `'en'` regardless of the `lang` cookie value

### REQ-I18N-9: Public layout wires the bootstrap

The system SHALL replace the TODO at `app/routes/_public.tsx:9` with the i18n bootstrap call. The public layout's `loader` MUST seed `i18next` with the locale derived from the URL pathname before any child loader or component renders. The `data-lang` attribute on the wrapper `<div>` (already emitted by the existing loader) MUST continue to reflect the active locale for CSS selectors that need it.

#### Scenario: Child loaders see the seeded locale

- GIVEN the public layout loader runs at `/es/works/the-monolith-pavilion`
- WHEN the child route's loader runs
- THEN `i18next.language` is `'es'` AND the child can call `t('works.card.title')` and get the Spanish value

## Cross-references

- **Locked frontend** (consumed, not modified): `openspec/specs/http-client/spec.md`, `openspec/specs/admin-auth/spec.md`.
- **Sibling docs** (read-only): `DESIGN.md` §8 (i18n rules — source of truth for the URL-as-truth rule); `openspec/changes/portfolio-frontend-v1/explore.md` §"i18n namespace plan" (the captured key tables).
- **Proposal**: `openspec/changes/portfolio-frontend-v1/proposal.md` §Approach "i18n, one namespace per area" + Q-8, Q-11, Q-16 dispositions.

## Out of scope

- **A third locale.** `en` and `es` only. Adding a locale is a future SDD change (DESIGN.md §12).
- **Locale-specific routing to non-public pages.** Admin is English-only; there is no `/es/admin/...`.
- **Pluralization rules beyond `i18next` defaults.** `_one`, `_other` suffixes are used where the JSON files include them; no custom `Intl.PluralRules` configuration.
- **Right-to-left (RTL) support.** Spanish and English are both LTR.
- **Number/date formatters beyond `i18next`'s built-in `Intl` helpers.** No `moment` or `date-fns`.
- **Per-user locale preferences.** URL prefix is the only input.
