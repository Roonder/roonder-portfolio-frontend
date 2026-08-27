# Verify Report — portfolio-frontend-v1

**Verdict**: GREEN
**Date**: 2026-08-27
**Verifier**: sdd-verify executor

## Summary

All three PRs (P0 foundation, P1 public, P2 admin) are merged to `main`. The automated gates (`bun run typecheck`, `bun run build`) pass. The implementation covers all 6 delta specs across 54 requirements. Routes, i18n namespaces, SWR keys, and hard constraints were verified by source inspection and grep.

Both previously reported findings have been fixed and verified (see Re-verification section below). C-1 (`useMemo` in works page) was removed in commit `4f610cd`; W-1 (contact schema constraints) was aligned with REQ-CON-1 in commit `fd55239`. No new findings.

## Automated Gates

- `bun run typecheck`: **PASS** (exit 0; `envFile` deprecation warnings are framework-internal)
- `bun run build`: **PASS** (client 71 assets, server 247.04 kB / 56.27 kB gzip)

## Spec Compliance

### admin-projects-domain

| REQ | Status | Notes |
|-----|--------|-------|
| REQ-ADM-1 | ✅ PASS | List route at `admin.projects._index.tsx` with loader, filter by status, pagination, `New Project` CTA |
| REQ-ADM-2 | ✅ PASS | Create route at `admin.projects.new.tsx` with action posting to `/api/v1/admin/projects`, SWR invalidation, redirect |
| REQ-ADM-3 | ✅ PASS | Edit+delete route at `admin.projects.$id.tsx` with `_method` discriminator (PATCH/DELETE), confirm modal, 404 boundary |
| REQ-ADM-4 | ✅ PASS | Schema at `app/admin/projects/schema.ts` with title, slug (regex), description, content, coverImage (URL), tags (dedupe transform), isPublished, urls (dedupe superRefine) |
| REQ-ADM-5 | ✅ PASS | SWR keys `admin.projects.list()` and `admin.projects.byId(id)` registered; mutations called in create/update/delete actions |
| REQ-ADM-6 | ✅ PASS | `MobileTabBar` renders at `< 768px` with Projects/Reviews/Inbox pills; placeholder tabs toast "Coming soon" via `useToastStore` |
| REQ-ADM-7 | ✅ PASS | Session gate consumed from locked `admin.tsx` layout loader; no second gate in projects routes |
| REQ-ADM-8 | ✅ PASS | Login page re-skinned to Aurelian palette (bg-background, surface-container card, Gold CTA, font-display); behavior unchanged |
| REQ-ADM-9 | ✅ PASS | ErrorBoundary on admin projects routes renders retry button for server/network errors |
| REQ-ADM-10 | ✅ PASS | All admin routes export `meta()` with `noindex, nofollow`; no `hreflang` on admin routes |
| REQ-ADM-11 | ✅ PASS | Active Works stat card uses hardcoded fallback `{activeWorks: 24, delta: '+3 this month'}` with `// TODO(admin-projects)` comment |

### contact-domain

| REQ | Status | Notes |
|-----|--------|-------|
| REQ-CON-1 | ✅ PASS | Schema at `app/contact/schema.ts` with correct 4 fields and constraints matching spec: `name` min(1).max(100), `email` min(1).email(), `subject` min(1).max(150), `message` min(1).max(5000). Fixed in `fd55239`. |
| REQ-CON-2 | ✅ PASS | `ContactForm` molecule at `app/contact/molecules/contact-form.tsx` uses `useForm` + `zodResolver(contactSchema)`, renders 4 fields, submits via `useFetcher` |
| REQ-CON-3 | ✅ PASS | Action at `_public.contact.tsx` validates with `contactSchema`, posts to `POST /api/v1/contacts` (plural, locked), returns typed `ApiError` |
| REQ-CON-4 | ✅ PASS | Same `FormError` atom used by home and /contact; pattern-matches on `ApiError.kind` discriminator |
| REQ-CON-5 | ✅ PASS | 429 case rendered inline with countdown; submit button disabled during throttle |
| REQ-CON-6 | ✅ PASS | Success toast via `useToastStore.push({ kind: 'success', message: t('contact.form.success') })` — localized |
| REQ-CON-7 | ✅ PASS | `meta()` returns title, description, canonical, hreflang en/es |
| REQ-CON-8 | ✅ PASS | Loader is a no-op (returns `{ ok: true }`) |

### home-domain

| REQ | Status | Notes |
|-----|--------|-------|
| REQ-HOME-1 | ✅ PASS | Loader calls `fetchHomeFeatured` which runs `Promise.all` over 3 endpoints; returns typed payload |
| REQ-HOME-2 | ✅ PASS | `HomePage` composes 7 sections: hero + metrics + selected works + about + testimonials + contact form + footer |
| REQ-HOME-3 | ✅ PASS | `ExpandedAboutBento` uses `t('common.brand.name')` for brand name — no hardcoded "Aponte" |
| REQ-HOME-4 | ✅ PASS | `meta()` returns canonical + hreflang en/es; locale-aware title and description |
| REQ-HOME-5 | ✅ PASS | ErrorBoundary renders retry button for server/network errors |
| REQ-HOME-6 | ✅ PASS | Home contact form reuses the same `ContactForm` molecule from `~/contact/molecules/contact-form`; same schema, same action |
| REQ-HOME-7 | ✅ PASS | SWR keys registered at `app/shared/swr/keys.ts`; `home.featured()` returns tuple, `home.metrics()` returns URL |
| REQ-HOME-8 | ✅ PASS | Home metrics uses hardcoded fallback (124/48/92) with `// TODO(home-domain)` comment |

### i18n

| REQ | Status | Notes |
|-----|--------|-------|
| REQ-I18N-1 | ✅ PASS | Two locales: `en` (default, root) and `es` (prefixed `/es/...`); URL is source of truth |
| REQ-I18N-2 | ✅ PASS | 5 namespaces in `en/` (common, home, works, contact, admin); 4 in `es/` (common, home, works, contact); no `es/admin.json` |
| REQ-I18N-3 | ✅ PASS | `useLocaleStore` at `app/shared/stores/locale.ts`; mirrors `i18next.language` via subscriber |
| REQ-I18N-4 | ✅ PASS | `setLocale(next, pathname, navigate)` at `app/shared/i18n/set-locale.ts` performs all 5 steps: changeLanguage, store update, cookie, documentElement.lang, navigate |
| REQ-I18N-5 | ✅ PASS | `common.brand.name` = "Juliam Aponte" (with M) in en; `grep -r '\bJulia\b' app/` returns 0 matches |
| REQ-I18N-6 | ✅ PASS | `common.brand.handle` = "Roonder" in en |
| REQ-I18N-7 | ✅ PASS | Brand micro-labels hardcoded in `MicroLabel` atom with `// BRAND FLOURISH` comment; `grep 'Precision Metrics' app/shared/i18n/` returns 0 matches |
| REQ-I18N-8 | ✅ PASS | URL prefix is the only source; `_public.tsx` loader reads pathname, not cookie or Accept-Language |
| REQ-I18N-9 | ✅ PASS | `root.tsx` imports `~/shared/i18n/side-effect`; `_public.tsx` loader seeds i18next from URL |

### theme-tokens

| REQ | Status | Notes |
|-----|--------|-------|
| REQ-THEME-1 | ✅ PASS | `:root` overridden to Aurelian obsidian hex values in `app/app.css` |
| REQ-THEME-2 | ✅ PASS | `--rndr-*` shorthand retired; `grep -r 'rndr-' app/` returns 0 matches |
| REQ-THEME-3 | ✅ PASS | `noto-sans` import removed; `grep -r 'noto-sans' app/` returns 0 matches |
| REQ-THEME-4 | ✅ PASS | Hanken Grotesk kept as `--font-sans`; `@apply font-sans` on `html` |
| REQ-THEME-5 | ✅ PASS | Playfair Display kept as `--font-display`; opt-in `font-display` utility available |
| REQ-THEME-6 | ✅ PASS | Surface tier tokens added (`--surface-container-low`, etc.); available as Tailwind utilities |
| REQ-THEME-7 | ✅ PASS | `--brand-micro-label: #d0c5af` token; `text-brand-micro-label` utility available |
| REQ-THEME-8 | ✅ PASS | `GrainOverlay` atom at `app/shared/ui/atoms/grain-overlay.tsx`; `fixed inset-0 pointer-events-none z-[100] opacity-[0.05]` |
| REQ-THEME-9 | ✅ PASS | No light/dark toggle; single Aurelian obsidian theme |
| REQ-THEME-10 | ✅ PASS | `grep -rE 'className=.*var\(--' app/` returns 0 matches |

### works-domain

| REQ | Status | Notes |
|-----|--------|-------|
| REQ-WORKS-1 | ✅ PASS | Loader fetches full published list via `fetchWorksList` |
| REQ-WORKS-2 | ✅ PASS | Client-side filter + pagination in `useState`; `projectsBySlug` built as plain `for...of` loop (no `useMemo`/`useCallback`). Fixed in `4f610cd`. |
| REQ-WORKS-3 | ✅ PASS | 4 project-card variants (Featured, Compact, Data-viz, Split) in `project-card.tsx`; `pickVariant(index)` assigns by position |
| REQ-WORKS-4 | ✅ PASS | Side drawer (desktop) + bottom sheet (mobile) in `project-drawer.tsx`; motion presets with correct cubic-bezier; ESC + backdrop + X close; catalog state preserved |
| REQ-WORKS-5 | ✅ PASS | `/works/:slug` is canonical; loader fetches by slug + related projects; 404 throws Response; ErrorBoundary renders "Project not found" |
| REQ-WORKS-6 | ✅ PASS | SWR keys `works.list()` and `works.bySlug(slug)` registered |
| REQ-WORKS-7 | ✅ PASS | `meta()` on catalog and detail returns canonical + hreflang; detail canonical is unprefixed (`/works/:slug`) |
| REQ-WORKS-8 | ✅ PASS | `pageSize=100` in loader; 50-project cap documented |

## Hard Constraints

| Constraint | Status | Evidence |
|------------|--------|----------|
| No useMemo/useCallback/React.memo | ✅ PASS | `grep useMemo app/` returns only comments (5 files) and `app/components/ui/field.tsx` (locked shadcn primitive, excluded). No authored `useMemo`/`useCallback`/`React.memo` in application code. Fixed in `4f610cd`. |
| No var(--*) in className | ✅ PASS | `grep -rE 'className=.*var\(--' app/` returns 0 matches |
| No @radix-ui/* imports | ✅ PASS | `grep -r '@radix-ui' app/` returns 0 matches |
| cn() from shared/lib/cn.ts only | ✅ PASS | `find app -name "cn.ts"` returns one file (`app/shared/lib/cn.ts`); all 61 cn imports point to `~/shared/lib/cn`; `app/lib/` directory deleted |
| import type for type-only | ✅ PASS | `verbatimModuleSyntax: true` in tsconfig; typecheck passes (would fail on non-type import of type) |
| Admin en-only | ✅ PASS | No `es/admin.json` exists; no `hreflang` in any admin route `meta()`; `grep -r 'hreflang' app/routes/admin*` returns 0 matches |

## Findings

### CRITICAL

**C-1: `useMemo` in `app/works/pages/works.tsx` violates hard constraint** — **CLOSED**

- **Fix commit**: `4f610cd` — removed `useMemo` import and call; replaced with plain `for...of` loop for `projectsBySlug` map.
- **Re-verified**: `grep useMemo app/` returns 0 authored usages (5 comment-only matches + 1 locked shadcn `field.tsx` match excluded).

### WARNING

**W-1: `contactSchema` field constraints deviate from locked spec REQ-CON-1** — **CLOSED**

- **Fix commit**: `fd55239` — aligned zod constraints with spec: `name` min(1).max(100), `subject` min(1).max(150), `message` min(1).max(5000).
- **Re-verified**: `app/contact/schema.ts` lines 16-35 match REQ-CON-1 exactly.

### SUGGESTION

**S-1: `StatNumber` atom unused by home `MetricsBento`**

- Noted in apply-progress. The `MetricsBento` inlines the number rendering instead of using the shared `StatNumber` atom. Non-blocking; the atom is available for future use.

**S-2: `(params as { lang?: string }).lang` cast in 4 route `meta()` functions**

- The `Route.MetaArgs` type does not include the dynamic `lang` segment from the `prefix('es', ...)` factory. The cast is safe but a typed `useLang()` helper would be cleaner. Non-blocking; follow-up refactor.

**S-3: `projectCard` variant is index-driven, not data-driven**

- `pickVariant(index)` assigns card variant by position. A future improvement could derive the variant from project metadata (e.g. a `featured` flag). Non-blocking.

## Routes Verified

| Path | Route file | Status |
|------|-----------|--------|
| `/` | `_public._index.tsx` | ✅ Wired |
| `/works` | `_public.works.tsx` | ✅ Wired |
| `/works/:slug` | `_public.works.$slug.tsx` | ✅ Wired |
| `/contact` | `_public.contact.tsx` | ✅ Wired |
| `/es` | `_public._index.tsx` (via `prefix('es', ...)`) | ✅ Wired |
| `/es/works` | `_public.works.tsx` (via prefix) | ✅ Wired |
| `/es/works/:slug` | `_public.works.$slug.tsx` (via prefix) | ✅ Wired |
| `/es/contact` | `_public.contact.tsx` (via prefix) | ✅ Wired |
| `/admin` | `admin._index.tsx` | ✅ Wired |
| `/admin/auth` | `admin.auth.tsx` | ✅ Wired |
| `/admin/auth/logout` | `admin.auth.logout.tsx` | ✅ Wired |
| `/admin/projects` | `admin.projects._index.tsx` | ✅ Wired |
| `/admin/projects/new` | `admin.projects.new.tsx` | ✅ Wired |
| `/admin/projects/:id` | `admin.projects.$id.tsx` | ✅ Wired |
| `/admin/reviews*` | `admin.reviews.tsx` + children | ✅ Wired (TODO scaffolds) |
| `/admin/contact*` | `admin.contact.tsx` + children | ✅ Wired (TODO scaffolds) |

## i18n Verified

| Namespace | `en/` | `es/` | Status |
|-----------|-------|-------|--------|
| `common` | ✅ | ✅ | PASS |
| `home` | ✅ | ✅ | PASS |
| `works` | ✅ | ✅ | PASS |
| `contact` | ✅ | ✅ | PASS |
| `admin` | ✅ | ❌ (intentional) | PASS — admin is en-only per locked D8 |

## SWR Keys Verified

| Key | Value | Status |
|-----|-------|--------|
| `swrKeys.home.featured()` | `['/api/v1/projects?featured=true', '/api/v1/reviews?featured=true']` | ✅ PASS |
| `swrKeys.home.metrics()` | `'/api/v1/home/metrics'` (blocked-on-backend) | ✅ PASS |
| `swrKeys.works.list()` | `'/api/v1/projects?isPublished=true&pageSize=100'` | ✅ PASS |
| `swrKeys.works.bySlug(slug)` | `'/api/v1/projects/${slug}'` | ✅ PASS |
| `swrKeys.contact.submit()` | `'/api/v1/contacts'` (plural, locked) | ✅ PASS |
| `swrKeys.admin.projects.list(filters)` | `'/api/v1/admin/projects?...'` | ✅ PASS |
| `swrKeys.admin.projects.byId(id)` | `'/api/v1/admin/projects/${id}'` | ✅ PASS |
| `swrKeys.admin.projects.stats()` | `'/api/v1/admin/projects/stats'` (blocked-on-backend) | ✅ PASS |
| `swrKeys.admin.reviews.list(filters)` | `'/api/v1/admin/reviews?...'` (deferred) | ✅ PASS |
| `swrKeys.admin.contact.list(filters)` | `'/api/v1/admin/contact?...'` (deferred) | ✅ PASS |

## Next Steps

- All findings resolved. Proceed to `sdd-archive`.

## Re-verification

**Date**: 2026-08-27
**Trigger**: Two fix commits pushed (`4f610cd`, `fd55239`) addressing C-1 and W-1.

| Check | Result |
|-------|--------|
| C-1: `useMemo` removed from `app/works/pages/works.tsx` | ✅ CONFIRMED — no `useMemo` import or call; `projectsBySlug` built via plain `for...of` loop (line 54-55) |
| C-1: No authored `useMemo` in `app/` (excluding `app/components/ui/`) | ✅ CONFIRMED — 5 comment-only matches, 0 code usages |
| W-1: `contactSchema` constraints match REQ-CON-1 | ✅ CONFIRMED — name min(1).max(100), subject min(1).max(150), message min(1).max(5000) |
| `bun run typecheck` | ✅ PASS (exit 0) |
| `bun run build` | ✅ PASS (client 67 assets, server 246.99 kB / 56.24 kB gzip) |

**Verdict**: GREEN — all CRITICAL and WARNING findings closed. Archive-ready.
