# AGENTS.md — roonder-portfolio-frontend

Project-wide instructions for opencode and any agent touching this repo.
Keep this file **short, scannable, and project-specific**. Generic AI guidance
does not belong here.

## What this project is

UI for the NestJS API at `../roonder-portfolio-backend`. Framework-mode
React Router with SSR.

The site has two surfaces, named after what they ARE, not what they contain:

- **Public** (`/`, `/works`, `/works/:slug`, `/contact`) — the portfolio
  itself: a one-pager home, a full works gallery, and a contact form.
  Internationalized in `en` (default, root) and `es` (`/es/...` prefix).
- **Admin** (`/admin/*`) — the authenticated surface where the **Auth,
  Projects, Reviews, Contact** subdomains live. Match those names
  exactly when describing work.

The public site **consumes** a projection of those admin subdomains; it
never writes to them. The backend owns the canonical domain types; do
not re-derive them on the frontend.

## Stack at a glance

| Layer | Choice | Notes |
| --- | --- | --- |
| Router | React Router 8.0.0 (Framework) | SSR on by default; loaders/actions preferred over client fetches |
| UI runtime | React 19.2.7 | React Compiler era — **no `useMemo` / `useCallback` / `React.memo`** |
| Bundler | Vite 8 | Plugins: `@react-router/dev/vite`, `@tailwindcss/vite` |
| Language | TypeScript 5.9.3 strict | `verbatimModuleSyntax`, `~/*` -> `app/*` |
| Styling | Tailwind CSS 4 + shadcn/ui | `style: base-sera`, `baseColor: taupe`, **no `var()` in `className`** |
| Primitives | `@base-ui/react` | **Not Radix** — never `import` from `@radix-ui/*` |
| Forms | `react-hook-form` + `zod` | Schemas live next to the form, exported for reuse |
| Data | `swr` | One provider at the root, mutate on writes, optimistic where safe |
| Client state | `zustand` 5 | Cross-route UI state and the admin session. Local `useState` for per-component |
| i18n | `i18next` + `react-i18next` | `en` default, `es` prefixed; one namespace per public area |
| Animation | `animejs` + `motion` | Choose per use case (see DESIGN.md) |
| Pkg mgr | Bun | `bun run <script>`; `bun.lock` is the source of truth |

## Commands

| Purpose | Command |
| --- | --- |
| Dev (HMR) | `bun run dev` |
| Build | `bun run build` |
| Start (prod) | `bun run start` |
| Typecheck (only quality gate today) | `bun run typecheck` |
| Add shadcn component | use the `shadcn` MCP (already configured in `opencode.json`) |

There is **no test runner** wired. `bun run typecheck` is the sole automated
gate. Adding Vitest + Playwright is a dedicated SDD change; flip
`openspec/config.yaml` `testing.strict_tdd` to `true` when that lands.

## Architecture rules (non-negotiable)

- **Screaming Architecture**: `app/` folders are named after what the app IS,
  not the technology. Two top-level surfaces:
  - `app/home/`, `app/works/`, `app/contact/` — the **public** surface.
  - `app/admin/` — the **admin** surface, which contains the business
    subdomains `app/admin/{auth,projects,reviews,contact}/`.
  - `app/shared/` — cross-cutting (UI, i18n, swr, zustand, animation, lib).
  The structure should "shout" the business.
- **Atomic Design** inside each domain: `atoms/` -> `molecules/` ->
  `organisms/` -> `templates/` -> `pages/`. Pages compose, organisms
  orchestrate, molecules compose atoms, atoms are pure.
- **Container / Presentational**: route modules are containers. Components
  under `atoms/`, `molecules/`, `organisms/` are presentational. Logic that
  needs SWR / context lives in a `*.container.ts` or a colocated `hooks/`
  folder — never inside a presentational component.
- **SWR keys mirror REST paths**: `swrFetcher('/api/v1/projects')` is the
  cache key. Mutate with the same key on write.
- **Forms**: `useForm` + `zodResolver(schema)`. Submit through a Server
  Action when possible; fall back to a `fetcher.submit` from React Router.
- **One shadcn style, one base color**: do not introduce a second
  `components.json` or a second icon library.
- **Type imports**: `import type { X } from '...'` when the import is
  type-only. `verbatimModuleSyntax` will fail the build otherwise.

## SDD workflow

This repo runs **Spec-Driven Development** with OpenSpec as the artifact
store. `openspec/config.yaml` is the project rulebook.

| Phase | Trigger | Where it writes |
| --- | --- | --- |
| explore | `/sdd-explore <topic>` | `openspec/changes/<name>/explore.md` |
| propose | `/sdd-propose <name>` | `openspec/changes/<name>/proposal.md` |
| spec | `/sdd-spec <name>` | `openspec/changes/<name>/specs/<domain>/spec.md` |
| design | `/sdd-design <name>` | `openspec/changes/<name>/design.md` |
| tasks | `/sdd-tasks <name>` | `openspec/changes/<name>/tasks.md` |
| apply | `/sdd-apply <name>` | `openspec/changes/<name>/apply-progress.md` + code |
| verify | `/sdd-verify <name>` | `openspec/changes/<name>/verify-report.md` |
| archive | `/sdd-archive <name>` | `openspec/changes/archive/YYYY-MM-DD-<name>/` |

When a change touches shared domain types, **read the backend's
`openspec/` first** — that tree is the source of truth for the contract.
Reconciling types is part of the change, not an afterthought.

### Review budget

Default review budget is **400 changed lines**. Above that, the
**Review Workload Guard** in the orchestrator will either ask to split into
chained PRs or require a `size:exception` — depending on the cached
`delivery_strategy` (default: `ask-on-risk`).

## Skills (load before touching the area)

Full index: `.atl/skill-registry.md`. Quick rules:

| If you are touching… | Load |
| --- | --- |
| Routes, loaders, actions, fetchers, SSR, `app/routes.ts` | `.agents/skills/react-router/SKILL.md` |
| React components, hooks, JSX | `~/.config/opencode/skills/react-19/SKILL.md` |
| Tailwind classes, theme tokens, `cn()` | `~/.config/opencode/skills/tailwind-4/SKILL.md` |
| Types, interfaces, generics, strict patterns | `~/.config/opencode/skills/typescript/SKILL.md` |
| E2E tests (when the runner is added) | `~/.config/opencode/skills/playwright/SKILL.md` |
| PRs / commits / chained PRs | `~/.config/opencode/skills/{work-unit-commits,chained-pr,branch-pr,github-pr}/SKILL.md` |
| Any doc that humans read | `~/.config/opencode/skills/cognitive-doc-design/SKILL.md` |
| Editing `opencode.json` or this file | `customize-opencode` (built-in) |

Never load `nextjs-15`, `go-testing`, or the `sdd-*` / `_shared` / `skill-*`
skills into application code — they are scaffolding, not product knowledge.

## MCP servers

- `shadcn` — project-local. Use to add components, view examples, audit
  the install. Already enabled in `opencode.json`.
- `context7` — global. Use to fetch current library docs (React Router,
  Tailwind, Base UI, swr) instead of relying on training data.
- `engram` — global. Use for cross-session memory (`mem_search`,
  `mem_save`).

## Anti-patterns (do not)

- Do not import from `@radix-ui/*`. This project uses Base UI.
- Do not write `useMemo` / `useCallback` / `React.memo`. The Compiler
  handles it; adding them is a regression.
- Do not put `style={{ color: 'var(--foo)' }}` or
  `className="text-[var(--bar)]"`. Use Tailwind theme tokens.
- Do not introduce a fourth state library. The state model is:
  SWR for server state, `react-hook-form` for form state, `zustand` 5 for
  cross-route client state (admin session, locale, mobile menu, toasts),
  and local `useState` for everything else. Reach for an SDD change before
  adding a new global store.
- Do not edit `app/components/ui/*` by hand when the same change can be
  done via the `shadcn` MCP — we want to keep the registry reproducible.
- Do not commit `bun.lock` churn unless a dependency actually changed.
- Do not put secrets in `.env` and commit it. `.env` is gitignored.

## Pointers

- `DESIGN.md` — frontend architecture, public/admin split, domain map
  (under `/admin/*`), animation matrix, data flow (loaders + SWR +
  Zustand), API contract summary.
- `openspec/specs/testing-capabilities.md` — current and target test
  surface.
- `openspec/config.yaml` — SDD rules, per-phase constraints, review budget.
- `../roonder-portfolio-backend/openspec/` — shared domain contract.
- `../roonder-portfolio-backend/src/main.ts` — API base prefix (`api/v1`),
  CORS posture, Swagger path (`/api/v1/docs`).
