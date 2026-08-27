# Archive Report — `portfolio-frontend-v1`

**Change**: `portfolio-frontend-v1`
**Date**: 2026-08-27
**Verdict**: GREEN (verified 2026-08-27)
**Status**: Archived

## Summary

Full v1 portfolio frontend implementation: public surface (home, works catalog, works detail, contact) with i18n (en/es), admin surface (overview, projects CRUD, login re-skin), and the Aurelian Grid v2 design system theme override. Delivered as 3 chained PRs (P0 foundation, P1 public, P2 admin) totaling ~31 commits merged to `main`.

## What was implemented

### P0 — Foundation (~3,800 lines, 12 commits)
- Aurelian obsidian palette override in `app/app.css` (shadcn `:root` re-token)
- Font cleanup: dropped Noto Sans, kept Hanken Grotesk as `--font-sans`, added Playfair Display as `--font-display`
- Retired `--rndr-*` shorthand tokens; migrated all call sites
- `cn()` consolidated to `app/shared/lib/cn.ts`; `app/lib/` deleted
- `i18next` bootstrap with 9 JSON namespace files (en: common/home/works/contact/admin; es: common/home/works/contact)
- `useLocaleStore`, `useUIStore`, `useToastStore` (zustand 5)
- `swrKeys` registry mirroring REST paths
- 9 shadcn primitives added (textarea, select, dropdown-menu, dialog, popover, switch, tabs, badge, sonner)
- 16 shared atoms + 11 shared molecules under `app/shared/ui/`
- Animation presets for motion + animejs (6 presets)
- Deleted placeholder `Navbar.tsx` and `NeuronCard.tsx`

### P1 — Public surface (~2,744 lines, 11 commits)
- Home page (`/`, `/es`) with bento composition (hero + metrics + selected works + about + testimonials + contact form + footer)
- Works catalog (`/works`, `/es/works`) with 4 project-card variants, client-side filter + pagination, side drawer (desktop) + bottom sheet (mobile)
- Works detail (`/works/:slug`, `/es/works/:slug`) as canonical URL-shareable destination
- Contact page (`/contact`, `/es/contact`) with real form (react-hook-form + zod)
- `ContactForm` molecule shared between home CTA and `/contact` route (single source of truth)
- Full i18n key sets for all public namespaces

### P2 — Admin surface (~1,750 lines, 8 commits)
- Login page re-skinned to Aurelian palette (visual only; locked `admin-auth` spec untouched)
- Admin projects CRUD: list (`/admin/projects`), new (`/admin/projects/new`), edit + delete (`/admin/projects/:id`)
- `adminProjectSchema` (8 fields with zod transforms) + `AdminProjectForm` molecule
- Admin overview widget with Active Works stat (hardcoded fallback per BLOCKED-ON-BACKEND)
- Mobile tab bar (Projects / Reviews placeholder / Inbox placeholder)
- Full admin i18n key set (en-only per locked D8)

## Promoted specs

| Domain | Action | Requirements |
|--------|--------|-------------|
| `theme-tokens` | Created (new) | REQ-THEME-1 through REQ-THEME-10 |
| `i18n` | Created (new) | REQ-I18N-1 through REQ-I18N-9 |
| `home-domain` | Created (new) | REQ-HOME-1 through REQ-HOME-8 |
| `works-domain` | Created (new) | REQ-WORKS-1 through REQ-WORKS-8 |
| `contact-domain` | Created (new) | REQ-CON-1 through REQ-CON-8 |
| `admin-projects-domain` | Created (new) | REQ-ADM-1 through REQ-ADM-11 |

All 6 delta specs promoted to locked baseline specs at `openspec/specs/{domain}/spec.md`.

## Known issues and follow-ups

### BLOCKED-ON-BACKEND (hardcoded fallbacks in place)
- `GET /api/v1/home/metrics` — home metrics use hardcoded values (124/48/92) with `// TODO(home-domain)` comment
- `GET /api/v1/admin/projects/stats` — admin Active Works stat uses hardcoded fallback (24, "+3 this month") with `// TODO(admin-projects)` comment

### Deferred to follow-up SDD changes
- Pre-render target decision (Q-21) — Vercel ISR vs static at build time; P0/P1/P2 ship with SSR
- Reviews subdomain (`/admin/reviews*`) — deferred per Q-3/Q-20; route files are TODO scaffolds
- Contact inbox (`/admin/contact*`) — deferred per Q-3/Q-20; route files are TODO scaffolds
- Test runner (Vitest + Playwright) — tracked in `openspec/specs/testing-capabilities.md`
- Server-side works pagination — needed when catalog exceeds 100 projects (REQ-WORKS-8)

### Non-blocking suggestions (from verify report)
- `StatNumber` atom unused by home `MetricsBento` (inlines number rendering instead)
- `(params as { lang?: string }).lang` cast in 4 route `meta()` functions — typed `useLang()` helper would be cleaner
- `projectCard` variant is index-driven, not data-driven — could derive from project metadata

### Resolved during verify
- C-1: `useMemo` in `app/works/pages/works.tsx` — removed in commit `4f610cd`
- W-1: `contactSchema` field constraints aligned with REQ-CON-1 in commit `fd55239`

### Pre-existing (not introduced by this change)
- `useMemo` in `app/components/ui/field.tsx` — locked shadcn primitive from archived `auth-fetch-client` change

## Archive contents

| Artifact | Status |
|----------|--------|
| `explore.md` | ✅ Archived |
| `proposal.md` | ✅ Archived |
| `design.md` | ✅ Archived |
| `tasks.md` | ✅ Archived (all tasks complete) |
| `apply-progress.md` | ✅ Archived (P0 + P1 + P2 records) |
| `verify-report.md` | ✅ Archived (GREEN) |
| `specs/` (6 delta specs) | ✅ Archived + promoted to locked |

## Source of truth updated

The following specs now reflect the new behavior:
- `openspec/specs/theme-tokens/spec.md`
- `openspec/specs/i18n/spec.md`
- `openspec/specs/home-domain/spec.md`
- `openspec/specs/works-domain/spec.md`
- `openspec/specs/contact-domain/spec.md`
- `openspec/specs/admin-projects-domain/spec.md`

Previously locked specs (unchanged):
- `openspec/specs/http-client/spec.md`
- `openspec/specs/admin-auth/spec.md`
- `openspec/specs/testing-capabilities.md`

## SDD cycle complete

The change has been fully explored, proposed, specified, designed, tasked, implemented (3 chained PRs), verified GREEN, and archived. Ready for the next change.
