# Proposal: `auth-fetch-client` — Unified HTTP Client + Admin Session Bootstrap

> Slug: `auth-fetch-client`. Branch: new branch off `main`. Status: proposal.
> Decisions baked in from the user round: (1) access token in a non-HttpOnly
> `access` cookie (cross-project dependency on the backend), (2) split client
> shape — `serverFetch` + `clientFetch` over a shared `core`, (3) scope is the
> client + `useSessionStore` + admin gate + login form/page, (4) silent
> redirect to `/admin/auth?next=…` on terminal refresh-401.

## Intent

The frontend has no HTTP client. Every route is a `TODO` stub, and the first
real feature (admin login) needs a way to talk to the backend at `/api/v1/*`
with bearer + cookie auth, single-flight refresh on 401, and typed errors —
from both React Router loaders (server) and SWR / components (browser).
Building this once, correctly, with native `fetch` and zero new dependencies,
unblocks every domain (auth, projects, reviews, contact) and replaces
`DESIGN.md`'s hand-wavy `swrFetcher` sketch with a real, testable client.

This client is the **most-reused piece of code** in the repo. Every
subsequent API call goes through it. Understanding its shape — why split,
why single-flight, why the access-token cookie — is foundational, not a
one-time fix. The teaching section below previews these questions; the
full deep-dive belongs in the design phase.

`DESIGN.md` also drifts on the profile endpoint: line 271 names
`/api/v1/auth/me`, but the backend's locked `auth-domain` spec defines
`/api/v1/auth/profile`. This proposal fixes the drift as part of the
contract realignment.

## Capabilities

### New Capabilities
- `http-client` — the shared `fetch` client (`core` + `serverFetch` +
  `clientFetch` + `swrFetcher` + `ApiError` taxonomy) used by every domain.
  Lives in `app/shared/lib/fetch-client/`.
- `admin-auth` — the admin auth subdomain (session zustand store, login
  form, admin layout cookie gate, login server action). Lives in
  `app/shared/stores/session.ts` + `app/admin/auth/`.

### Modified Capabilities
- `api-contract` — align `DESIGN.md` §5 admin table: `/api/v1/auth/me` →
  `/api/v1/auth/profile`. Add a note in `AGENTS.md` that the frontend
  mirrors the backend's locked specs and that drift is the frontend's job
  to catch.

> `openspec/specs/` currently contains only `testing-capabilities.md`,
> which this change does not touch. The two new capability specs above
> become the seed for `openspec/specs/http-client/spec.md` and
> `openspec/specs/admin-auth/spec.md` after archive.

## Scope

### In scope
- `app/shared/lib/fetch-client/` — `core.ts`, `server.ts`, `client.ts`,
  `errors.ts`, `swr-fetcher.ts`.
- `app/shared/stores/session.ts` — `useSessionStore` zustand store
  (access token, expiry, user, login/logout/refresh actions).
- `app/admin/auth/` — `schema.ts` (zod), `api/login.ts` (typed POST
  wrapper), `pages/login.tsx` (react-hook-form + shadcn UI).
- `app/shared/swr/fetcher.ts` — replace the `swrFetcher` TODO with a
  thin wrapper over `clientFetch`.
- `app/routes/admin.tsx` — replace the cookie-check `TODO` with a real
  `getSession(request)` call → `throw redirect('/admin/auth?next=…')` on
  401.
- `app/routes/admin.auth.tsx` — replace the placeholder with the real
  login form (re-export from `app/admin/auth/pages/login.tsx`).
- A React Router server `action` for login that calls
  `POST /api/v1/auth/login` via `serverFetch`, captures the new
  `Set-Cookie: access=…` and `Set-Cookie: rt=…`, and forwards them on
  the response.
- `DESIGN.md` + `AGENTS.md` drift fixes.
- **Prerequisite** (cross-project — separate PR on the backend):
  `../roonder-portfolio-backend/src/auth/auth.controller.ts` gains a
  non-HttpOnly `access` cookie on `POST /api/v1/auth/login` and
  `POST /api/v1/auth/refresh`. See §Cross-project dependency.

### Out of scope
- Admin CRUD pages (projects list/edit, reviews moderation, contact
  inbox). They consume this client but ship in their own SDD change.
- Vitest / Playwright. The only quality gate is `bun run typecheck`.
  Manual smoke against the backend's Swagger UI is the verification.
- Server Actions beyond `login` (refresh + logout can be promoted later).
- Pre-rendering decisions per route.
- A second client shape, a new HTTP library, or any `package.json`
  change. The hard constraint is **native `fetch` only**.

## How (approach preview)

- **Shared `core`** — `requestCore<T>(init, env)` builds the `Headers`,
  normalizes the URL, applies the access token, runs `fetch`, maps
  errors to `ApiError`. Pure, environment-agnostic. `serverFetch` and
  `clientFetch` are thin wrappers that add the cookie strategy.
- **Request envelope** — `{ url, method, headers, body, signal, schema? }`.
  `schema` is an optional zod schema for response narrowing.
- **Response unwrapping** — parse JSON only after a 2xx check. On
  non-2xx, parse the backend's `{ statusCode, error, message, timestamp,
  path }` envelope (per the `global-exception-filter` spec) and throw
  `ApiError`.
- **Error taxonomy** — `ApiError { kind: 'unauthorized' | 'forbidden' |
  'throttled' | 'validation' | 'network' | 'server'; status; message;
  fieldErrors?: Record<string, string[]>; retryAfter?: number }`.
  `fieldErrors` is the `string[]` of `message` flattened into a
  per-field map for forms. Built as a const-object + index-type per the
  `typescript` skill.
- **Single-flight refresh** — module-level
  `refreshPromise: Promise<void> | null`. On 401 (except from
  `/auth/*` itself), if `refreshPromise` is null, set it; otherwise
  await it. On success, retry the original request exactly once. On
  failure, clear the session store and throw `unauthorized`. No
  second refresh, no loop.
- **Terminal refresh-401** — the refresh failure is terminal. The
  store clears atomically; loaders `throw redirect('/admin/auth?next=
  <current-path>')`; SWR callers get a typed `unauthorized` and a
  global error boundary navigates. No toast, no modal.
- **SSR cookie forwarding** — `serverFetch(input, init, request)` reads
  `request.headers.get('cookie')` and forwards it on the internal
  fetch. After a successful server-side refresh, it captures the new
  `Set-Cookie` headers and the loader forwards them via
  `data(payload, { headers })` so the browser picks up the new `rt`.
- **SWR integration** — `swrFetcher = (url) => clientFetch(url, { method:
  'GET' }).then(r => r.data)`. The SWR `key` IS the URL — aligned with
  `DESIGN.md` §4.
- **Zustand store shape** — `{ accessToken, expiresAt, user, hydrate(),
  login(), logout(), refresh() }`. Components use the selector form
  (`useStore((s) => s.user)`); never read the whole store. Persist is
  NOT used (the cookie is the source of truth; the store is a
  per-render cache).
- **Login form** — `react-hook-form` + `zodResolver(loginSchema)`. Posts
  to a React Router server `action` that calls `serverFetch` →
  `POST /api/v1/auth/login`. On success the action captures the new
  cookies and the client rehydrates `useSessionStore` from the
  `access` cookie before navigating.
- **Admin layout cookie gate** — `app/routes/admin.tsx` loader calls
  `getSession(request)`, which reads the `access` cookie, calls
  `/auth/profile` via `serverFetch`, returns the user or `throw
  redirect('/admin/auth?next=…')`. The login URL stays exempt from
  the check (already true today).

## Affected areas

| Area | Impact | Description |
| --- | --- | --- |
| `app/shared/lib/fetch-client/` | New | The HTTP client. |
| `app/shared/stores/session.ts` | New | Zustand admin session store. |
| `app/shared/swr/fetcher.ts` | Modified | Replace TODO with real fetcher. |
| `app/admin/auth/` | New | Login subdomain (schema, api, pages). |
| `app/routes/admin.tsx` | Modified | Replace cookie-check TODO with real gate. |
| `app/routes/admin.auth.tsx` | Modified | Replace placeholder with the real form. |
| `DESIGN.md` | Modified | Fix `/auth/me` → `/auth/profile`; document the client in §4. |
| `AGENTS.md` | Modified | Add the "mirror the backend's locked specs" note. |
| `../roonder-portfolio-backend/src/auth/auth.controller.ts` | Modified (separate PR) | Add `setAccessCookie` for the non-HttpOnly `access` cookie. |

## Cross-project dependency

**The backend must be modified** to set a non-HttpOnly `access` cookie
on `POST /api/v1/auth/login` and `POST /api/v1/auth/refresh`. Without
it, the access token cannot reach the server during SSR, so loaders
cannot call protected endpoints on first paint. The change is a small
addition to `../roonder-portfolio-backend/src/auth/auth.controller.ts`:
a new `setAccessCookie(res, accessToken, expiresIn)` helper alongside
the existing `setRefreshCookie`. The `rt` cookie (HttpOnly) stays
untouched. Cookie attributes: `httpOnly: false, secure: true, sameSite:
'lax', path: '/', maxAge: expiresIn * 1000`. The reason `httpOnly: false`
is intentional: the client-side zustand store must read it.

**Recommendation**: do this in **parallel**. Open the backend PR first
(it is small and self-contained, ~10 lines); open the frontend PR in
parallel. The frontend change has a fallback for the wait period: when
the `access` cookie is missing on SSR, the zustand store hydrates from
the cookie on the first client render, and the admin layout loader
defers the profile check to a `clientLoader` until then. This means
the frontend PR is *not strictly blocked* on the backend, but the
SSR happy-path requires both. The full happy path is verified by
the integration smoke in the verify phase.

**Decision needed before apply**: do we land the backend first (clean
SSR from day one, but blocked) or parallel with a fallback (faster,
slightly more code)?

## Why this design — concept primer

These are the teaching questions the **design** phase will answer in
depth. The proposal previews the *why* so the user can validate the
direction before design goes deep.

1. **Why an access-token cookie (vs localStorage / sessionStorage /
   in-memory only)?** SSR must read it on the server. localStorage is
   browser-only; sessionStorage evaporates per tab. A non-HttpOnly
   cookie travels both ways (browser auto-attaches; loader reads it
   from `request.headers.cookie`) and is the minimum-friction path.
   *Analogy*: a coat-check tag you keep in your pocket — visible to
   you (the client) and to the desk clerk (the server) on the same
   visit, but anyone reaching into the coat rack directly can't take
   it (the `rt` coat-check tag is locked away in HttpOnly).
2. **Why `serverFetch` + `clientFetch` (vs one `apiFetch`)?** The two
   environments diverge in cookie handling: the server forwards
   `Cookie` from the incoming request; the client uses
   `credentials: 'include'` and reads the access token from zustand.
   A single function would need an environment sniff (or a
   `bindToRequest` helper). Two named exports are explicit,
   screaming-architecture-friendly, and testable in isolation.
   *Analogy*: a power tool with two heads — the router head and the
   impact driver head share a motor (`core`) but each has the
   attachment designed for its medium.
3. **Why single-flight refresh (vs "if 401, call refresh" per
   caller)?** N concurrent SWR keys revalidating at once each see a
   401 and would race to refresh. The backend's reuse-detection
   would kill the family on the second `rt` use. A module-level
   `refreshPromise` collapses N callers into 1 refresh.
   *Analogy*: a single bartender serving a group — each patron
   waves their empty glass, but only one trip to the tap happens.
4. **Why terminal refresh-401 (vs retry loop)?** A refresh that
   itself returns 401 means the session is dead (expired, revoked,
   or reuse-detected). Retrying just hammers the backend. The
   client surfaces a typed `unauthorized` and the UI redirects to
   login. The store is cleared atomically with the redirect.
   *Analogy*: a dead battery doesn't get better by trying the
   ignition again — you call roadside assistance and start over.
5. **Why `Set-Cookie` doesn't reach the browser during SSR (and how
   `data(payload, { headers })` fixes it).** The backend's
   `Set-Cookie` is set on the *internal* fetch response, not on the
   user's outgoing SSR response. To get the new `rt` to the
   browser, the loader must copy the header from the internal
   response to the `data(payload, { headers })` envelope. This is
   React Router 8's mechanism for forwarding mutation side-effects.
   *Analogy*: a letter the doorman hands to the courier — without
   the courier copying it onto YOUR mailbox, you never see it.
6. **Why native `fetch` is enough.** No library needed:
   `Request`, `Response`, `Headers`, `AbortSignal`, `URL` are
   platform-built-ins. Bun ships a Web-compatible `fetch`; Node 20+
   does too. The only library-side gap is the lack of interceptors
   — but interceptors are how axios *hides* the single-flight
   pattern we want explicit.
7. **How `AbortController` integrates.** Every `fetch` call accepts
   an `AbortSignal`. Loaders expose `request.signal` (React Router 8
   wires it); effects create their own. The in-flight refresh
   promise is also abortable. Aborted requests throw `AbortError`,
   which the client maps to `ApiError { kind: 'network' }`.
8. **How to type errors with discriminated unions.** `ApiError` is a
   const-object pattern (per the `typescript` skill):
   `const API_ERROR_KIND = { unauthorized: 'unauthorized', ... } as
   const; type ApiErrorKind = (typeof API_ERROR_KIND)[keyof typeof
   API_ERROR_KIND];`. Consumers do `if (err.kind === 'validation')
   ...` and the compiler narrows `fieldErrors` to
   `Record<string, string[]>`.

## Risks

- **R-backend** (new): the backend's `access` cookie PR lands late.
  Mitigation: parallel work + a `clientLoader` fallback for the
  cookie-missing path.
- **R1** (concurrent 401s → N refresh calls): mitigated by the
  single-flight pattern.
- **R2** (refresh failure must not loop): mitigated by the typed
  error + atomic store clear + `redirect()`.
- **R3** (SSR cannot read `localStorage`): fully addressed by the
  `access` cookie (cross-project change).
- **R4** (`Set-Cookie` doesn't reach the browser during SSR):
  addressed by capturing the header and forwarding via
  `data(payload, { headers })`.
- **R5** (validation error shape is `string[]` under `message`):
  addressed by `fieldErrors` parsing.
- **R6** (`Retry-After` on 429): parsed and surfaced on
  `ApiError { kind: 'throttled', retryAfter }`.
- **R10** (DESIGN.md drift on `/auth/me`): fixed in this proposal;
  add a note in `AGENTS.md`.
- **R12** (review budget): this change is **likely over 400 lines**
  for a single PR. See §Review budget forecast.

## Open questions for the spec phase

1. **Login form fields**: `email` + `password` matching the backend's
   `LoginDto`. Forgot-password is out of scope.
2. **Error envelope exact shape**: confirm `ApiError` field names and
   the `fieldErrors` key format (camelCase? dot-path for nested
   validation?). My recommendation: dot-path, parsed on the client.
3. **`useSessionStore` slice**: include `user` (id+email) to avoid a
   second call from the layout? My recommendation: yes — the
   `profile` call is the only `GET /api/v1/auth/*` in the layout
   loader; piggybacking on it saves a round-trip.
4. **Route path**: confirm `/admin/auth` (matches the existing
   `admin.auth.tsx` file and `DESIGN.md` line 128) over
   `/admin/login` (which `DESIGN.md` line 63 also mentions). My
   recommendation: lock to `/admin/auth` and update `DESIGN.md` line
   63.
5. **`next` param safety**: cap to admin paths only, or accept any
   path? My recommendation: accept any path but validate it's
   same-origin and starts with `/admin/`.
6. **Refresh trigger**: lazy (on first 401) vs eager (on first client
   mount). My recommendation: lazy — avoids a network call for users
   who never hit a protected route.
7. **Logout**: client-side `clientFetch('/auth/logout', { method:
   'POST' })` + clear store, or a server action? My recommendation:
   server action so the `rt` cookie clearing is guaranteed even if
   the client tab closes mid-request.
8. **i18n on the login form**: admin is English-only today. My
   recommendation: hardcode English for now, no i18n keys; revisit
   when admin i18n is a real ask.

## Review budget forecast

Estimated changed lines for the **frontend-only** slice (this change's
in-scope work):

| Area | Lines |
| --- | --- |
| `app/shared/lib/fetch-client/` (5 files) | 180–220 |
| `app/shared/stores/session.ts` | 60–80 |
| `app/shared/swr/fetcher.ts` (replace TODO) | 20–30 |
| `app/admin/auth/` (schema, api, pages) | 80–120 |
| `app/routes/admin.tsx` (replace TODO) | 20–30 |
| `app/routes/admin.auth.tsx` (replace TODO) | 10–15 |
| `DESIGN.md` + `AGENTS.md` drift fixes | 5–10 |
| **Frontend total** | **~380–500** |

This is **at or above the 400-line review budget**. I expect to need a
chained PR.

**Chain recommendation (3 PRs):**

- **PR 1 — foundation**: `core` + `serverFetch` + `clientFetch` +
  `errors` + `useSessionStore` + `swrFetcher`. ~220 lines. No UI
  change. Reviewable in isolation.
- **PR 2 — login UX**: login form/page + admin layout cookie gate +
  `app/routes/admin.auth.tsx` real form. ~130 lines. Consumes PR 1.
- **PR 3 — backend + integration**: backend `access` cookie PR
  (separate repo) + frontend fallback smoke. ~50 lines frontend +
  ~10 lines backend. Lands last; integration-tested end-to-end.

**Decision needed before apply**: chained PRs (recommended), single
PR with a `size:exception` (faster but harder to review), or another
split.

**400-line budget risk**: **High** for single-PR, **Low** for chained.

## Alternatives considered

- **Single `apiFetch` with `typeof window` branch** — rejected:
  implicit behavior; the two cookie strategies are harder to test in
  isolation.
- **In-memory only access token (no cookie)** — rejected: SSR cannot
  read it, every protected page would be client-rendered.
- **HttpOnly `access` cookie** — rejected: SSR can read it, but the
  client cannot, so the zustand store has no source of truth on the
  client. Awkward.
- **axios / ky / ofetch** — rejected: violates the hard constraint;
  interceptors hide the single-flight pattern we want explicit.
- **tRPC** — rejected: backend is REST, not a tRPC server.
  Re-platforming is out of scope.
- **Server-only refresh action + client redirect** — rejected: every
  loader would handle 401 itself; SWR callers on the client cannot
  use a server action.
- **Honoring the old DESIGN.md `/auth/me` endpoint** — rejected: the
  backend is `/auth/profile`, locked by the `auth-domain` spec. The
  frontend is wrong; this proposal fixes the drift.

## Rollback plan

This change is additive (new folder + small edits to two existing
route files). Rollback is `git revert` of the PR(s). The backend's
`access` cookie change is a separate, isolated PR; reverting it does
not break the frontend — the zustand store hydrates from the
(non-existent) cookie on first client render and the user logs in
again. The session store and the admin layout cookie gate have a
clean before/after boundary.

## Success criteria

- [ ] `bun run typecheck` passes.
- [ ] Manual smoke: login with seeded admin → admin dashboard renders
  with the user's email → refresh the page → still authenticated →
  click a protected list → works → wait > `JWT_EXPIRES_IN` (or
  short-circuit it) → next request 401s → silent refresh → continues.
- [ ] Manual smoke: delete the `rt` cookie → next request redirects
  to `/admin/auth?next=…` with no toast / no modal.
- [ ] `DESIGN.md` API table matches the backend's locked spec; the
  `/auth/me` line is gone.
- [ ] Zero new dependencies in `package.json` (native `fetch` only).
- [ ] No `useMemo` / `useCallback` / `React.memo` introduced
  (Compiler era).
- [ ] All new code passes `verbatimModuleSyntax` (type-only imports
  where applicable).
- [ ] The discriminated union is exhaustive — `switch (err.kind)` is
  covered without a default that throws.
