# Tasks: `auth-fetch-client` — Unified HTTP Client + Admin Session Bootstrap

> **Artifact**: implementation plan. Reads explore + proposal + specs + design.
> **Chain**: 1 backend PR (prerequisite, sibling repo) + 3 frontend PRs.
> **Stack**: PR 0 (backend) → PR 1 (foundation, ~220 lines) → PR 2 (login UX, ~130 lines) → PR 3 (integration, ~50 lines frontend).
> **Strategy**: `stacked-to-main` (locked preflight).
> **Quality gate**: `bun run typecheck` only (no test runner today).
> **Hard constraint**: native `fetch` only — no axios, ky, ofetch, got.

## Review Workload Forecast

| Field | Value |
| --- | --- |
| Estimated changed lines (frontend total) | ~410 |
| 400-line budget risk | Low (chained) |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (foundation) → PR 2 (login UX) → PR 3 (integration) |
| Delivery strategy | `ask-always` (locked preflight) |
| Chain strategy | `stacked-to-main` (locked preflight) |

Decision needed before apply: No (chained already locked)
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

### Per-PR forecast

| PR | Files | Lines | Status |
| --- | --- | --- | --- |
| PR 0 (backend, sibling repo) | 1 modified | ~10 backend | Block: must land first |
| PR 1 (foundation) | 12 created + 2 modified | ~220 | under 400 |
| PR 2 (login UX) | 3 created + 3 modified | ~130 | under 400 |
| PR 3 (integration) | 1 created + 2 modified + 1 doc | ~50 | under 400 |

No `size:exception` required.

## 1. Goal

Build the native-`fetch` HTTP client, the `useSessionStore` zustand store, and the admin auth subdomain (login form, admin layout cookie gate, login + logout server actions) that the rest of the app will call. Lock the discriminated `ApiError` taxonomy, single-flight refresh, SSR cookie forwarding via `data(payload, { headers })`, and the `next` param safety rule. End state: login → admin → click around → silent refresh → sign out → back to login, all with `bun run typecheck` green and zero new dependencies.

## 2. Work-unit conventions

- **One commit per task.** Tasks are the merge order for chained PRs. A task's `depends_on` is the commit before it in the same PR (or the previous PR's last commit).
- **A task is "done"** when `bun run typecheck` passes AND the acceptance criteria are met. Manual smoke is only required for PR 2 and PR 3 (PR 1 has no UI; PR 0 has its own backend test runner).
- **Commit messages**: Conventional Commits with the scope matching the folder. `feat(http-client): ...`, `feat(admin-auth): ...`, `feat(shared): ...`, `chore(design): ...`, `chore(ui): ...`.
- **No `Co-Authored-By` line** in any commit.
- **No `useMemo` / `useCallback` / `React.memo`** (React 19 Compiler era).
- **No `var()` in `className`** (Tailwind tokens only).
- **Type-only imports** with `import type` (`verbatimModuleSyntax` will fail the build otherwise).
- **No new dependencies** in `package.json`. Native `fetch`, `Headers`, `Request`, `Response`, `AbortController`, `AbortSignal` are platform built-ins.
- **No `useMemo` / `useCallback` / `React.memo` / `useShallow` for memoization** — React Compiler handles it. `useShallow` is still used for zustand multi-field selectors (per `zustand-5` skill).

## 3. PR 0 — Backend `access` cookie (sibling repo, prerequisite)

**Branch**: in `../roonder-portfolio-backend`, branch `feat/auth-access-cookie` off `main`.
**Owner**: backend (NOT executed by the frontend's `sdd-apply`).
**Merge gate**: MUST land on backend `main` BEFORE PR 1 of the frontend chain starts. The frontend chain is blocked on this.

### T-BE-1 — Add `setAccessCookie` helper in the backend auth controller

- **Files**: `../roonder-portfolio-backend/src/auth/auth.controller.ts` (modified).
- **What**: add a `setAccessCookie(res, accessToken, expiresIn)` helper alongside the existing `setRefreshCookie`. Call it from `login()` and `refresh()`. The `rt` cookie is untouched. Cookie attributes per the design §7.2 table: `httpOnly: false, secure: true, sameSite: 'lax', path: '/', maxAge: expiresIn * 1000`.
- **Why**: the access token must reach the server during SSR. The `access` cookie (non-HttpOnly) is the SSR bridge. Without it, every protected loader on the server would 401 because the loader has no zustand store to read from.
- **Acceptance**: backend's existing `auth.controller.spec.ts` test suite passes; a new test case asserts the `Set-Cookie: access=...` header attributes (`httpOnly: false, secure: true, sameSite: 'lax', path: '/'`); Swagger at `/api/v1/docs` shows the new response cookie on `POST /auth/login` and `POST /auth/refresh`.
- **Commit**: `feat(auth): set non-HttpOnly access cookie on login and refresh`

## 4. PR 1 — Foundation (no UI, ~220 lines)

**Branch**: `feat/auth-fetch-client/foundation` off `main` (after PR 0 lands).
**Goal**: ship the HTTP client + zustand session store + SWR wrapper + doc drift fixes. NO UI change. The only gate is `bun run typecheck`.

### T-F-1 — Cookie parser and access-cookie spec mirror

- **Files**: `app/shared/lib/cookies.ts` (new).
- **What**: `readAccessToken(request)` (reads from `request.headers.get('cookie')` via a tiny `parseCookies()` helper); `clearAccessCookie(headers)` (returns the `Set-Cookie: access=; Max-Age=0` string for use by the logout action); a `COOKIE_SPEC` const mirror of the design §7.2 table for both `rt` and `access` cookies.
- **Why**: keeps the access-token shape in one place so the logout action and the server-side bearer fallback never disagree on the cookie name or attributes.
- **Acceptance**: `bun run typecheck` passes; the constants are a verbatim mirror of the design §7.2 table; `readAccessToken` returns `null` when no `access` cookie is present.
- **Commit**: `feat(shared): add cookie parsing helpers and access-cookie spec mirror`

### T-F-2 — `ApiError` taxonomy and factories

- **Files**: `app/shared/lib/fetch-client/errors.ts` (new).
- **What**: `API_ERROR_KIND` const object with the 8 kinds (`unauthorized`, `forbidden`, `notFound`, `conflict`, `throttled`, `validation`, `server`, `network`); `ApiErrorKind` type; `ApiErrorPayload` discriminated union (per-kind fields: `validation` → `fieldErrors`, `throttled` → `retryAfter?`, the rest → `message` only); `ApiError extends Error` class with the `readonly kind` discriminator; `fromResponse(res, env)` and `fromNetwork(err)` factories.
- **Why**: the single error type every consumer pattern-matches on. The const-object + index-type + discriminated union is the typescript-skill pattern; the class wraps `Error.cause` chaining and stack traces.
- **Acceptance**: `bun run typecheck` passes; a manual `switch (err.kind)` over the union is exhaustive (no `default: throw` needed; the compiler enforces the case list).
- **Commit**: `feat(http-client): add ApiError taxonomy and factories`

### T-F-3 — `core.ts` shared request envelope

- **Files**: `app/shared/lib/fetch-client/core.ts` (new).
- **What**: `requestCore<S extends z.ZodType | undefined = undefined>(init, env)` signature. `CoreEnv` interface: `{ getAccessToken, signal, onUnauthorized }`. Builds the URL (auto-prepends `/api/v1` when the URL is a relative path), composes the `Headers` (`Content-Type: application/json` for non-GET with a body, `Accept: application/json`), runs `fetch`, maps non-2xx to `ApiError` via the status → kind switch (400 → validation, 401 → unauthorized, 403 → forbidden, 404 → notFound, 409 → conflict, 429 → throttled + parse `Retry-After`, 5xx → server, `AbortError`/`TypeError` → network). Optional zod `schema` narrows `data: S extends z.ZodType ? z.infer<S> : unknown`; a failed safeParse throws `ApiError { kind: 'server' }`.
- **Why**: the pure envelope is the unit of testability. `serverFetch` and `clientFetch` are thin env wrappers on top; nothing here knows about cookies or zustand.
- **Acceptance**: `bun run typecheck` passes; the `data` type narrows correctly when `S` is provided (caller-side check); the status → kind switch covers the 8 listed codes plus the network kind.
- **Commit**: `feat(http-client): add shared core with discriminated error mapping`
- **Note**: must land before T-F-4 because `refresh.ts` imports `requestCore` from `core.ts`. If the apply executor preserves the listed order, T-F-3 must use a deferred/lazy import to `core.ts` until T-F-4 lands, OR the executor may commit T-F-4 first and T-F-3 second regardless of numbering.

### T-F-4 — Single-flight refresh policy

- **Files**: `app/shared/lib/fetch-client/refresh.ts` (new).
- **What**: module-level `let refreshPromise: Promise<void> | null = null`; `setRefreshPromise(p)`, `getRefreshPromise()`, `clearRefreshPromise()` helpers; `makeRefreshPolicy(env)` factory that returns a `RefreshPolicy = (signal: AbortSignal) => Promise<void>` closure. The closure checks `refreshPromise` first — if non-null, await the same promise; if null, set it to a self-invoking async IIFE that calls `requestCore({ url: '/api/v1/auth/refresh', method: 'POST', skipAuth: true, skipRefresh: true, signal }, env)`, calls `env.onRefreshed?.()` on success, and resets `refreshPromise = null` in a `finally` block. On a refresh-401, calls `env.onTerminalUnauthorized?.()` (clears the store) and re-throws `ApiError { kind: 'unauthorized' }`.
- **Why**: N concurrent 401s (e.g. 5 SWR keys revalidating) must collapse into 1 refresh call. Without single-flight, the backend's reuse-detection would revoke the whole `rt` family on the second `rt` use.
- **Acceptance**: `bun run typecheck` passes; `bun run build` passes; a manual review confirms the `refreshPromise` is reset in `finally` (so a 401 minutes later starts a fresh attempt).
- **Commit**: `feat(http-client): add single-flight refresh policy`
- **Depends on**: T-F-3 (`core.ts`).

### T-F-5 — `serverFetch` with cookie forwarding and Set-Cookie capture

- **Files**: `app/shared/lib/fetch-client/server.ts` (new).
- **What**: `serverFetch<S>(request: Request, init: Omit<RequestInit_, 'skipAuth' | 'skipRefresh'>): Promise<ServerResult<S>>`. Forwards `request.headers.get('cookie')` verbatim on the internal fetch (so `rt` rides along). Reads the `access` cookie via `readAccessToken(request)` and uses it as the `Authorization: Bearer` fallback when the caller did not pass an explicit `Authorization` header. Composes the abort signal: `AbortSignal.any([request.signal, init.signal])`. Captures the internal response's `Set-Cookie` via `response.headers.getSetCookie()` and returns it on `serverResult.setCookies: string[]`. On 401 from a non-`/auth/*` endpoint, the env's `onUnauthorized` callback invokes the refresh policy (built in T-F-4), retries the original request exactly once, and merges any new cookies into the result.
- **Why**: the loader/action entry point. SSR's only bridge to the backend is the `Cookie` header forwarding + the `access` cookie as bearer fallback. The `Set-Cookie` capture is what lets the loader forward rotated `rt` cookies to the browser via `data(payload, { headers })`.
- **Acceptance**: `bun run typecheck` passes; `setCookies` is `[]` when the backend did not rotate any cookie; the explicit `Authorization` header wins over the `access` cookie.
- **Commit**: `feat(http-client): add serverFetch with cookie forwarding and Set-Cookie capture`
- **Depends on**: T-F-1, T-F-2, T-F-3, T-F-4.

### T-F-6 — `clientFetch` with bearer injection and refresh integration

- **Files**: `app/shared/lib/fetch-client/client.ts` (new).
- **What**: `clientFetch<S>(init: Omit<RequestInit_, 'skipAuth' | 'skipRefresh'>): Promise<CoreResult<S>>`. Sets `credentials: 'include'` on every request so the HttpOnly `rt` cookie rides. Reads the access token from `useSessionStore.getState().accessToken` via the `env.getAccessToken` callback and injects `Authorization: Bearer <token>` UNLESS the URL matches `/api/v1/auth/login` or `/api/v1/auth/refresh` (the skip list per REQ-CLI-2). The `onRefreshed` callback writes the new access token to `useSessionStore`; the `onTerminalUnauthorized` callback calls `useSessionStore.getState().logout()`.
- **Why**: the browser entry point. The browser has no `request.signal`; effects create their own `AbortController`. The refresh integration is symmetric to the server side.
- **Acceptance**: `bun run typecheck` passes; on 401 from a non-auth endpoint, the refresh policy is invoked; on success, the original request retries once; on terminal 401, the store is cleared and `ApiError { kind: 'unauthorized' }` is thrown.
- **Commit**: `feat(http-client): add clientFetch with bearer injection and refresh integration`
- **Depends on**: T-F-2, T-F-3, T-F-4, T-F-8.

### T-F-7 — `getSession` loader helper

- **Files**: `app/shared/lib/fetch-client/get-session.ts` (new).
- **What**: `getSession(request: Request): Promise<{ user: { id, email } }>`. Calls `serverFetch(request, { url: '/api/v1/auth/profile', method: 'GET', schema: userSchema })` (the `userSchema` lives in T-L-2 but is importable here; if T-L-2 lands later, inline a minimal zod schema or re-export from the same module). On 401, throws `redirect('/admin/auth?next=' + encodeURIComponent(new URL(request.url).pathname))`. Returns the user payload.
- **Why**: the admin layout loader's single read of the session. Lives in `app/shared/lib/fetch-client/` (not `app/admin/auth/server/`) because the helper is a thin wrapper around `serverFetch` and is reusable from any future loader that needs the current user.
- **Acceptance**: `bun run typecheck` passes; on 401 the function throws `redirect()`; on success returns the narrowed user.
- **Commit**: `feat(http-client): add getSession loader helper`
- **Depends on**: T-F-5, T-F-8.

### T-F-8 — `useSessionStore` zustand store (no persist)

- **Files**: `app/shared/stores/session.ts` (new).
- **What**: `useSessionStore` (zustand `create`). State: `{ accessToken, expiresAt, user }`. Actions: `hydrate()` (reads `document.cookie` for `access` once, sets `accessToken` only — does NOT decode JWTs; does NOT set `user` here), `login({ accessToken, expiresIn, user })` (writes all three), `refresh({ accessToken, expiresIn })` (writes `accessToken` + `expiresAt`, leaves `user` unchanged), `logout()` (atomic clear: `accessToken: null, expiresAt: null, user: null`). NO `persist` middleware.
- **Why**: the per-render cache for the access token + user. The `access` cookie is the source of truth; the store is hydrated from it. No `persist` because persisting the access token to localStorage would make it XSS-readable AND let a stale token live past logout.
- **Acceptance**: `bun run typecheck` passes; `import "zustand/middleware"` does NOT appear in the file; selectors (`useSessionStore((s) => s.user)`) typecheck.
- **Commit**: `feat(admin-auth): add useSessionStore without persist middleware`

### T-F-9 — `swrFetcher` wrapper over `clientFetch`

- **Files**: `app/shared/swr/fetcher.ts` (new).
- **What**: `export const swrFetcher: <S extends z.ZodType | undefined = undefined>(url: string) => Promise<S extends z.ZodType ? z.infer<S> : unknown> = (url) => clientFetch({ url, method: 'GET' }).then((r) => r.data)`. The SWR key is the URL verbatim (no transformation). Returns `result.data` so SWR's `data` is the parsed payload, not the `{ status, data, headers }` wrapper.
- **Why**: REQ-SWR-1 / REQ-SWR-2. The SWR `key` equals the URL; mutating the key in the fetcher would defeat SWR's dedupe and cause N components requesting the same URL to fire N fetches.
- **Acceptance**: `bun run typecheck` passes; the function returns `unknown` (or the narrowed type) and throws `ApiError` on non-2xx.
- **Commit**: `feat(http-client): add swrFetcher wrapper over clientFetch`
- **Depends on**: T-F-6.

### T-F-10 — DESIGN.md + AGENTS.md drift fixes

- **Files**: `DESIGN.md` (modified), `AGENTS.md` (modified).
- **What**: 
  - `DESIGN.md` line 271: `/api/v1/auth/me` → `/api/v1/auth/profile` (the actual backend endpoint per the locked `auth-domain` spec).
  - `DESIGN.md` line 63: `admin.login.tsx` → `admin.auth.tsx` (the actual file name).
  - `DESIGN.md` §4: add a short paragraph documenting the new `serverFetch` / `clientFetch` / `swrFetcher` / `useSessionStore` flow.
  - `AGENTS.md`: add a "Mirror the backend's locked specs" rule to the anti-patterns section — `DESIGN.md` is the source of truth for the frontend contract, but its API table must mirror the backend's `openspec/specs/`. Drift is the frontend's job to catch.
- **Why**: documents the contract realignment; the locked backend spec is the source of truth.
- **Acceptance**: `git grep "/auth/me"` returns no results in `DESIGN.md`; `git grep "admin.login.tsx"` returns no results in `DESIGN.md`; the new AGENTS.md rule is present.
- **Commit**: `chore(design): fix /auth/me drift and add locked-specs rule`

**PR 1 acceptance**: `bun run typecheck` passes; no UI changes; no `package.json` change; the constants in `cookies.ts` match the design §7.2 table verbatim; the `swrFetcher` and the `useSessionStore` are exported and importable.

## 5. PR 2 — Login UX (~130 lines)

**Branch**: `feat/auth-fetch-client/login-ux` off `feat/auth-fetch-client/foundation`.
**Goal**: replace the `TODO` stubs in `app/routes/admin.tsx` and `app/routes/admin.auth.tsx` with the real session gate + login form + server action. Manual smoke: login → admin → refresh → click around → silent refresh.

### T-L-1 — shadcn form primitives

- **Files**: `app/components/ui/input.tsx`, `app/components/ui/label.tsx`, `app/components/ui/field.tsx` (new, via the `shadcn` MCP).
- **What**: add the `Input`, `Label`, and `Field` shadcn primitives using the `shadcn` MCP (`view_items_in_registries` to inspect, `get_add_command_for_items` to generate, then run the command). These are stock shadcn components; they follow the same recipe as the existing `Button`.
- **Why**: the login form needs `Input` + `Label` + `Field` (the `Field` component handles label-error association per shadcn). NOT counted in the line budget — these are MCP-generated.
- **Acceptance**: components render in isolation; `bun run typecheck` passes.
- **Commit**: `chore(ui): add shadcn form primitives for the login page`

### T-L-2 — Login zod schema

- **Files**: `app/admin/auth/schema.ts` (new).
- **What**: `loginSchema = z.object({ email: z.string().email("Invalid email"), password: z.string().min(8, "String must contain at least 8 character(s)") })`. Exports `LoginInput = z.infer<typeof loginSchema>`. Also exports `userSchema = z.object({ id: z.string(), email: z.string() })` and `authResponseSchema = z.object({ accessToken: z.string(), expiresIn: z.number().int().positive() })`.
- **Why**: the single source of truth for the login shape. The form, the action, and the API client all import it; we never re-declare the contract. The `min(8)` on `password` mirrors the backend's `LoginDto` (`@MinLength(8)`).
- **Acceptance**: `bun run typecheck` passes; the schema rejects bad emails client-side; `z.infer` gives the correct TS type.
- **Commit**: `feat(admin-auth): add login zod schema`

### T-L-3 — Login server action with Set-Cookie forwarding

- **Files**: `app/admin/auth/api/login.ts` (new).
- **What**: typed `loginAction({ request }: Route.ActionArgs): Promise<Response>`. Parses `FormData` → validates with `loginSchema.safeParse` → on fail, returns `data({ error: <ApiError> }, { status: 400 })`. On valid, calls `serverFetch(request, { url: '/api/v1/auth/login', method: 'POST', body: { email, password }, schema: authResponseSchema })` → captures `serverResult.setCookies` → on 200, returns `redirect(safeNext, { headers: { "Set-Cookie": serverResult.setCookies.join(", ") } })`. The `safeNext` function validates the `next` query param: must start with `/admin/` and must start with `/`; otherwise returns `/admin` (REQ-NEXT-1). On 401/400, returns `data({ error: <ApiError> }, { status: <status> })` so the form can read `fetcher.data.error` and pattern-match.
- **Why**: a server action is the only way to GUARANTEE the response cookies (`Set-Cookie: access=...` and `Set-Cookie: rt=...`) reach the browser. React Router 8's `data()` / `redirect()` with `{ headers }` is the documented way to forward mutation side-effects.
- **Acceptance**: `bun run typecheck` passes; on 200 the `Set-Cookie` headers are forwarded; on 401 a typed `ApiError` is returned to the form; the `next` param is sanitized.
- **Commit**: `feat(admin-auth): add login server action with Set-Cookie forwarding`
- **Depends on**: T-F-5, T-F-2, T-L-2.

### T-L-4 — Login page (react-hook-form)

- **Files**: `app/admin/auth/pages/login.tsx` (new).
- **What**: presentational React component using `react-hook-form` + `zodResolver(loginSchema)`. The form posts via `fetcher.submit(values, { method: 'post', action: '/admin/auth' })`. Renders two `<Field>` blocks (email, password), a submit `<Button>` with pending state from `useActionState` (or `useNavigation()`), and the typed error display. The error display reads `fetcher.data?.error` as `ApiError` and pattern-matches: `validation` → render per-field messages from `err.fieldErrors`; `unauthorized` → "Invalid credentials" above the submit button; `throttled` → "Too many attempts. Try in Ns."; other kinds → generic message. Hardcoded English; no `t('...')` calls.
- **Why**: the actual user-facing login surface. Presentational (no SWR / no zustand reads) — the action is in T-L-3, the loader is in T-L-5.
- **Acceptance**: `bun run typecheck` passes; the form posts to the action; field errors render under the offending input; success navigates to `next` or `/admin`; no i18n calls.
- **Commit**: `feat(admin-auth): add login page with react-hook-form`
- **Depends on**: T-L-1, T-L-2, T-L-3.

### T-L-5 — Wire real cookie gate in admin route

- **Files**: `app/routes/admin.tsx` (modified).
- **What**: replace the `TODO` in the loader with a real `getSession(request)` call. On success, return `data({ user: session.user }, { headers: { "Set-Cookie": session.setCookies.join(", ") } })` (REQ-GATE-4: forward `Set-Cookie` so a server-side silent refresh updates the browser's `rt`). On 401, `throw redirect('/admin/auth?next=' + encodeURIComponent(url.pathname))` (REQ-GATE-2). The `/admin/auth` exempt branch stays (REQ-GATE-3). The `default` export's body is unchanged.
- **Why**: replaces the placeholder. The `clientLoader` fallback for the cookie-missing window is wired in T-I-3 (PR 3), not here — this commit keeps the SSR loader as the production path.
- **Acceptance**: `bun run typecheck` passes; visiting `/admin` while signed out redirects to `/admin/auth?next=/admin`; visiting while signed in renders the admin shell.
- **Commit**: `feat(admin-auth): wire real cookie gate in admin route`
- **Depends on**: T-F-7.

### T-L-6 — Wire real login page in admin.auth route

- **Files**: `app/routes/admin.auth.tsx` (modified).
- **What**: replace the placeholder with a re-export of the real login page: `export { default, meta, action } from "~/admin/auth/pages/login"` (or `export { default, meta }` and a separate action export — match the shape of the existing `meta` export).
- **Why**: connects the route file to the new page + action.
- **Acceptance**: `bun run typecheck` passes; `/admin/auth` renders the form.
- **Commit**: `feat(admin-auth): wire real login page in admin.auth route`
- **Depends on**: T-L-4.

### T-L-7 — Hydrate session store from cookie on first client render

- **Files**: `app/root.tsx` (modified).
- **What**: in the `App` default export, add a `useEffect(() => { useSessionStore.getState().hydrate(); }, [])` call. The effect runs once on first client render (after the SSR-hydrated tree mounts). No-op on the server (React effects don't run on the server).
- **Why**: the first client render happens after SSR. The loader has already touched the access token (REQ-GATE-1) and the browser has the cookie. Without a hydrate step, every client component would either read the cookie directly on every render (expensive) or see `null` until the next loader round-trip (broken state). Hydrate is a one-time `document.cookie` read.
- **Acceptance**: `bun run typecheck` passes; the store hydrates from the cookie on the first client render; subsequent renders do not re-hydrate.
- **Commit**: `feat(admin-auth): hydrate session store from cookie on first client render`
- **Depends on**: T-F-8.

**PR 2 acceptance**: `bun run typecheck` passes. Manual smoke (against the seeded backend): login with valid creds → land on `/admin`; refresh the page → still authenticated; click a protected link (e.g. `/admin/projects`) → page renders; wait > 15 min (or set `JWT_EXPIRES_IN=5s` on the backend) → next protected call 401s → silent refresh → continues.

## 6. PR 3 — Logout + integration smoke (~50 lines frontend + ~10 backend)

**Branch**: `feat/auth-fetch-client/integration` off `feat/auth-fetch-client/login-ux`.
**Goal**: ship the logout server action + the `clientLoader` fallback (the historical safety net for the cookie-missing window) + final doc updates. Run the full end-to-end happy path.

### T-I-1 — Logout server action with full cookie clear

- **Files**: `app/admin/auth/api/logout.ts` (new).
- **What**: typed `logoutAction({ request }: Route.ActionArgs): Promise<Response>`. Calls `serverFetch(request, { url: '/api/v1/auth/logout', method: 'POST' })` (the backend will set `Set-Cookie: rt=; Max-Age=0` on the internal response — captured into `serverResult.setCookies`). Appends `clearAccessCookie` from `app/shared/lib/cookies.ts` (the `Set-Cookie: access=; Max-Age=0` string) to the `setCookies` array (REQ-LO-1: the backend does not clear `access` on logout, so the action does it explicitly). Returns `redirect('/admin/auth', { headers: { "Set-Cookie": mergedSetCookies.join(", ") } })` (REQ-LO-2: redirect to login). The action also dispatches `useSessionStore.getState().logout()` on the client side during the redirect hydration (a follow-up `fetcher.submit` from the button handles this for non-route pages).
- **Why**: a server action is the only way to guarantee the cookie clear reaches the browser even if the client tab closes mid-request. The action also clears the `access` cookie (the backend only clears `rt`).
- **Acceptance**: `bun run typecheck` passes; both cookies (`rt` and `access`) are cleared; redirect to `/admin/auth`; `useSessionStore.getState().accessToken` is `null` after the navigation.
- **Commit**: `feat(admin-auth): add logout server action with full cookie clear`
- **Depends on**: T-F-1, T-F-5, T-F-8.

### T-I-2 — Sign-out button (presentational)

- **Files**: `app/admin/auth/components/sign-out-button.tsx` (new).
- **What**: a presentational React component that uses `useFetcher` to post to the logout action. Renders a `<Button type="submit" variant="ghost">Sign out</Button>`. On click, `fetcher.submit(null, { method: 'post', action: '/admin/auth/logout' })`. Pending state via `fetcher.state !== 'idle'`.
- **Why**: the user-facing trigger for the logout flow. Presentational — the action is in T-I-1.
- **Acceptance**: `bun run typecheck` passes; the button posts to the action and navigates; the button is disabled while pending.
- **Commit**: `feat(admin-auth): add sign-out button`
- **Depends on**: T-I-1.

### T-I-3 — `clientLoader` fallback for the cookie-missing window

- **Files**: `app/routes/admin.tsx` (modified).
- **What**: add an `async function clientLoader({ serverLoader }: Route.ClientLoaderArgs)` that re-runs the gate if `document.cookie` has `access` and the SSR loader did NOT return a user. Add a `// historical: this clientLoader exists as a safety net for the pre-backend-cookie-PR window. With PR 0 merged, this is a no-op that costs one document.cookie read per admin navigation. We keep it for the safety.` comment block above the function.
- **Why**: if PR 0 is somehow delayed past PR 2, the SSR loader throws `redirect('/admin/auth')` even when the browser has a fresh `access` cookie. The `clientLoader` re-checks the cookie client-side and resolves the loader. With PR 0 merged, the SSR loader succeeds, the `clientLoader` is a no-op (the server data already populates `useLoaderData`).
- **Acceptance**: `bun run typecheck` passes; with the `access` cookie present and the SSR loader returning a user, the `clientLoader` does not change behavior; with the cookie present and the SSR loader having thrown, the `clientLoader` resolves the user; with the cookie missing, the `clientLoader` does not interfere with the redirect.
- **Commit**: `chore(admin-auth): verify clientLoader fallback for cookie-missing window`
- **Depends on**: T-L-5.

### T-I-4 — Record deployed cookie spec and cross-repo mirror rule

- **Files**: `DESIGN.md` (modified), `AGENTS.md` (modified).
- **What**:
  - `DESIGN.md`: add a new "Cross-project coordination" section (§13 or wherever fits) recording the deployed cookie spec table from design §7.2 and pointing to `../roonder-portfolio-backend/openspec/` as the source of truth.
  - `AGENTS.md`: in the "Mirror the backend's locked specs" rule (added in T-F-10), add a one-line cross-reference: "If you touch an admin auth surface, read `../roonder-portfolio-backend/openspec/specs/auth-domain/spec.md` first."
- **Why**: documents the cross-repo contract and prevents future drift.
- **Acceptance**: the cookie spec table is present in `DESIGN.md`; the cross-reference rule is in `AGENTS.md`.
- **Commit**: `chore(design): record deployed cookie spec and cross-repo mirror rule`

**PR 3 acceptance**: `bun run typecheck` passes. Full end-to-end happy path: login with seeded superuser → land on `/admin` → click `/admin/projects` (scaffold) → page renders → refresh the page → still authenticated → wait > 15 min (or `JWT_EXPIRES_IN=5s` on backend) → silent refresh → continues → click "Sign out" → cookies cleared → redirect to `/admin/auth` → log in again with the `next` param honored.

## 7. Dependencies diagram

```
PR 0 (backend, sibling repo): T-BE-1
                              ↓ merge to backend main
PR 1 (foundation, frontend):  T-F-1 → T-F-2 → T-F-3 (core) → T-F-4 (refresh)
                              → T-F-8 (session) → T-F-5 (server)
                              → T-F-6 (client) → T-F-7 (get-session)
                              → T-F-9 (swr) → T-F-10 (docs)
                              ↓ merge to main
PR 2 (login UX):              T-L-1 → T-L-2 → T-L-3 → T-L-4 → T-L-5 → T-L-6 → T-L-7
                              ↓ merge to main
PR 3 (integration):           T-I-1 → T-I-2 → T-I-3 → T-I-4
                              ↓ merge to main
```

Notes on PR 1 ordering:
- T-F-3 (core) MUST land before T-F-4 (refresh) because `refresh.ts` imports `requestCore` from `core.ts`. If the listed order is preserved, T-F-3 must use a deferred/lazy import until T-F-4 lands, OR the apply executor may commit T-F-4 first and T-F-3 second regardless of numbering. The final PR state must typecheck.
- T-F-8 (session) is independent of the HTTP client modules but is referenced by T-F-6 (client) and T-F-7 (get-session). The dependency graph is satisfied if T-F-8 lands before T-F-6 and T-F-7.

For `stacked-to-main`, each PR merges to `main` in order. Adjust if `feature-branch-chain` is chosen at apply time.

## 8. Review workload forecast

Per-PR line budget (the 400-line review guard):

| PR | Lines | Budget | Status |
| --- | --- | --- | --- |
| PR 0 (backend) | ~10 | 400 | under |
| PR 1 (foundation) | ~220 | 400 | under |
| PR 2 (login UX) | ~130 | 400 | under |
| PR 3 (integration) | ~50 frontend | 400 | under |
| **Total** | **~410 frontend + ~10 backend** | — | — |

No `size:exception` required. All four PRs land under the per-PR budget.

## 9. Commit message conventions

Conventional Commits with the scope matching the folder:

| Scope | When |
| --- | --- |
| `feat(http-client):` | core, server, client, refresh, errors, swr-fetcher, get-session |
| `feat(admin-auth):` | session store, login action, logout action, sign-out button, login page, route wiring |
| `feat(shared):` | cookie parser (not fetch-client specific) |
| `feat(auth):` | backend access-cookie helper (PR 0) |
| `chore(design):` | DESIGN.md, AGENTS.md drift fixes |
| `chore(ui):` | shadcn MCP additions |

- No `Co-Authored-By` line.
- No body unless the diff is non-obvious (a body is welcome when the commit fixes a tricky bug, but not for boilerplate).
- Title in present tense, imperative mood ("add", "wire", "verify").

## 10. Out-of-scope guard

This tasks artifact explicitly does NOT include:

- **Admin CRUD pages** (projects list/edit, reviews moderation, contact inbox). The client is the foundation; the consumers ship in their own SDD changes.
- **Forgot-password, email verification, MFA**. Login is email + password; everything else is a follow-up.
- **i18n on the login form**. Admin is English-only. Hardcoded English; no `t('...')` calls.
- **A test runner** (Vitest, Playwright). The only automated gate is `bun run typecheck`. Adding Vitest is a dedicated SDD change.
- **A second HTTP library, interceptors, or `package.json` churn**. The hard constraint is **native `fetch` only**.
- **Pre-rendering decisions per route** (default: SSR; the per-route decision is a separate SDD change).
- **Eager refresh on a timer**. The refresh is lazy (on 401), not eager.
- **HttpOnly `access` cookie**. The spec locks `httpOnly: false`; the design follows.
- **`useSessionStore.persist` middleware**. The cookie is the source of truth; the store is a per-render cache.
- **Manual smoke outside the 6 success criteria** in the proposal. The verify phase runs the criteria; nothing more.

## 11. Open questions for apply

1. **PR 1 commit order for T-F-3 / T-F-4**: `refresh.ts` (T-F-4) imports `requestCore` from `core.ts` (T-F-3). The listed order has T-F-3 first, T-F-4 second. Either (a) T-F-3 uses a deferred/lazy import to break the cycle, OR (b) the apply executor commits T-F-4 first and T-F-3 second regardless of numbering. **Recommendation: (b) — keep the typecheck clean at every intermediate state.** The final PR state typechecks either way.
2. **PR 0 merge gate**: the backend PR (`T-BE-1`) MUST land on `main` of the backend repo BEFORE the frontend chain starts. The `sdd-apply` for the frontend chain should refuse to start until the backend PR is merged. The user / orchestrator is the source of truth on the backend merge — the frontend `sdd-apply` does not poll.
3. **Shadcn MCP version drift**: the `shadcn` MCP returns commands tied to the registry version. If the registry ships a breaking change to `Field` between exploration and apply, the audit checklist (per the `shadcn` MCP) will catch it; the apply executor should run `get_audit_checklist` after T-L-1.

## 12. Skill resolution

- `sdd-tasks`: paths-injected (skill at `~/.config/opencode/skills/sdd-tasks/SKILL.md`).
- `work-unit-commits`: paths-injected.
- `chained-pr`: paths-injected (loaded the strategy diagrams from `references/chaining-details.md`).
- `react-router`: paths-injected (project-local `.agents/skills/react-router/`); confirmed the `data(payload, { headers })` envelope and `request.signal` wiring.
- `typescript`: paths-injected; used the const-object pattern for `API_ERROR_KIND` and the discriminated union for `ApiErrorPayload`.
- `zustand-5`: paths-injected; confirmed the selector form and the no-`persist` rationale.
- `branch-pr`, `github-pr`: not loaded (the apply executor will load them at PR-creation time).
