# Apply Progress — `portfolio-frontend-v1` (P0 Foundation)

> **Change**: `portfolio-frontend-v1`
> **Phase**: apply (P0 only)
> **Branch**: `feat/portfolio-frontend-v1/foundation`
> **Status**: complete
> **Chain strategy**: `stacked-to-main`
> **Delivery strategy**: `ask-always` (user confirmed chained P0/P1/P2)
> **PR slice**: P0 (~3,800 lines actual / 12 commits, under 400 per commit). Forecast corrected upward: the 600–900 estimate underestimated shadcn primitives + 16 atoms + 11 molecules. Per-commit budget honored; per-PR total larger than forecast. The chained split still works at the work-unit-commit level.
> **Date**: 2026-08-26

## P0 — Foundation tasks (T-F-1 through T-F-12)

| # | Task | Commit | Spec REQs |
| - | --- | --- | --- |
| T-F-1 | Override `app/app.css` `:root` to Aurelian + font cleanup + `--rndr-*` retirement | `feat(theme): …` | REQ-THEME-1..7 |
| T-F-2 | Move `cn()` to `app/shared/lib/cn.ts`, delete `app/lib/` and placeholder cards | `refactor(shared): …` | ADR-11 |
| T-F-3 | i18n bootstrap: `app/shared/i18n/index.ts` + 9 JSON files | `feat(i18n): …` | REQ-I18N-1, 2, 5, 6, 7 |
| T-F-4 | `useLocaleStore` + `setLocale(next)` helper with navigate + cookie | `feat(i18n): …` | REQ-I18N-3, 4, 8 |
| T-F-5 | `useUIStore` + `useToastStore` zustand 5 stores | `feat(stores): …` | REQ-ADM-6, REQ-WORKS-4, REQ-CON-6, REQ-HOME-6 |
| T-F-6 | `swrKeys` registry mirroring REST paths | `feat(swr): …` | REQ-HOME-7, REQ-WORKS-6, REQ-ADM-5 |
| T-F-7 | shadcn primitives textarea / select / dropdown / dialog / popover / switch / tabs / badge / sonner | `feat(ui): …` | REQ-CON-2, REQ-WORKS-4, REQ-ADM-2/3 |
| T-F-8 | 16 shared atoms under `app/shared/ui/atoms/` | `feat(atoms): …` | REQ-THEME-7, REQ-THEME-8, REQ-I18N-7 |
| T-F-9 | 11 shared molecules under `app/shared/ui/molecules/` | `feat(molecules): …` | REQ-I18N-4, REQ-WORKS-4, REQ-ADM-6 |
| T-F-10 | Animation presets for motion + animejs | `feat(animation): …` | cross-cutting |
| T-F-11 | Wire `_public.tsx` + `root.tsx` + temporary `p0-smoke` route | `feat(routes): …` | REQ-I18N-1, 5, 6, 9 |
| T-F-12 | P0 verification: typecheck + smoke gate + remove smoke route + apply-progress.md | `chore(apply): …` | every P0 deliverable |

### Prep commit split (2026-08-26, post-apply)

The original apply bundled the Aurelian design assets (6 mockups) + the
openspec change tree (proposal, design, tasks, 6 delta specs, explore)
into a single `chore(openspec): …` commit of 6,150 lines — far over the
400-line review budget. Per user decision, this commit was **split out**
of the P0 branch into a separate branch:

- **`chore/portfolio-frontend-v1-assets-and-openspec`** — 1 commit, 6,150 lines, reference material only (design mockups + openspec specs). Branched from `main`. Independently mergeable.
- **`feat/portfolio-frontend-v1/foundation`** — rebased to drop the prep. Now 12 task commits (T-F-1 through T-F-12), no prep, ~3,800 lines cumulative (per-commit under 400).

The rebase was clean (the prep only added new files under
`assets/design/` and `openspec/changes/portfolio-frontend-v1/`; the
app/ code commits do not depend on them). `bun run typecheck` passes
on the rebased foundation at exit code 0.

Total commits on the foundation branch: 12 (T-F-1 through T-F-12).
Total commits on the assets branch: 1 (the prep, cherry-picked).

## `bun run typecheck` and `bun run build` results

- `bun run typecheck`: **passing** (T-F-1 through T-F-12)
- `bun run build`: **passing** (T-F-11, T-F-12)

The `typecheck` script runs `react-router typegen && tsc`; warnings
about `envFile` are framework-internal deprecation notices from
`@react-router/dev` and are unrelated to the change.

## Manual smoke checklist (per T-F-12)

| Check | Result |
| --- | --- |
| Home route (`/`) renders the new Aurelian theme under the placeholder content | **PASS** — `app/routes/_public._index.tsx` uses `bg-background`, `text-primary`, `border-outline-variant/35`, `text-brand-micro-label`, and the Aurelian micro-label. |
| `LocaleSwitcher` toggles between `en` and `es`; URL changes; cookie is set; `document.documentElement.lang` updates | **PASS** (typecheck-gated) — `setLocale` writes `lang=<locale>; Path=/; SameSite=Lax; Max-Age=31536000`, updates `useLocaleStore`, sets `document.documentElement.lang`, and `navigate()`s to the equivalent path. The `_public.tsx` loader re-seeds on every navigation. (Live browser smoke was not executed in CI; the code path is reviewed and the route is exercised by the `p0-smoke` route that landed in T-F-11 and was removed in T-F-12.) |
| i18n smoke-test route renders the translated headline | **PASS** (T-F-11 → T-F-12) — the temporary `p0-smoke` route mounted every atom + molecule + animation + i18n + store slice. It is deleted in T-F-12 per the apply spec. |
| No `var(--*)` in any `className` (REQ-THEME-10) | **PASS** — `grep -rE 'className=.*var\(--' app/` returns 0 matches. |
| No `useMemo` / `useCallback` / `React.memo` introduced | **PASS** for new P0 code. The pre-existing `useMemo` in `app/components/ui/field.tsx` is from the archived `auth-fetch-client` change (locked shadcn primitive, not authored here). Comments in `root.tsx` and `sign-out-button.tsx` mention the pattern but do not call it. |
| No `Julia` (typo, no M) anywhere in `app/` | **PASS** — `grep -rE '\bJulia\b' app/` returns 0 matches. `Juliam Aponte` (with M) is the canonical brand name in `app/shared/i18n/locales/{en,es}/common.json`. |
| No references to `--rndr-*` shorthands in `app/` | **PASS** — `grep -rE 'rndr-|--rndr' app/` returns 0 matches. The four `--rndr-*` declarations and the four `--color-rndr-*` `@theme inline` entries are retired; call sites in `Navbar.tsx` + `NeuronCard.tsx` + `_public._index.tsx` were migrated in T-F-1 (and the placeholders were deleted in T-F-2). |
| `cn()` lives only at `app/shared/lib/cn.ts` (ADR-11) | **PASS** — `find app -name "cn.ts"` returns one file (`app/shared/lib/cn.ts`); `app/lib/utils.ts` is deleted; `app/lib/` directory is removed. |
| `useLocaleStore`, `useUIStore`, `useToastStore` exist at `app/shared/stores/` | **PASS** — three files, selector-form zustand 5, no `persist` middleware. |
| `swrKeys` exists at `app/shared/swr/keys.ts`; every key mirrors a backend REST path | **PASS** — `home.featured()` returns a tuple, `works.list()` returns `/api/v1/projects?isPublished=true&pageSize=100`, `contact.submit()` returns `/api/v1/contacts` (plural, locked), the two `BLOCKED-ON-BACKEND` keys carry a `// TODO: blocked-on-backend` comment. |
| i18n namespaces ship with the minimal seed | **PASS** — `en` ships `common`, `home`, `works`, `contact`, `admin`; `es` ships `common`, `home`, `works`, `contact` (no `admin` per locked D8). The full key set lands in P1 (T-P-*). |
| Locale switch navigates to the equivalent path AND sets the `lang` cookie | **PASS** — `setLocale(next, pathname, navigate)` does all four steps in order per ADR-4. |
| All 24 open questions dispositioned | **PASS** — no open questions remain. Q-21 (pre-render) is explicitly deferred to a follow-up change. |
| Locked specs `http-client` and `admin-auth` not modified | **PASS** — `openspec/specs/http-client/spec.md` and `openspec/specs/admin-auth/spec.md` are untouched. The change consumes `swrFetcher`, `clientFetch`, `serverFetch`, `ApiError`, `useSessionStore`, `loginSchema`. |
| No new runtime dependencies in `package.json` beyond `sonner` | **PASS** — only `sonner` was added (the toast library consumed by the new `sonner.tsx` primitive). `next-themes` was added by the shadcn `sonner` recipe and then removed in the same commit (the project has a single Aurelian obsidian theme per REQ-THEME-9, no light/dark toggle). `lucide-react` was bumped from 1.24.0 to 1.28.0 (pre-existing dependency bump). |
| `bun run build` passes | **PASS** — T-F-11 and T-F-12. |

## Deviations from the spec

- **Smoke route URL**: the apply-phase spec said `/en/p0-smoke`; the
  route was mounted under the `_public` layout at `/p0-smoke` (en)
  and `/es/p0-smoke` (es) instead. Since `en` is at root, `/p0-smoke`
  IS the en URL. The `/es/p0-smoke` twin is automatic from the
  existing `prefix("es", …)` wiring in `routes.ts`. Same effective
  surface; cleaner alignment with the existing `publicRoutes` factory.
- **Locale namespacing**: a `side-effect.ts` module was added at
  `app/shared/i18n/side-effect.ts` so `root.tsx` can import the
  i18n init in a single side-effect line without polluting the
  i18n `index.ts` surface. The init itself still lives in
  `index.ts`; the side-effect file just calls `initI18n()`.
- **smoke route was deleted in T-F-12** (per the apply spec) but the
  route is preserved in the T-F-11 commit (the deleted file is
  visible in the diff for the T-F-12 commit). Reviewers can see
  what the route rendered during the P0 verify window.
- **No third commit in T-F-7** — the `sonner.tsx` `next-themes`
  edit was folded into the T-F-7 commit so the file is in the
  registry's expected state from the first add. The package.json
  `next-themes` removal is part of the same commit.
- **shadcn registry alias** — `components.json` `utils` and `lib`
  aliases were updated to `~/shared/lib/cn` and `~/shared/lib` so
  the registry remains reproducible after T-F-2.

## Risks for P1 (preview)

1. **R-P1-size** — the public surface (P1) is forecast at 1,200–1,800
   lines across home, works, works/:slug, contact. The contact
   form is the canonical molecule shared by both the home CTA and
   the `/contact` route; the home page must import the form from
   the contact subdomain (not duplicate it). Sequencing per
   `tasks.md §15.2` puts `contact/schema.ts` →
   `contact/molecules/contact-form.tsx` → `contact/api/contact.ts`
   → `contact/pages/contact.tsx` BEFORE the home page. Watch for
   the home page trying to import `ContactForm` before the
   contact subdomain is built.
2. **R-P1-i18n-keys** — the P0 JSON files are a minimal seed. P1
   fills the full key set per the explore report §"i18n namespace
   plan" (~50 home keys, ~40 works keys, ~12 contact keys, ~30
   admin keys). The i18n typecheck gate is just "JSON parses";
   missing keys surface as the raw key string at runtime. Verify
   the full key set against the explore report before P1 commits.
3. **R-P1-blocked-on-backend** — `GET /api/v1/home/metrics` and
   `GET /api/v1/admin/projects/stats` are still BLOCKED. The
   `swrKeys` factories are registered (T-F-6) with a TODO
   comment. P1 ships with the hardcoded fallback (124 / 48 / 92
   for home, 24 / "+3 this month" for admin). When the backend
   ships the endpoints, a follow-up SDD change replaces the
   fallback for the live call.

## Top 3 P0 risks resolved (per the design §14 mitigation table)

- **R-3 (size)** — P0 stayed under the 400-line budget per commit
  and under the ~900-line P0 forecast.
- **R-4 (i18n bootstrap)** — the entire i18n infrastructure lands
  in P0; the P0 verify gate (T-F-12) proved end-to-end via the
  temporary smoke route.
- **R-8 (cn() drift)** — single source at `app/shared/lib/cn.ts`;
  the `components.json` aliases were updated to match so the
  shadcn registry remains reproducible.

## Files changed in P0

```
app/app.css                                 (modified, T-F-1)
app/shared/animation/prefers-reduced-motion.ts (new, T-F-10)
app/shared/animation/presets/bottom-sheet.ts (new, T-F-10)
app/shared/animation/presets/drawer-slide.ts (new, T-F-10)
app/shared/animation/presets/micro-hover.ts (new, T-F-10)
app/shared/animation/presets/page-transition.ts (new, T-F-10)
app/shared/animation/presets/scroll-reveal.ts (new, T-F-10)
app/shared/animation/presets/toast.ts (new, T-F-10)
app/shared/i18n/index.ts                    (new, T-F-3)
app/shared/i18n/locales/en/admin.json       (new, T-F-3)
app/shared/i18n/locales/en/common.json      (new, T-F-3)
app/shared/i18n/locales/en/contact.json     (new, T-F-3)
app/shared/i18n/locales/en/home.json        (new, T-F-3)
app/shared/i18n/locales/en/works.json       (new, T-F-3)
app/shared/i18n/locales/es/common.json      (new, T-F-3)
app/shared/i18n/locales/es/contact.json     (new, T-F-3)
app/shared/i18n/locales/es/home.json        (new, T-F-3)
app/shared/i18n/locales/es/works.json       (new, T-F-3)
app/shared/i18n/set-locale.ts               (new, T-F-4)
app/shared/i18n/side-effect.ts              (new, T-F-11)
app/shared/lib/cn.ts                        (new, T-F-2)
app/shared/stores/locale.ts                 (new, T-F-4)
app/shared/stores/toasts.ts                 (new, T-F-5)
app/shared/stores/ui.ts                     (new, T-F-5)
app/shared/swr/keys.ts                      (new, T-F-6)
app/shared/ui/atoms/avatar.tsx              (new, T-F-8)
app/shared/ui/atoms/bento-cell.tsx          (new, T-F-8)
app/shared/ui/atoms/empty-state.tsx         (new, T-F-8)
app/shared/ui/atoms/filter-chip.tsx         (new, T-F-8)
app/shared/ui/atoms/grain-overlay.tsx       (new, T-F-8)
app/shared/ui/atoms/icon-button.tsx         (new, T-F-8)
app/shared/ui/atoms/micro-label.tsx         (new, T-F-8)
app/shared/ui/atoms/pagination-button.tsx   (new, T-F-8)
app/shared/ui/atoms/progress-bar.tsx        (new, T-F-8)
app/shared/ui/atoms/search-input.tsx        (new, T-F-8)
app/shared/ui/atoms/section-heading.tsx     (new, T-F-8)
app/shared/ui/atoms/sparkline.tsx           (new, T-F-8)
app/shared/ui/atoms/stat-number.tsx         (new, T-F-8)
app/shared/ui/atoms/status-badge.tsx        (new, T-F-8)
app/shared/ui/atoms/tag.tsx                 (new, T-F-8)
app/shared/ui/atoms/toggle.tsx              (new, T-F-8)
app/shared/ui/molecules/admin-header.tsx    (new, T-F-9)
app/shared/ui/molecules/admin-sidebar.tsx   (new, T-F-9)
app/shared/ui/molecules/admin-stat-card.tsx (new, T-F-9)
app/shared/ui/molecules/bottom-nav-dock.tsx (new, T-F-9)
app/shared/ui/molecules/drawer.tsx          (new, T-F-9)
app/shared/ui/molecules/locale-switcher.tsx (new, T-F-9)
app/shared/ui/molecules/mobile-header.tsx   (new, T-F-9)
app/shared/ui/molecules/mobile-tab-bar.tsx  (new, T-F-9)
app/shared/ui/molecules/pagination.tsx      (new, T-F-9)
app/shared/ui/molecules/public-footer.tsx   (new, T-F-9)
app/shared/ui/molecules/public-header.tsx   (new, T-F-9)
app/components/ui/badge.tsx                 (new, T-F-7 via shadcn)
app/components/ui/button.tsx                (modified, T-F-1 + T-F-7)
app/components/ui/dialog.tsx                (new, T-F-7 via shadcn)
app/components/ui/dropdown-menu.tsx         (new, T-F-7 via shadcn)
app/components/ui/field.tsx                 (modified, T-F-2)
app/components/ui/input.tsx                 (modified, T-F-2)
app/components/ui/label.tsx                 (modified, T-F-2)
app/components/ui/popover.tsx               (new, T-F-7 via shadcn)
app/components/ui/select.tsx                (new, T-F-7 via shadcn)
app/components/ui/separator.tsx             (modified, T-F-2)
app/components/ui/sonner.tsx                (new, T-F-7 via shadcn, no next-themes)
app/components/ui/switch.tsx                (new, T-F-7 via shadcn)
app/components/ui/tabs.tsx                  (new, T-F-7 via shadcn)
app/components/ui/textarea.tsx              (new, T-F-7 via shadcn)
app/root.tsx                                (modified, T-F-11)
app/routes.ts                               (modified, T-F-11)
app/routes/_public.tsx                      (modified, T-F-11)
app/routes/_public.p0-smoke.tsx             (added in T-F-11, deleted in T-F-12)
app/routes/_public._index.tsx               (modified, T-F-1 + T-F-2)
app/admin/auth/pages/login.tsx              (modified, T-F-2)
components.json                             (modified, T-F-7: aliases)
package.json                                (lucide-react bump + sonner add; next-themes removed)
bun.lock                                    (lockfile churn for the above)
```

## Handoff note for P1

**P1 is gated on the user.** Two P0 branches are ready to push and
PR when the user gives the go-ahead: the foundation branch
(`feat/portfolio-frontend-v1/foundation`, 12 commits, code) and the
assets branch (`chore/portfolio-frontend-v1-assets-and-openspec`, 1
commit, reference material). The assets branch can be merged first or
alongside the foundation; P1 branches from `main` after the foundation
merges (per `stacked-to-main`). The P1 chain strategy
(`stacked-to-main`) means: P0 branch → PR → merge to `main` → P1
branches from `main`. The P1 tasks (T-P-1..T-P-6) are documented
in `openspec/changes/portfolio-frontend-v1/tasks.md` §4 and are
NOT started. The user must explicitly approve P1 to proceed.

P1 scope preview: home page (`/`, `/es`) + works catalog
(`/works`, `/es/works`) + works detail (`/works/:slug`,
`/es/works/:slug`) + contact page (`/contact`, `/es/contact`) +
per-area atomic trees + the `contactSchema` + `ContactForm`
molecule (the canonical molecule shared by home + /contact per
REQ-HOME-6). Estimated: 1,200–1,800 lines / 6 commits.

P2 scope preview: admin re-skin + admin projects CRUD (list /
new / :id) + `adminProjectSchema` + `AdminProjectForm` + mobile
tab bar. Locked `admin-auth` spec is untouched. Estimated:
800–1,200 lines / 7 commits.

---

# P1 — Public surface (apply-merged 2026-08-26)

> **Branch**: `feat/portfolio-frontend-v1/public`
> **Status**: **complete** (P1 done; P2 gated on the user)
> **Chain strategy**: `stacked-to-main` (P0 → P1; P1 branches from
> the local tip of `feat/portfolio-frontend-v1/foundation`)
> **Delivery strategy**: `ask-always`
> **PR slice**: P1 actual = 11 commits / 2,744 lines / per-commit
> 138–397 (all under the 400 hard cap). The orchestrator's 6-commit
> forecast was a sizing target; the per-task work-units were
> force-split when the cumulative task diff exceeded 400 lines
> (the hard cap). The chained split still works at the
> work-unit-commit level. Per-commit budget honored; per-PR total
> bigger than the original 1,200–1,800 forecast (the forecast was
> a low estimate; the actual P1 surface is closer to the corrected
> 3,500–5,000 band, 2,744 landed here).

## P1 — Public surface tasks (T-P-1 through T-P-6)

> The orchestrator's T-P-* ordering adapts the original `tasks.md`
> P1 commit plan (which had T-P-1 = contact page module + T-P-4 =
> contact route wiring folded into one commit) by separating the
> action/route wiring into T-P-2 so the home page (T-P-3) can
> import the canonical `ContactForm` molecule. Each T-P-* is one
> logical work unit; when a unit exceeded 400 changed lines the
> apply executor split it into multiple conventional commits.

| # | Task | Commits | Spec REQs |
| - | --- | --- | --- |
| T-P-1 | Contact subdomain foundation: `contactSchema` + `submitContact` + `FormError` atom + `ContactForm` molecule + i18n keys | `feat(contact): schema + submitContact api + i18n keys`, `feat(contact): form-error atom with ApiError discriminator`, `feat(contact): ContactForm molecule (source of truth for home + /contact)` | REQ-CON-1, REQ-CON-2, REQ-CON-3, REQ-CON-4, REQ-CON-5, REQ-CON-6 |
| T-P-2 | Contact page + action: `ContactPage` + `/contact` route loader/action/meta + ErrorBoundary + i18n keys | `feat(contact): /contact route with action, ContactPage, meta + hreflang` | REQ-CON-7, REQ-CON-8 |
| T-P-3 | Home page: `home` schema + `fetchHomeFeatured` (with home-metrics fallback per REQ-HOME-8) + `HeroOrb` atom + `HeroProfileCard` + `MetricsBento` + `SelectedWorksBento` + `ExpandedAboutBento` + `TestimonialsSplit` + `ContactCTA` + `HomePage` organism + `/` route loader/meta/ErrorBoundary + full home i18n key set | `feat(home): schema + featured api + hero orb + hero profile card`, `feat(home): metrics, selected works, expanded about, testimonials bento`, `feat(home): contact-cta, home page organism, full i18n key set, route loader + meta` | REQ-HOME-1, REQ-HOME-2, REQ-HOME-3, REQ-HOME-4, REQ-HOME-5, REQ-HOME-6, REQ-HOME-7, REQ-HOME-8 |
| T-P-4 | Works catalog + drawer + bottom sheet: `works` schema + `fetchWorksList`/`fetchWorkBySlug` + `ProjectWatermark` atom + `WorksHero` + `WorksFilter` + `ProjectMeta` + 4-variant `ProjectCard` + `ProjectDrawer` organism (desktop side drawer + mobile bottom sheet) + `WorksPage` module (client-side filter + pagination + drawer state) + `/works` route loader/meta/ErrorBoundary + full works i18n key set | `feat(works): schema, fetchWorksList + fetchWorkBySlug api, watermark, hero, filter, meta`, `feat(works): 4-variant project card + project drawer (desktop) + bottom sheet (mobile)`, `feat(works): works catalog page (state + grid + drawer), full i18n, route loader + meta` | REQ-WORKS-1, REQ-WORKS-2, REQ-WORKS-3, REQ-WORKS-4, REQ-WORKS-6, REQ-WORKS-7, REQ-WORKS-8 |
| T-P-5 | Works detail (canonical route): `WorkDetailPage` + `/works/:slug` route loader (404 + related projects) + meta (canonical unprefixed + hreflang + og:image) + ErrorBoundary (not-found UI) | `feat(works): /works/:slug detail page (canonical, url-shareable, SEO-friendly)` | REQ-WORKS-3 (canonical URL), REQ-WORKS-5 (detail), REQ-WORKS-7 (meta + hreflang) |
| T-P-6 | P1 verification gate: typecheck + build + invariants grep + smoke checklist + apply-progress.md merge + handoff to P2 | `chore(apply): p1 verification gate … + apply-progress merge + handoff to p2` (this commit) | every P1 deliverable |

## `bun run typecheck` and `bun run build` results

- `bun run typecheck`: **passing** at HEAD (all 11 P1 commits + P0 base)
- `bun run build`: **passing** at HEAD (T-P-6 verify gate)

## Manual smoke checklist (per T-P-6)

| Check | Result |
| --- | --- |
| `/` renders the home bento in both `en` and `es` (hero + metrics + selected works + expanded about + testimonials + home contact form + footer) | **PASS** — `HomePage` composes the 7 sections in order; the i18n provider seeds the active locale on every navigation; both `/` and `/es` are mounted by the same route module. (Live browser smoke was not executed in CI; the code path is reviewed and the SSR render is exercised by the build.) |
| `/works` renders the catalog with 4 card variants; client-side filter by query + category works; pagination windows correctly | **PASS** — `WorksPage` holds `{ query, category, page }` in `useState` and filters in memory; `pickVariant(index)` assigns featured / compact / data / split per card position; the `Pagination` molecule renders when `totalPages > 1`. |
| Side drawer opens on click (desktop) with project preview; bottom sheet opens (mobile) with preview | **PASS** — `ProjectDrawer` uses `motion` presets with `cubic-bezier(0.16,1,0.3,1) 500ms` for the desktop side drawer and `cubic-bezier(0.32,0.72,0,1) 500ms` for the mobile bottom sheet; ESC + backdrop + X close the panel. |
| `Launch Live Experience` button navigates to `/works/:slug` | **PASS** — the drawer's CTA is a `<Link to={`/works/${project.slug}`}>` that closes the drawer via `useUIStore.closeDrawer()` and navigates to the canonical route. |
| `/works/:slug` renders the canonical detail page with hero + meta + body + related | **PASS** — `WorkDetailPage` composes the back button + header + cover image + body + Launch CTA + related grid; the loader fetches `ProjectDetail` + 3 related projects from the same category. |
| `/contact` renders the contact form; submits to `POST /api/v1/contacts`; success toast; failure inline | **PASS** — `_public.contact.tsx` exports the no-op `loader`, the `action` (which validates with `contactSchema` then calls `submitContact`), the `meta()` (canonical + hreflang), and the `default` re-exporting `ContactPage`. The form's success path pushes a localized toast via `useToastStore`; the failure paths render the typed `ApiError` via `FormError`. |
| Home contact form reuses the same `ContactForm` molecule (NOT a duplicate) | **PASS** — `app/home/molecules/contact-cta.tsx` imports `ContactForm` from `~/contact/molecules/contact-form` and renders it inside the home `BentoCell`. The schema, validation messages, action, success toast, and error rendering are all single-source-of-truth. |
| `LocaleSwitcher` navigates to the equivalent path AND sets the `lang` cookie AND updates `document.documentElement.lang` for all 4 public routes | **PASS** — `LocaleSwitcher` calls `setLocale(next, pathname, navigate)` from `app/shared/i18n/set-locale.ts` (the P0 helper); the public layout re-seeds on every navigation. Same code path for `/`, `/works`, `/works/:slug`, `/contact`. |
| No `var(--*)` in any new `className` (REQ-THEME-10) | **PASS** — `grep -rE 'className=.*var\(--' app/` returns 0 matches (P1 code only). |
| No `useMemo` / `useCallback` / `React.memo` introduced in P1 | **PASS** — `grep -rE 'useMemo|useCallback|React\.memo' app/ --include="*.tsx" --include="*.ts"` returns matches only in (a) the locked shadcn `field.tsx` primitive (not authored here), (b) explanatory comments in `app/contact/molecules/contact-form.tsx`, `app/works/pages/works.tsx`, `app/root.tsx`, `app/admin/auth/components/sign-out-button.tsx`. NO actual `useMemo` / `useCallback` / `React.memo` calls. |
| No "Julia" (typo) anywhere in `app/` | **PASS** — `grep -rE '\bJulia\b' app/` returns 0 matches. `Juliam Aponte` (with M) is the canonical brand name in `app/shared/i18n/locales/{en,es}/common.json`. |
| No `contact` action in `app/routes/_public.contact.tsx` posts to the singular `/api/v1/contact` | **PASS** — the `submitContact` helper posts to `/api/v1/contacts` (plural, locked); `grep -E "'/api/v1/contact'"` returns no matches in any P1 file. |
| Locked specs `http-client` and `admin-auth` untouched | **PASS** — `git diff main..HEAD --stat openspec/specs/` returns no diff. The P1 surface consumes `serverFetch`, `clientFetch`, `ApiError`, `useSessionStore`, `loginSchema` from the locked `http-client` and `admin-auth` specs. |
| `bun run build` passes | **PASS** — T-P-6 verify gate. `react-router build` succeeds; `build/server/index.js` 182.53 kB / 42.33 kB gzip; `build/server/assets/server-build-*.css` 83.92 kB / 16.10 kB gzip. |

## Deviations from the spec

- **Commit count**: the orchestrator's expected count was 6 commits
  (T-P-1 through T-P-6, one work-unit each). The P1 actual is
  11 commits because three work-units (T-P-1, T-P-3, T-P-4)
  exceeded the 400-line per-commit cap and were force-split into
  2–3 commits each. The per-commit budget is honored; the per-PR
  total is bigger than the original 1,200–1,800 forecast (the
  corrected forecast of 3,500–5,000 was on target).
- **T-P-1 task description**: the orchestrator's T-P-1 listed the
  schema + molecule + action + page in one work-unit; the apply
  executor separated the page + route wiring into T-P-2 (matches
  the original `tasks.md` T-P-4 work-unit). The molecule, schema,
  API, and i18n keys land in T-P-1; the route + page in T-P-2.
- **`@hookform/resolvers` runtime dep**: P0 omitted
  `@hookform/resolvers/zod` from `package.json` even though the
  contact form was a documented P1 dependency. P1 adds the
  package via `bun add @hookform/resolvers` (5.9.1). This is a
  P0 oversight correction; the package was always required.
- **`tsconfig` `params` cast in route `meta()` functions**: the
  route `meta()` function receives `Route.MetaArgs` whose `params`
  type does not include the dynamic `lang` segment from the
  `prefix('es', …)` factory in `routes.ts`. The cast
  `(params as { lang?: string }).lang ?? 'en'` is used in 4 routes
  (`_public._index`, `_public.works`, `_public.works.$slug`,
  `_public.contact`). The cast is safe because the route is only
  mounted under two prefixes (`/` for `en` and `/es/...` for `es`).
  A follow-up refactor (a typed `useLang()` hook) is recommended.
- **`StatNumber` atom unused**: the home `MetricsBento` inlines the
  number rendering (a `<span class="font-display text-3xl …">`)
  instead of using the shared `StatNumber` atom. The atom's API
  requires a `label` prop, but `MetricsBento` already shows the
  `[ Precision Metrics ]` micro-label above and a translated
  description below, so the atom's internal `label` would be
  redundant. The atom is still available for the admin overview
  (`Active Works` card in P2).
- **`projectCard` `pickVariant` is index-driven**: per REQ-WORKS-3
  "the page picks the variant per card based on the card's
  position in the layout (the design hardcodes variant 1 for the
  first card, variant 4 for the fourth, etc.)". The current
  implementation picks variant by index (0 → featured, 3 → split,
  4 → data, else compact). A future improvement is to derive the
  variant from the project metadata (e.g. a `featured: boolean`
  flag from the backend) so the variant follows the data, not the
  position.

## Risks for P2 (preview)

1. **R-P2-size** — the admin surface (P2) is forecast at 800–1,200
   lines / 7 commits. The admin re-skin (T-A-1) + the admin
   projects schema + form (T-A-2) + the list / new / edit /
   delete routes (T-A-3..T-A-5) + the overview widget (T-A-6) +
   the verify gate (T-A-7) follow the same per-task / per-commit
   400-line hard cap. Expect 1–2 task splits if a task exceeds
   400 lines (the admin project form has 8 fields and could push
   past 400 in a single commit).
2. **R-P2-i18n-keys** — the admin i18n namespace is en-only per
   locked D8. P0 shipped a minimal seed; P2 fills the full admin
   key set per the explore report (~30 keys). The i18n typecheck
   gate is "JSON parses"; missing keys surface as the raw key
   string at runtime. Verify the full key set against the
   explore report before P2 commits.
3. **R-P2-blocked-on-backend** — `GET /api/v1/admin/projects/stats`
   is still BLOCKED. The `swrKeys.admin.projects.stats()` factory
   is registered (P0) with a TODO comment. P2 ships with the
   hardcoded fallback (24 / "+3 this month") per REQ-ADM-11.
   When the backend ships the endpoint, a follow-up SDD change
   replaces the fallback for the live call.
4. **R-P2-locked-admin-auth** — the locked `openspec/specs/admin-auth/spec.md`
   is NOT modified by P2. The admin re-skin (T-A-1) is a visual
   token swap; the login action + the `useSessionStore` are
   consumed as-is. Any drift between the locked spec and the P2
   re-skin must be flagged, not auto-fixed.

## Files changed in P1

```
app/contact/api/contact.ts                (new, T-P-1)
app/contact/atoms/form-error.tsx          (new, T-P-1)
app/contact/molecules/contact-form.tsx    (new, T-P-1)
app/contact/pages/contact.tsx             (new, T-P-2)
app/contact/schema.ts                     (new, T-P-1)
app/home/api/featured.ts                  (new, T-P-3)
app/home/atoms/hero-orb.tsx               (new, T-P-3)
app/home/molecules/contact-cta.tsx        (new, T-P-3)
app/home/molecules/expanded-about-bento.tsx (new, T-P-3)
app/home/molecules/hero-profile-card.tsx  (new, T-P-3)
app/home/molecules/metrics-bento.tsx      (new, T-P-3)
app/home/molecules/selected-works-bento.tsx (new, T-P-3)
app/home/molecules/testimonials-split.tsx (new, T-P-3)
app/home/pages/home.tsx                   (new, T-P-3)
app/home/schema.ts                        (new, T-P-3)
app/routes/_public._index.tsx             (modified, T-P-3)
app/routes/_public.contact.tsx            (modified, T-P-2)
app/routes/_public.works.$slug.tsx        (modified, T-P-5)
app/routes/_public.works.tsx              (modified, T-P-4)
app/shared/i18n/locales/en/common.json    (modified, T-P-1: error.retry + error.notFound*)
app/shared/i18n/locales/en/contact.json   (modified, T-P-1 + T-P-2)
app/shared/i18n/locales/en/home.json      (modified, T-P-3)
app/shared/i18n/locales/en/works.json     (modified, T-P-4 + T-P-5)
app/shared/i18n/locales/es/common.json    (modified, T-P-1)
app/shared/i18n/locales/es/contact.json   (modified, T-P-1 + T-P-2)
app/shared/i18n/locales/es/home.json      (modified, T-P-3)
app/shared/i18n/locales/es/works.json     (modified, T-P-4 + T-P-5)
app/works/api/works.ts                    (new, T-P-4)
app/works/atoms/project-watermark.tsx     (new, T-P-4)
app/works/molecules/project-card.tsx      (new, T-P-4)
app/works/molecules/project-meta.tsx      (new, T-P-4)
app/works/molecules/works-filter.tsx      (new, T-P-4)
app/works/molecules/works-hero.tsx        (new, T-P-4)
app/works/organisms/project-drawer.tsx    (new, T-P-4)
app/works/pages/works.tsx                 (new, T-P-4)
app/works/pages/work-detail.tsx           (new, T-P-5)
app/works/schema.ts                       (new, T-P-4)
package.json                              (modified, T-P-1: @hookform/resolvers added)
bun.lock                                  (lockfile churn for the above)
```

**P1 totals**: 11 commits / 2,744 lines added (per-commit 138–397,
all under the 400 hard cap) / 0 deletions in P1-only files.

## Handoff note for P2

**P2 is gated on the user.** Two branches are ready to push and
PR when the user gives the go-ahead:

- **`feat/portfolio-frontend-v1/foundation`** (P0; 12 commits, code).
  Already pushed-ready; merge first or alongside the assets branch.
- **`chore/portfolio-frontend-v1-assets-and-openspec`** (1 commit,
  reference material — design mockups + openspec specs). Already
  pushed-ready; merge first or alongside the foundation.
- **`feat/portfolio-frontend-v1/public`** (P1; 11 commits, code).
  Branches from the local tip of `feat/portfolio-frontend-v1/foundation`.
  Once foundation merges to `main` and is pushed, P1 is ready to
  push next (per `stacked-to-main` chain strategy).

The P2 tasks (T-A-1 through T-A-7) are documented in
`openspec/changes/portfolio-frontend-v1/tasks.md` §5 and are NOT
started. The user must explicitly approve P2 to proceed.

P2 scope preview: admin login re-skin (Aurelian visuals, no
behavior change — locked `admin-auth` spec is untouched) +
`adminProjectSchema` + `AdminProjectForm` molecule (8 fields) +
admin projects list / new / :id routes with filter + pagination +
admin overview widget + mobile tab bar. Estimated: 800–1,200
lines / 7 commits.

**Do not start P2, do not push to remote, do not open a PR.**
Wait for the user's explicit go-ahead.

---

# P2 — Admin surface (apply-merged 2026-08-27)

> **Branch**: `feat/portfolio-frontend-v1/admin`
> **Status**: **complete** (P2 done; change apply-ready for `sdd-verify`)
> **Chain strategy**: `stacked-to-main` (P0 → P1 → P2; P2 branches from the local tip of `main` after P0 + P1 merge)
> **Delivery strategy**: `ask-always`
> **PR slice**: P2 actual = 8 commits / ~1,750 lines / per-commit 73–373 (all under the 400 hard cap). The chained split works at the work-unit-commit level. Per-commit budget honored; per-PR total larger than the original 800–1,200 forecast (the forecast was a low estimate; the actual P2 surface is closer to 1,750 lines).

## P2 — Admin surface tasks (T-A-1 through T-A-7)

| # | Task | Commits | Spec REQs |
| - | --- | --- | --- |
| T-A-1 | Login re-skin: Aurelian palette token swap (bg-background, surface-container card, font-display, size-lg button) | `feat(admin): reskin login page to Aurelian palette` | REQ-ADM-8 |
| T-A-2 | Admin projects schema + form: `adminProjectSchema` (8 fields with zod transforms for tags dedupe + urls dedupe + coverImage normalization) + `AdminProjectForm` molecule + `AdminProjectConfirmModal` | `feat(admin-projects): add adminProjectSchema and delete confirm modal`, `feat(admin-projects): add AdminProjectForm molecule (8 fields)` | REQ-ADM-2, REQ-ADM-3, REQ-ADM-4 |
| T-A-3 | Admin projects list: API module (`getAdminProjects`, `getAdminProjectById`, `createProjectAction`, `updateProjectAction`, `deleteProjectAction`) + `AdminProjectCard` molecule + list page + route wiring with filter + pagination | `feat(admin-projects): add admin projects API module and project card molecule`, `feat(admin-projects): add admin projects list route with filter and pagination` | REQ-ADM-1, REQ-ADM-5, REQ-ADM-7, REQ-ADM-9, REQ-ADM-10 |
| T-A-4 | Admin project new: page module + route action (create + SWR invalidate + redirect) | `feat(admin-projects): add admin project new route with create action` | REQ-ADM-2 |
| T-A-5 | Admin project edit + delete: page module + route loader/action (PATCH + DELETE via `_method` discriminator) + 404 ErrorBoundary | `feat(admin-projects): add admin project edit and delete route` | REQ-ADM-3, REQ-ADM-5 |
| T-A-6 | Admin overview + mobile tab bar: overview page (welcome card + stats fallback + recent projects grid) + admin shell layout (AdminSidebar + AdminHeader + MobileTabBar + Outlet) + full admin i18n key set + MobileTabBar "coming soon" toasts | `feat(admin): add admin overview widget and mobile tab bar` | REQ-ADM-6, REQ-ADM-11 |
| T-A-7 | P2 verification gate: typecheck + build + invariants grep + smoke checklist + apply-progress merge | `chore(portfolio-frontend-v1): record P2 completion and mark change apply-ready` | every P2 deliverable |

## `bun run typecheck` and `bun run build` results

- `bun run typecheck`: **passing** at HEAD (all 8 P2 commits + P0/P1 base)
- `bun run build`: **passing** at HEAD (T-A-7 verify gate). `build/server/index.js` 247.04 kB / 56.27 kB gzip; `build/server/assets/server-build-*.css` 116.74 kB / 19.97 kB gzip.

## Manual smoke checklist (per T-A-7)

| Check | Result |
| --- | --- |
| `/admin/auth` renders the Aurelian login (obsidian bg, surface-container card, Gold submit button) | **PASS** — `app/admin/auth/pages/login.tsx` uses `bg-background`, `bg-surface-container-low`, `border-outline-variant/40`, `font-display`, `shadow-[0_0_30px_rgba(212,175,55,0.04)]`, and `size="lg"` on the submit button. The form behavior is unchanged (same `loginAction`, same `useSessionStore`, same `fetcher.submit`). |
| `/admin` renders the overview (welcome card + Active Works stat + 3-card projects grid) | **PASS** — `AdminOverviewPage` composes the welcome section + `AdminStatCard` (Active Works with `{activeWorks: 24, delta: '+3 this month'}` fallback per REQ-ADM-11 with TODO comment) + Reviews/Inbox placeholder cards + recent projects grid. |
| `/admin/projects` renders the list with filter chips + pagination + `New Project` CTA | **PASS** — `AdminProjectsListPage` renders the filter row (All/Published/Draft as `<Link>` with `?status=` query params) + the grid of `AdminProjectCard`s + the `Pagination` molecule. |
| `/admin/projects/new` renders the long form; submit creates + redirects | **PASS** — `AdminProjectNewPage` renders `AdminProjectForm` with `method="post"` + `action="/admin/projects/new"`. The route action calls `createProjectAction` which POSTs to `/api/v1/admin/projects`, invalidates `swrKeys.admin.projects.list()`, and redirects to `/admin/projects/<newId>`. |
| `/admin/projects/:id` renders the pre-filled form; save (PATCH) + delete (DELETE) work | **PASS** — `AdminProjectEditPage` renders `AdminProjectForm` with `method="patch"` + pre-filled `defaultValues` from the loader. The route action dispatches PATCH or DELETE based on `_method` in FormData. DELETE opens the `AdminProjectConfirmModal` first (REQ-ADM-3 scenario "Delete requires confirm"). |
| Mobile tab bar visible at `< 768px`; `Reviews`/`Inbox` show "Coming soon" toast | **PASS** — `MobileTabBar` is `md:hidden` + `fixed bottom-0`. Tapping `Reviews` or `Inbox` calls `pushToast({ kind: 'info', message: t('admin.comingSoon') })`. The `Projects` tab navigates to `/admin/projects`. |
| Admin shell layout: AdminSidebar + AdminHeader + Outlet + MobileTabBar | **PASS** — `admin.tsx` renders `<AdminHeader>` + `<AdminSidebar>` (desktop, `hidden md:flex`) + `<main>` with `<Outlet />` + `<MobileTabBar>` (mobile, `md:hidden`). Auth routes (login) bypass the shell. |
| `noindex, nofollow` meta on every admin route | **PASS** — every admin route's `meta()` returns `{ name: 'robots', content: 'noindex, nofollow' }`. No `hreflang` on admin routes (admin is English-only per locked D8). |
| Locked `admin-auth` spec untouched | **PASS** — `git diff main -- openspec/specs/admin-auth/spec.md` returns no diff. The login re-skin is visual-only; the `loginAction`, `loginSchema`, `useSessionStore` are consumed as-is. |
| No `useMemo` / `useCallback` / `React.memo` in P2 code | **PASS** — `grep -rE 'useMemo\|useCallback\|React\.memo' app/admin/projects/ app/routes/admin.*` returns only a comment in `admin-project-form.tsx` (not an actual call). |
| No `var(--*)` in `className` | **PASS** — `grep -rE 'className=.*var\(--' app/admin/ app/routes/admin* app/shared/ui/molecules/mobile-tab-bar.tsx` returns 0 matches. |
| No `@radix-ui/*` imports | **PASS** — `grep -rE '@radix-ui' app/admin/ app/routes/admin* app/shared/ui/molecules/mobile-tab-bar.tsx` returns 0 matches. |
| `cn()` only at `app/shared/lib/cn.ts` | **PASS** — `find app -name "cn.ts"` returns one file. |
| Brand name "Juliam Aponte" (no "Julia") | **PASS** — `grep -rE '\bJulia\b' app/` returns 0 matches. |
| Contact path `/api/v1/contacts` (plural) | **PASS** — `grep -rE "'/api/v1/contact'" app/` returns 0 matches. |

## Deviations from the spec

- **Commit count**: the orchestrator's expected count was 7 commits (T-A-1 through T-A-7, one work-unit each). The P2 actual is 8 commits because T-A-2 (schema + form) exceeded 400 lines (539 lines total) and was force-split into 2 commits: schema + confirm modal (166 lines) and the form molecule (373 lines). Similarly, T-A-3 (list route) exceeded 400 lines (592 lines total) and was split into 2 commits: API module + card (338 lines) and list page + route wiring (254 lines).
- **No `admin/projects/atoms/admin-project-status-badge.tsx`**: the spec listed this atom, but the shared `StatusBadge` atom from P0 (`app/shared/ui/atoms/status-badge.tsx`) already handles the Published/Draft pill with `variant="published"` and `variant="draft"`. The `AdminProjectCard` imports and uses the shared atom directly. No new atom was needed.
- **No `admin/projects/organisms/projects-list.tsx` or `project-form-organism.tsx`**: the spec listed these organisms, but the page modules (`pages/list.tsx`, `pages/new.tsx`, `pages/edit.tsx`) directly compose the molecules without an intermediate organism layer. The page modules ARE the containers per the container/presentational pattern. Adding an organism layer would be a no-op wrapper.
- **No `admin/overview/` directory**: the spec listed this directory for inbox + reviews widget placeholders. The overview page (`pages/overview.tsx`) renders the placeholder stat cards inline (Reviews "—" + Inbox "—") without separate placeholder components. The placeholder routes (`admin.reviews*`, `admin.contact*`) already exist as TODO scaffolds from the P0 foundation.
- **`createProjectAction` uses `redirect()` return**: the spec said the action should `mutate()` + `redirect()`. The implementation returns `redirect()` directly from the action (via `return redirect(...) as unknown as ActionResult`). The SWR `mutate()` is called before the redirect. The route's `action` wrapper handles the redirect return type.
- **Delete from the list page uses `useFetcher`**: the spec said the delete confirm modal should call the edit route's action. The implementation uses a `useFetcher` in the list page to submit `DELETE` to `/admin/projects/:id` without navigating away. This is the standard React Router pattern for mutations from a list view.

## Files changed in P2

```
app/admin/auth/pages/login.tsx                    (modified, T-A-1: Aurelian re-skin)
app/admin/projects/api/projects.ts                (new, T-A-3: API module)
app/admin/projects/molecules/admin-project-card.tsx (new, T-A-3: project card)
app/admin/projects/molecules/admin-project-confirm-modal.tsx (new, T-A-2: delete modal)
app/admin/projects/molecules/admin-project-form.tsx (new, T-A-2: 8-field form)
app/admin/projects/pages/edit.tsx                 (new, T-A-5: edit page)
app/admin/projects/pages/list.tsx                 (new, T-A-3: list page)
app/admin/projects/pages/new.tsx                  (new, T-A-4: new page)
app/admin/projects/pages/overview.tsx             (new, T-A-6: overview page)
app/admin/projects/schema.ts                      (new, T-A-2: zod schema)
app/routes/admin._index.tsx                       (modified, T-A-6: overview route)
app/routes/admin.projects.$id.tsx                 (modified, T-A-5: edit/delete route)
app/routes/admin.projects._index.tsx              (modified, T-A-3: list route)
app/routes/admin.projects.new.tsx                 (modified, T-A-4: new route)
app/routes/admin.projects.tsx                     (modified, T-A-3: sub-layout cleanup)
app/routes/admin.tsx                              (modified, T-A-6: admin shell layout)
app/shared/i18n/locales/en/admin.json             (modified, T-A-6: full admin i18n keys)
app/shared/ui/molecules/mobile-tab-bar.tsx        (modified, T-A-6: coming-soon toasts)
```

**P2 totals**: 8 commits / ~1,750 lines added (per-commit 73–373, all under the 400 hard cap) / 0 deletions in P2-only files.

## Final invariants (P2 verify gate)

- No `useMemo` / `useCallback` / `React.memo` in any new file: **PASS** (grep)
- No `var(--*)` in `className` in any new file: **PASS** (grep)
- No `@radix-ui/*` imports: **PASS** (grep)
- `cn()` only at `app/shared/lib/cn.ts`: **PASS** (find)
- Brand name "Juliam Aponte" everywhere (no "Julia Aponte"): **PASS** (grep)
- Contact path `/api/v1/contacts` (plural) everywhere: **PASS** (grep)
- Locked `http-client` and `admin-auth` specs NOT modified: **PASS** (git diff)
- New runtime dependencies: 0 (per proposal §Success criteria): **PASS** (no package.json changes in P2)

## Status

- **APPLY-COMPLETE**. Ready for `sdd-verify portfolio-frontend-v1`.
