# DESIGN.md — roonder-portfolio-frontend

> Frontend architecture for the Roonder Portfolio UI. This document is for
> agents and humans building features on top of this codebase. It encodes
> the *why* behind the structure so every new module lands in the right
> place without re-litigating the same decisions.

## TL;DR

| Question | Answer |
| --- | --- |
| What kind of app is this? | Server-rendered portfolio with a public site and a session-gated admin |
| How is the site split? | **Public**: `/` (one-pager home with sections), `/works` (full gallery), `/works/:slug`, `/contact` (form). **Admin**: `/admin/*` with the `auth`, `projects`, `reviews`, `contact` subdomains |
| How does data flow? | React Router `loader`/`action` first; SWR for client-driven revalidation; Zustand 5 for cross-route UI state and the admin session |
| How are forms done? | `react-hook-form` + `zod`, submitted via Server Action or `fetcher.submit` |
| How is the API consumed? | REST under `/api/v1/*` from the sibling NestJS API; types are re-exported from `app/<area>/api/schema.ts` |
| How is styling done? | Tailwind 4 + shadcn/ui (style `base-sera`, baseColor `taupe`) on top of `@base-ui/react` primitives — single theme |
| What is i18n? | `en` (default, root path `/`) and `es` (prefixed `/es/...`) via `i18next`. Admin is English-only for now |
| What is the testing posture today? | `bun run typecheck` only. Vitest + Playwright are planned behind an SDD change |

## 1. Why this stack, in plain terms

The frontend exists to render a portfolio. Most pages are read-mostly:
home sections, works gallery, contact. The traffic shape is "anonymous
browser hits a public page; sometimes a logged-in superuser edits
content". That shape drives every choice below.

- **React Router Framework mode** — server rendering gives us SEO for the
  public pages and lets loaders run on the server, which is where the API
  already lives. No second data layer to keep in sync.
- **React 19 + Compiler** — manual memoization is a tax. We pay it nowhere.
- **Tailwind 4 + shadcn/ui** — design tokens live in CSS, not JS, and
  shadcn components are local files we own. No runtime CSS-in-JS, no
  vendor lock-in to a styled-components fork.
- **Base UI (not Radix)** — better defaults, smaller bundle, no styled
  wrapper layer between the primitive and the shadcn recipe.
- **SWR over React Query** — the API surface is small and read-heavy; we
  do not need a normalized cache. SWR's `mutate` on writes is enough.
- **Zustand 5 for client state** — the admin session, the active locale,
  the mobile menu, the toast queue, the modal stack. Local state handles
  per-component concerns; SWR handles server state; react-hook-form
  handles form state. Zustand fills the cross-route gap without forcing
  a Redux-style provider tree.
- **Bun** — fast install, fast typecheck, matches the dev loop. The lockfile
  is the source of truth; do not regenerate it with npm/pnpm.

## 2. Architecture — Screaming, inside out

The repo's top-level structure must "shout" the business, not the
framework. There are **two top-level surfaces**, named after what they
*are*:

```
app/
  root.tsx                    # html shell, providers, error boundary
  routes.ts                   # explicit route table (Framework mode)
  routes/                     # public route modules (containers)
    _index.tsx                # /             - one-pager: about, reviews, projects highlights
    works.tsx                 # /works        - full projects gallery
    works.$slug.tsx           # /works/:slug  - project detail
    contact.tsx               # /contact      - public contact form
    admin.tsx                 # /admin        - admin layout (session-gated)
    admin.auth.tsx            # /admin/auth   - admin login
    admin.projects.tsx        # /admin/projects        - project list
    admin.projects.new.tsx    # /admin/projects/new    - create project
    admin.projects.$id.tsx    # /admin/projects/:id    - edit project
    admin.reviews.tsx         # /admin/reviews         - review moderation
    admin.contact.tsx         # /admin/contact         - contact submissions inbox
  home/                       # homepage sections (about, reviews, projects highlights)
  works/                      # /works + /works/:slug components
  contact/                    # /contact (public form) components
  admin/                      # /admin/* (the authenticated surface)
    auth/                     # subdomain: admin auth (login, session, guards)
    projects/                 # subdomain: projects CRUD
    reviews/                  # subdomain: review moderation
    contact/                  # subdomain: contact submissions inbox
  shared/                     # cross-cutting
    ui/                       # shadcn/ui components
    i18n/                     # i18next setup, locale loading
    swr/                      # fetcher, provider, mutators, keys
    stores/                   # Zustand stores (session, locale, ui, toasts)
    animation/                # animejs/motion wrappers and presets
    lib/                      # cn(), formatters, pure helpers
  app.css                     # Tailwind 4 entry + design tokens
```

### Why the split

The *public* surface is a portfolio, not a CRM. Visitors come to read,
not to manage. "Projects", "Reviews", and "Contact" exist as
**subdomains of `/admin`** because that is where someone *manages*
them. The public site consumes a *projection* of those subdomains
(featured projects, featured reviews, a contact form) — that consumption
lives in `app/home/`, `app/works/`, `app/contact/`, **never** in
`app/admin/`.

If you find yourself adding a feature that needs to write to a domain,
the file goes under `app/admin/<domain>/`. If you find yourself reading
a projection of a domain for the public site, the file goes under
`app/<public-area>/` and the API call is a read.

### Atomic Design inside each area

| Layer | Lives in | Responsibility | Knows about |
| --- | --- | --- | --- |
| `pages/` (or `routes/`) | per route | Page-level composition | everything below |
| `organisms/` | per area | Composite UI blocks; orchestrate queries | molecules, atoms, hooks |
| `molecules/` | per area | Composite UI; no data fetching | atoms, shared/lib |
| `atoms/` | per area | Pure UI primitives | nothing else |
| `hooks/` | per area | Container logic: SWR keys, mutations, form wiring | api/, schema |
| `api/` | per area | Typed HTTP client (path, method, response) | shared/swr, schema |
| `schema.ts` | per area | Zod schemas, inferred TS types | zod |

**Rule of thumb**: an import that goes "up" the table is a smell. A page
may import from anywhere; an atom may not import from an organism.

## 3. Routing — Framework mode

`app/routes.ts` is the **single source of truth** for the route table.
Do not define routes anywhere else.

| Path | File | Mode | Auth |
| --- | --- | --- | --- |
| `/` | `_index.tsx` | SSR | public |
| `/works` | `works.tsx` | SSR | public |
| `/works/:slug` | `works.$slug.tsx` | SSR | public |
| `/contact` | `contact.tsx` | SSR | public |
| `/admin/auth` | `admin.auth.tsx` | SSR | public |
| `/admin` | `admin.tsx` | SSR | session |
| `/admin/projects` | `admin.projects.tsx` | SSR | session |
| `/admin/projects/new` | `admin.projects.new.tsx` | SSR | session |
| `/admin/projects/:id` | `admin.projects.$id.tsx` | SSR | session |
| `/admin/reviews` | `admin.reviews.tsx` | SSR | session |
| `/admin/contact` | `admin.contact.tsx` | SSR | session |

**i18n prefixes** wrap every public path: `/en/works`, `/es/works`,
`/en/contact`, etc. The unprefixed root `/` resolves to `en` (the
default locale). Admin is English-only for now.

**Loader policy**: every public loader returns cached data. Every write
goes through an `action` that calls the API and returns the new resource.
Use `useFetcher()` for non-navigating submits (e.g. contact form).

**Pre-rendering**: pages that change once a week (home, works list,
individual works) should be pre-rendered. The decision is per route;
default to SSR.

## 4. Data flow

```
                            ┌────────────────────┐
                            │  Browser request   │
                            └─────────┬──────────┘
                                      │
                          ┌───────────▼────────────┐
                          │  Route loader (server) │
                          │  fetch /api/v1/...     │
                          └───────────┬────────────┘
                                      │ JSON
                          ┌───────────▼────────────┐
                          │  Page renders w/ data  │
                          └───────────┬────────────┘
                                      │ hydrate
                          ┌───────────▼────────────┐
                          │  SWR + Zustand mount   │
                          │  (SWR for server-ish   │
                          │   data, Zustand for    │
                          │   session + UI state)  │
                          └───────────┬────────────┘
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            ▼                         ▼                         ▼
     Read (SWR key)            Write (action)            Optimistic update
     /api/v1/projects         fetcher.submit          mutate(key, fn)
     + session from           or server action         then revalidate
       useSessionStore()
```

### SWR keys

Cache keys **mirror the REST path**. Helpers live in
`app/shared/swr/keys.ts`:

```ts
export const swrKeys = {
  home: {
    featured: () => ['/api/v1/projects?featured=true', '/api/v1/reviews?featured=true'] as const,
  },
  works: {
    list: () => '/api/v1/works' as const,
    bySlug: (slug: string) => `/api/v1/works/${slug}` as const,
  },
  admin: {
    projects: {
      list: () => '/api/v1/admin/projects' as const,
      byId: (id: string) => `/api/v1/admin/projects/${id}` as const,
    },
    reviews: {
      list: () => '/api/v1/admin/reviews' as const,
    },
    contact: {
      list: () => '/api/v1/admin/contact' as const,
    },
  },
} as const;
```

### Fetcher

A single fetcher in `app/shared/swr/fetcher.ts` handles:

- Adding `credentials: 'include'` so the `rt` cookie rides along.
- Throwing on non-2xx with the API's error envelope (`{ statusCode, message, error }`).
- Parsing `zod` schemas on the way in for type narrowing.

### Zustand stores

| Store | File | Purpose |
| --- | --- | --- |
| `useSessionStore` | `app/shared/stores/session.ts` | Admin session: user, access token expiry, login/logout actions |
| `useLocaleStore` | `app/shared/stores/locale.ts` | Active locale; mirrors `i18next.language` for components that need it without a hook |
| `useUIStore` | `app/shared/stores/ui.ts` | Mobile menu open, sidebar collapsed, modal stack |
| `useToastStore` | `app/shared/stores/toasts.ts` | Toast queue (push, dismiss, auto-expire) |

**Rule**: Zustand stores are *cross-route* state only. Anything that
belongs to a single component stays in `useState` / `useReducer`.
Anything that comes from the API stays in SWR or a loader. Form state
stays in `react-hook-form`.

Use the selector form (`useStore((s) => s.field)`) by default, and
`useShallow` for multi-field selectors. Avoid
`const state = useStore()` — that subscribes the component to the whole
store and re-renders on every change.

### Mutations

Always invalidate the relevant key. For lists, invalidate the list key.
For a single item, invalidate both the item key and the list it belongs
to. The shared `mutators.ts` provides the canonical invalidation map.

## 5. API contract summary

Source of truth: the backend at `../roonder-portfolio-backend`.

| Setting | Value |
| --- | --- |
| Base URL (same-origin via reverse proxy) | `/api/v1` |
| Auth | Bearer access token in `Authorization`; refresh token in HttpOnly cookie `rt` |
| Swagger UI | `/api/v1/docs` |
| Validation | `ValidationPipe` with `whitelist + transform + forbidNonWhitelisted` |
| Error shape | `{ statusCode, message, error }` from `AllExceptionsFilter` |
| Throttling | Global `ThrottlerGuard`, per-route overrides via `@Throttle()` |
| CORS | `credentials: true`, `origin: ${FRONTEND_URL}` only |

### Public surface (consumed by `/`, `/works`, `/works/:slug`, `/contact`)

| Frontend path | Backend endpoint | Method | Notes |
| --- | --- | --- | --- |
| `/` (sections) | `/api/v1/projects?featured=true` | GET | Homepage highlights |
| `/` (sections) | `/api/v1/reviews?featured=true` | GET | Homepage reviews |
| `/` (sections) | `/api/v1/about` | GET | About content (single doc) |
| `/works` | `/api/v1/works` | GET | Full gallery |
| `/works/:slug` | `/api/v1/works/:slug` | GET | Project detail |
| `/contact` | `/api/v1/contact` | POST | Throttled, public write |

### Admin surface (consumed by `/admin/*`)

| Frontend path | Backend endpoint | Method | Auth |
| --- | --- | --- | --- |
| `/admin/auth` | `/api/v1/auth/login` | POST | none |
| `/admin` (layout loader) | `/api/v1/auth/profile` | GET | bearer |
| `/admin/projects` | `/api/v1/admin/projects` | GET | bearer |
| `/admin/projects/new` | `/api/v1/admin/projects` | POST | bearer |
| `/admin/projects/:id` | `/api/v1/admin/projects/:id` | GET, PATCH, DELETE | bearer |
| `/admin/reviews` | `/api/v1/admin/reviews` | GET, DELETE | bearer |
| `/admin/contact` | `/api/v1/admin/contact` | GET | bearer |

When the backend's OpenSpec gains a new requirement, the matching
`schema.ts` and `api/client.ts` files are the first files to change in
this repo. **Never hand-roll a type that the backend already has** —
import or regenerate from the Swagger document.

### Cross-project cookie spec

The admin auth surface uses two cookies. The contract below is the
**single source of truth** shared between the backend
(`../roonder-portfolio-backend/src/auth/auth.controller.ts` —
`setRefreshCookie` + `setAccessCookie` helpers) and the frontend
(`app/shared/lib/cookies.ts` — `COOKIE_SPEC` const). Any change here
MUST be reflected in both repos; drift is the frontend's job to catch
(see `AGENTS.md` "Mirror the backend's locked specs").

| Cookie | Set by | Lifetime | `httpOnly` | `secure` | `sameSite` | `path` | `maxAge` | Cleared on |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `rt` (refresh) | backend `setRefreshCookie` | `JWT_REFRESH_EXPIRES_IN` (default 30d) | **true** | true | lax | `/` | seconds×1000 | `/auth/logout` (200), refresh 401/reuse-detected |
| `access` (JWT) | backend `setAccessCookie` | `JWT_EXPIRES_IN` (default 15m) | **false** | true | lax | `/` | seconds×1000 | frontend logout action (`Max-Age=0`) |

The two cookies are **separate by design**: `rt` is the long-lived
credential that can be replayed and is therefore HttpOnly; `access` is
the short-lived bearer that the client JS needs to read on first
client render (the `useSessionStore.hydrate()` step in
`app/root.tsx`). The XSS surface on `access` is accepted because
`rt` stays HttpOnly and `access` has a 15-minute expiry.

## 6. Forms

Every form follows the same shape:

```ts
const schema = z.object({ email: z.string().email(), body: z.string().min(10) });
type FormValues = z.infer<typeof schema>;

function ContactForm() {
  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });
  const fetcher = useFetcher();
  return (
    <form onSubmit={handleSubmit((values) =>
      fetcher.submit(values, { method: 'post', action: '/contact' })
    )}>
      ...
    </form>
  );
}
```

- Schemas live in `app/<area>/schema.ts` and are exported so the
  matching action on the server can reuse them.
- Error rendering uses a single `<FormError />` atom driven by
  `formState.errors` and the `fetcher.data` error envelope.
- Optimistic UI is allowed only when the success shape is predictable
  (e.g. the contact form showing a "thanks" state).

## 7. Styling

- **Tailwind 4** with CSS-first config in `app/app.css`. Theme tokens
  live as CSS custom properties; do not put `var(--*)` in `className` —
  reference the token through Tailwind's `theme()` mechanism.
- **shadcn/ui** recipe stays in `app/components/ui/*`. Add new
  components via the `shadcn` MCP, never by hand-editing unless the
  recipe is intentionally local.
- **Base UI primitives** are the only headless layer. If a needed
  primitive does not exist in Base UI, prefer adding it via the MCP
  registry over falling back to Radix.
- **No `var(--token)` in `className`** — see `tailwind-4` skill.
- **Conditional classes** use `cn()` from `app/shared/lib/cn.ts` (a
  wrapper around `clsx` + `tailwind-merge`). Never template-string
  Tailwind classes.
- **Single theme** — `style: base-sera`, `baseColor: taupe`. There is
  no dark/light toggle and no theme switcher. If a future change needs
  one, treat it as a new SDD change and update this doc.

## 8. i18n

- Two locales: **`en`** (default, root path `/`) and **`es`**
  (prefixed `/es/...`). URL prefix is the source of truth; cookie
  and `Accept-Language` only kick in on the very first visit.
- One namespace per public area: `common`, `home`, `works`,
  `contact`. Admin is English-only and has a single `admin` namespace.
- The active locale is mirrored in `useLocaleStore` so components
  that cannot call hooks (e.g. some `head` metadata) can read it.
- Locale changes go through a single helper that updates i18next,
  the store, the cookie, and `document.documentElement.lang`.
- Date/number formatting goes through `i18next`'s built-in `Intl`
  helpers; do not pull in `moment` / `date-fns` for this.

## 9. Animation

Two libraries, two purposes. **Pick by use case, not by habit.**

| Library | Use when | Example |
| --- | --- | --- |
| `motion` (Framer Motion v12) | State-driven transitions, layout animations, gesture-based UI | Page transitions, expanding cards, drag |
| `animejs` | Timeline-driven, choreography, SVG path morphing | Hero reveal, scroll-tied sequences |

Reusable presets live in `app/shared/animation/presets/`. Components
expose `prefers-reduced-motion` automatically; verify that with
reduced-motion enabled before shipping a new animation.

## 10. Error handling and resilience

- **Loader errors** -> the route's `ErrorBoundary` (declared via
  `export function ErrorBoundary()` in the route file).
- **Action errors** -> return a typed error response; the form renders
  it via `<FormError />`.
- **SWR errors** -> surface a toast (from `useToastStore`) and a retry
  button. Never silently retry indefinitely.
- **Network offline** -> SWR `fallbackData` from the loader, plus a
  top-level banner from `app/shared/ui/OfflineBanner.tsx`.
- **Admin session expired** -> `useSessionStore` triggers a silent
  refresh; on failure, redirect to `/admin/login` with a `?next=` param.

## 11. Testing posture

Today: `bun run typecheck` is the only automated gate. There is no
runner, no linter, no formatter wired.

When the testing SDD change lands, the matrix is:

| Layer | Tool | Lives in |
| --- | --- | --- |
| Unit | Vitest | `app/**/*.test.ts` colocated |
| Component | Vitest + Testing Library | `app/**/*.test.tsx` colocated |
| E2E | Playwright | `e2e/` (project root) |
| Type | `tsc` via `bun run typecheck` | always on |
| Lint | ESLint flat config (planned) | project root |

Strict TDD is **off** until the runner lands. After that, flip
`openspec/config.yaml` `testing.strict_tdd` to `true` and
`rules.apply.test_command` to the Vitest command.

## 12. What is intentionally out of scope

- **No dark/light theme.** Single theme (`base-sera` / `taupe`).
  Adding a theme switcher is a dedicated SDD change.
- **No Redux / Jotai / MobX.** Server state is SWR, form state is
  react-hook-form, cross-route client state is Zustand 5, local state
  is `useState`. Reach for an SDD change before adding a new global
  store.
- **No Next.js.** The router is React Router 7/8 Framework mode. Do not
  introduce `next/*` imports.
- **No styled-components / emotion / vanilla-extract.** Tailwind 4 only.
- **No tRPC / GraphQL.** The backend is a JSON REST API. Reuse the
  Swagger document if types need regenerating.
- **No third locale.** `en` and `es` only for now. Adding a locale is
  a dedicated SDD change.

## 13. Open questions to resolve via SDD

- Pre-render target per route (Vercel ISR vs static at build time).
- Token refresh strategy on the client (silent refresh in the root
  loader vs a dedicated `/refresh` action). `useSessionStore` will own
  it; we still need to decide the trigger.
- Visual regression: Playwright + screenshots, or a separate tool like
  Chromatic.

Each of these is a candidate for its own `/sdd-new` change. Do not
resolve them in passing inside another change.
