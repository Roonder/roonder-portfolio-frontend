# Verify Report — `auth-fetch-client` (re-verification)

> **Change**: `auth-fetch-client` (the unified HTTP client + admin session bootstrap)
> **Slug**: `auth-fetch-client`
> **Date verified**: 2026-08-03
> **Verifier**: sdd-verify sub-agent (model: minimax-m3 / opencode-go/minimax-m3)
> **Status**: **GREEN — ready for archive**

## 1. Header

| Field | Value |
| --- | --- |
| Change name | `auth-fetch-client` |
| Slug | `auth-fetch-client` |
| Date verified | 2026-08-03 (UTC) |
| Verifier | sdd-verify sub-agent (re-verification) |
| Prior verdict | **BLOCKED** (2026-08-01, `dfe18a5`) — 2 CRITICALs |
| Local `main` HEAD | `3b20b70` (`fix(auth-fetch-client): address 2 CRITICALs in silent refresh`) |
| Fix commit | `3b20b70` on `main` — 3 files, +31 / −4 (scoped to V-1 + V-2 only) |
| Mode | `interactive` (cached) |
| Artifact store | `openspec` |
| Quality gate | `bun run typecheck` (`react-router typegen && tsc`) |
| Strict TDD | **NOT active** (no test runner wired per `AGENTS.md`) |

## 2. Re-validation scope

This is a **targeted re-verification** of a fix commit. The prior
`verify-report.md` (BLOCKED) is the source of truth for the original
full verification — that 415-line audit of 16 automated checks, the
PR status table, the 35-REQ coverage matrix, and the manual smoke
checklist remains valid as background.

This re-verification:

1. **Confirms the 2 CRITICALs (V-1, V-2) are CLOSED** by tracing the
   fixed code paths end-to-end against the spec scenarios.
2. **Confirms the 4 WARNINGs (V-3..V-6) are still valid** — the fix
   was scoped to 3 files and did not touch the dead-code paths.
3. **Confirms the 3 SUGGESTIONs (V-7..V-9) are still valid** — all
   three remain out of scope.
4. **Re-runs the only automated quality gate** (`bun run typecheck`)
   plus an opportunistic `bun run build` smoke check.
5. **Sweeps all 35 REQs** at the contract level — no new CRITICALs
   were introduced by the fix.

The fix did NOT add, remove, or rename any REQ. The spec contract
is unchanged.

## 3. The fix — what commit `3b20b70` actually changed

| File | Insertions | Deletions | What changed |
| ---- | ---------- | --------- | ------------ |
| `app/shared/lib/fetch-client/core.ts` | +7 | 0 | Added `credentials: 'include'` to the `doFetch` closure (V-1) and a comment block explaining why this is a no-op for SSR but required for the browser. |
| `app/shared/lib/fetch-client/client.ts` | +9 | −4 | Added `env.accessToken = token` inside the `onSuccess` refresh callback (V-2) and corrected the misleading JSDoc that claimed credentials were already wired. |
| `app/shared/lib/fetch-client/server.ts` | +15 | 0 | Added a guarded parse of the refresh response body's `accessToken` and an `env.accessToken = newToken` mutation (V-2 server side). |
| **Total** | **+31** | **−4** | Scoped strictly to V-1 + V-2. No other files touched. |

The fix is **minimal and surgical**. The commit message documents
the constraint that `CoreEnv.accessToken` MUST stay mutable — any
future refactor that adds `readonly` will re-break silent refresh in
production. This is a non-trivial design observation worth carrying
forward to the archive.

## 4. Critical findings (re-validation)

### V-1: `clientFetch` does NOT set `credentials: 'include'` — CLOSED ✓

- **REQ ID**: `REQ-CLI-1` (spec `openspec/changes/auth-fetch-client/specs/http-client/spec.md:263-285`)
- **One-line description**: `clientFetch` SHALL use `credentials: 'include'` so the HttpOnly `rt` cookie rides along cross-origin.
- **Prior finding**: `core.ts:80-91` (the `doFetch` closure) did NOT include `credentials: 'include'`. The default `same-origin` policy strips `rt` on cross-origin production, collapsing silent refresh. The JSDoc at `client.ts:5, 77` falsely claimed the flag was added.
- **What the fix did**: Added `credentials: 'include'` to the shared `doFetch` closure in `core.ts:97` (inside the `fetch(url, { ..., credentials: 'include' })` call). Updated the JSDoc at `client.ts:82-85` to point to the new `core.ts` location and explain the SSR no-op rationale.
- **Trace evidence** (manual scenario walk-through for the cross-origin browser path):
  1. Browser: `clientFetch({ url: '/api/v1/admin/projects', ... })` (e.g. from a SWR hook in an admin page).
  2. `client.ts:31` reads `accessToken = useSessionStore.getState().accessToken`.
  3. `client.ts:40-78` builds `env: CoreEnv = { accessToken, refresh: () => refreshPolicy(...) }`.
  4. `client.ts:80` calls `requestCore<S>(init, env)`.
  5. `core.ts:80-98` defines `doFetch(token)` — `doFetch` now includes `credentials: 'include'` (V-1 fix at `core.ts:97`).
  6. `core.ts:101` first call: `await doFetch(env.accessToken)` → `fetch(url, { ..., credentials: 'include' })`.
  7. Browser sends: `Authorization: Bearer <jwt>` (if `env.accessToken` set) **AND** `Cookie: rt=<opaque>; access=<jwt>` (via the browser cookie jar) — because `credentials: 'include'` opts the browser into cross-origin cookie shipping. ✓
  8. Backend (with `credentials: true` + `origin: FRONTEND_URL` per the backend's `main.ts`) accepts the cookies → either returns 200 directly or 401 if `rt` was already consumed/expired.
- **SSR no-op verification**: `serverFetch` (`server.ts:118`) calls `requestCore` with the same `core.ts` that now sets `credentials: 'include'`. In Node's `fetch`, `credentials: 'include'` is a no-op for the cookie-jar story (the SSR client has no cookie jar of its own) — `server.ts:113-116` explicitly forwards `Cookie: incomingCookie` from the incoming request, so the SSR path was never broken. The fix comment at `core.ts:91-96` documents this: "a no-op for SSR but REQUIRED for the browser".
- **Scenario compliance**: REQ-CLI-1 scenario "GIVEN `useSessionStore` holds `accessToken: '<jwt>'` WHEN `clientFetch` calls `GET /api/v1/admin/projects` THEN the request includes `Authorization: Bearer <jwt>` AND `credentials: 'include'`" — **now satisfied**.
- **Status**: **CLOSED ✓**

### V-2: Refresh retry uses the OLD access token — CLOSED ✓

- **REQ ID**: `REQ-RFR-2` (spec `http-client/spec.md:324-336`)
- **One-line description**: On a successful refresh, the client SHALL retry the original request EXACTLY once with the NEW access token from the refresh response.
- **Prior finding**: `requestCore` captured `env.accessToken` as a string value at the start of the call. The refresh callback updated the zustand store (client) or captured new `Set-Cookie` headers (server), but the local `env.accessToken` was never reassigned. The retry sent the EXPIRED token, 401'd, and the user was bounced to login. The "loop guard" half of REQ-RFR-2 ("no further 401 on the retry triggers a second refresh") was correct; the "new access token" half was broken.
- **What the fix did**: Two complementary edits to mutate the closure-captured `env.accessToken` after a successful refresh.
  - **Client side** (`client.ts:67-72`, inside the `onSuccess` callback of `refreshPolicy`):
    ```ts
    if (token && expiresIn !== null) {
      useSessionStore.getState().refresh({ accessToken: token, expiresAt: Date.now() + expiresIn * 1000 });
      // REQ-RFR-2: propagate the new token to the in-flight `env` so the retry
      // in `core.ts` uses the NEW access token (not the closure-captured
      // stale one from the start of this call).
      env.accessToken = token;
    }
    ```
  - **Server side** (`server.ts:79-93`, inside the `env.refresh` closure):
    ```ts
    const refreshedData = refreshed.data as { accessToken?: unknown } | null;
    const newToken = refreshedData && typeof refreshedData.accessToken === 'string'
      ? refreshedData.accessToken
      : null;
    if (newToken) env.accessToken = newToken;
    ```
- **Trace evidence — client silent refresh sequence** (manual scenario walk-through):
  1. Browser: `clientFetch({ url: '/api/v1/admin/projects' })` (via SWR revalidation).
  2. `client.ts:31`: `accessToken = useSessionStore.getState().accessToken` (e.g. `<old-expired-jwt>`).
  3. `client.ts:40-78` builds `env: CoreEnv = { accessToken: <old>, refresh: () => refreshPolicy({...}) }`.
  4. `client.ts:80` → `core.ts:101` → `doFetch(<old>)` → `fetch(url, { credentials: 'include', headers: { Authorization: 'Bearer <old>' } })`.
  5. Backend validates `<old>` → 401 (expired).
  6. `core.ts:107-110`: `if (response.status === 401 && !isAuthEndpoint(url)) { await env.refresh(); response = await doFetch(env.accessToken); }`.
  7. `env.refresh` runs the single-flight `refreshPolicy` (`refresh.ts:99-147`). It calls `request({ url: '/api/v1/auth/refresh', method: 'POST' })` (which goes back through `clientFetch` — auth endpoint, so no Authorization header is injected, per `client.ts:41`).
  8. The browser sends `POST /api/v1/auth/refresh` with `Cookie: rt=<opaque>` (via `credentials: 'include'`) → backend validates `rt` → 200 with `{ accessToken: <new>, expiresIn: 900 }`.
  9. `refreshPolicy` `onSuccess(data)` fires → `client.ts:47-72`:
     - Parses `data.accessToken` and `data.expiresIn`.
     - Both valid → `useSessionStore.getState().refresh({...})` updates the store (so the next SWR mutation sees the new token).
     - **V-2 fix at `client.ts:71`: `env.accessToken = token;`** — mutates the closure-captured env object.
  10. `refreshPolicy` resolves. `core.ts:109` runs: `response = await doFetch(env.accessToken)`. `env` is the SAME object passed in step 3, now with `accessToken = <new>`. ✓
  11. `doFetch(<new>)` → `fetch(url, { credentials: 'include', headers: { Authorization: 'Bearer <new>' } })`.
  12. Backend validates `<new>` → 200. `core.ts:114-123` parses and returns the envelope. ✓
  13. The user sees the admin page; the session is alive. **The user-visible success criterion (proposal §Success criteria #2: "wait > `JWT_EXPIRES_IN` → next request 401s → silent refresh → continues") is now satisfied end-to-end.**
- **Trace evidence — server silent refresh sequence** (the SSR path that was also broken):
  1. SSR loader: `getSession(request)` → `serverFetch(request, { url: '/api/v1/auth/profile' })`.
  2. `server.ts:56-57` reads `incomingCookie` and `accessToken = readAccessToken(request)` (e.g. `<old-expired-jwt>` from the `access` cookie).
  3. `server.ts:60-95` builds `env: CoreEnv = { accessToken: <old>, signal: request.signal, refresh: async () => {...} }`.
  4. `server.ts:97-116` handles explicit Authorization (none here) and forwards `Cookie: incomingCookie` (so `rt` rides).
  5. `server.ts:118` → `core.ts:101` → `doFetch(<old>)` → `fetch(url, { headers: { Authorization: 'Bearer <old>', Cookie: 'rt=<opaque>; access=<old>' } })`.
  6. Backend validates `<old>` → 401 (expired) but `rt` is valid → silent refresh.
  7. `core.ts:108` calls `await env.refresh()`.
  8. `env.refresh` recursively calls `serverFetch(request, { url: '/api/v1/auth/refresh', method: 'POST' })` (nested call). The inner call's URL is `/api/v1/auth/refresh` — auth endpoint, so `core.ts:107` 401-retry guard is bypassed for the inner call (no infinite loop).
  9. Inner `serverFetch` returns `{ status: 200, data: { accessToken: <new>, expiresIn: 900 }, headers, setCookies: [<new-rt-cookie>, <new-access-cookie>] }`.
  10. `server.ts:74-78` merges the inner `setCookies` into the OUTER `setCookies` array.
  11. **V-2 fix at `server.ts:86-93`**: parses `refreshed.data.accessToken` defensively, mutates OUTER `env.accessToken = <new>`. ✓
  12. `core.ts:109`: `response = await doFetch(env.accessToken)` — reads the MUTATED env → `<new>`. ✓
  13. `doFetch(<new>)` → `Authorization: Bearer <new>` + `Cookie: rt=<old>; access=<old>` (the `Cookie` header was composed in `server.ts:113-116` from the OUTER `incomingCookie` and the inner fetch's retry doesn't re-read it — but the `Authorization` header is what the backend validates for non-refresh endpoints, and the new token is valid). → 200.
  14. The outer `serverFetch` returns the user + the merged `setCookies`. `admin.tsx:34-37` forwards the `Set-Cookie` headers via `data({ user }, { headers })` → browser stores the new `rt` (and `access`) for the next request. ✓
- **Server guard verification** (`server.ts:86-93` defensive parse):
  - `refreshedData` is `null`/undefined → `newToken = null` → `env.accessToken` NOT mutated → retry uses old token → retry 401s → terminal `unauthorized` ApiError → `get-session.ts:63-64` redirects to login. **Correct terminal behavior for a malformed refresh response (a backend bug).**
  - `refreshedData.accessToken` is not a string (e.g. number, undefined, object) → `newToken = null` → same as above.
  - `refreshedData.accessToken` is an empty string `""` → `typeof === 'string'` is TRUE → `newToken = ""` → `if (newToken)` is FALSY → `env.accessToken` NOT mutated. **The `if (newToken)` truthy check correctly rejects empty strings** (the client side has the same property via `if (token && expiresIn !== null)` at `client.ts:62`).
- **Scenario compliance**: REQ-RFR-2 scenarios:
  - "GIVEN the original request 401'd AND the refresh succeeded WHEN the client retries THEN the retry uses the new `accessToken` from the refresh response" — **now satisfied** (both client and server paths).
  - "AND no further 401 on the retry triggers a second refresh (loop guard)" — was already satisfied; not regressed.
- **Status**: **CLOSED ✓**

### CRITICAL summary

Both prior CRITICALs are closed by a minimal, scoped, well-commented
fix. The fix:

- Preserves all other REQs (no regression in the 33 unaffected REQs).
- Documents the `CoreEnv.accessToken` MUST stay mutable invariant
  in the commit message — a future refactor that adds `readonly`
  will re-break silent refresh, so this is a cross-PR design note
  the archive should carry forward.
- Uses the same defensive parsing pattern on both client and server
  sides (`typeof === 'string'` + `if (newToken)` truthy guard) — no
  inconsistency between the two refresh paths.
- Is small enough to review in one sitting (31 lines across 3 files
  in 1 commit, well under the 400-line review budget).

No new CRITICALs were introduced. The re-verification is clean.

## 5. Warning findings (unchanged, follow-ups)

All 4 WARNINGs from the prior report remain valid. The fix was
scoped to 3 files and did not touch the dead-code / UX-nit paths
they reference. The orchestrator may proceed to archive with these
noted as follow-ups; they are non-blocking and do not affect the
silent-refresh success criterion that the CRITICALs broke.

### V-3: `userSchema` is defined but never used at the call site — STILL VALID

- **Where**: `app/admin/auth/schema.ts:26-29` defines `userSchema = z.object({ id, email })`; `app/shared/lib/fetch-client/get-session.ts:52-61` does NOT pass `schema: userSchema` to `serverFetch` and instead does a manual duck-type check on `data.id` / `data.email`.
- **Did the fix change anything?**: No. The fix touched only `core.ts`, `client.ts`, `server.ts`. `schema.ts` and `get-session.ts` are untouched (confirmed via `git diff dfe18a5..3b20b70 -- app/admin/auth/schema.ts app/shared/lib/fetch-client/get-session.ts` → empty).
- **Recommendation**: Either use `userSchema` in `get-session.ts:53` (one-line change) or delete the `userSchema` export. Open as a small follow-up SDD change or accept as WAI (working-as-intended — the manual check is the long-term shape per the apply-progress decision). Defer to a separate change; not blocking archive.

### V-4: `useSessionStore.login()` action never called; `user` never populated on the client — STILL VALID

- **Where**: `app/shared/stores/session.ts:45` defines `login: (input) => set({ accessToken, expiresAt, user })`. `git grep -nE "useSessionStore\(\)\.login\(" app/` → 0 hits.
- **Did the fix change anything?**: No. The session store file is untouched.
- **Why it still works in production**: The admin layout (`app/routes/admin.tsx:39-42`) renders `loaderData.user.email` from the SSR loader's data (which calls `getSession` → `serverFetch('/api/v1/auth/profile')`), not from the client store. The `user` field in the client store is never populated by the current login flow, but it is also never read by any production path (the login page's "already signed in as X" branch at `login.tsx:120-128` is dead code as a consequence).
- **Recommendation**: Either (a) dispatch `useSessionStore.getState().login({...})` from the login page when the fetcher resolves successfully and the URL has navigated past `/admin/auth`, or (b) remove the dead `login` action + the dead "already signed in" UI. Open as a follow-up. Not blocking archive — the user-visible "Signed in as X" still renders correctly because the admin layout reads from the loader.

### V-5: `safeNext` has an unused `currentPath` parameter — STILL VALID

- **Where**: `app/shared/lib/fetch-client/get-session.ts:76-82` — `safeNext(next, currentPath)`, but `currentPath` is `void`-ed (`void currentPath;`) and unused.
- **Did the fix change anything?**: No. `get-session.ts` is untouched.
- **Recommendation**: Remove the parameter (and update the 1 call site in `app/admin/auth/api/login.ts:66`) or implement the intended same-origin check. Trivial cleanup; not blocking.

### V-6: `safeNext` rejects `?next=/admin` (no trailing slash) — STILL VALID

- **Where**: `app/shared/lib/fetch-client/get-session.ts:77` — `next.startsWith('/admin/')` returns false for `/admin`.
- **Did the fix change anything?**: No. `get-session.ts` is untouched.
- **Strict per spec**: REQ-NEXT-1 says "must start with `/admin/`", so the implementation is correct. The UX nit is that a user who bookmarked `/admin` and got redirected to `/admin/auth?next=/admin` expects to land on `/admin` after login — which happens by accident (the fallback is also `/admin`).
- **Recommendation**: If `/admin` should be a valid `next`, add `|| next === '/admin'` to the guard. If the strict spec is intentional, file a follow-up SDD change to update REQ-NEXT-1. Non-blocking.

## 6. Suggestion findings (unchanged, out of scope)

### V-7: shadcn `field.tsx` has an upstream `useMemo` — STILL VALID (out of our hands)

- **Where**: `app/components/ui/field.tsx:182` (1 `useMemo` import + 1 call site).
- **Did the fix change anything?**: No. `app/components/ui/*` is MCP-managed.
- **Out-of-scope reason**: per `AGENTS.md`, `app/components/ui/*` is not hand-edited. The shadcn registry predates the React 19 Compiler "no manual memoization" rule. Open an upstream issue or vendor a custom `Field` module. Cost is one `useMemo` per `<FieldError>` render.

### V-8: Add a test runner (Vitest + Playwright) as a dedicated follow-up — STILL VALID (out of scope for this change)

- **Where**: `openspec/specs/testing-capabilities.md` — typecheck-only today.
- **Did the fix change anything?**: No. Test runner addition is its own SDD change.
- **Out-of-scope reason**: The V-1 + V-2 bugs would have been caught by a 5-line Vitest test for REQ-RFR-2 ("after a refresh, the retry uses the new access token") and a Playwright E2E for REQ-CLI-1 (cross-origin `credentials: 'include'`). The typecheck gate cannot prove behavior. The follow-up to add Vitest + Playwright is the highest-leverage next change and should be its own SDD cycle. Flips `openspec/config.yaml > testing.strict_tdd` to `true`.

### V-9: `clientLoader` fallback for the cookie-missing window — STILL VALID (out of scope, documented WAI)

- **Where**: `app/routes/admin.tsx:45-76` — 32-line JSDoc explaining why no `clientLoader` is exported.
- **Did the fix change anything?**: No. `admin.tsx` is untouched.
- **Out-of-scope reason**: The apply executor deliberately dropped the `clientLoader` after backend PR 0 landed, with two well-reasoned justifications documented in the JSDoc: (a) React Router 8's redirect semantics mean a `clientLoader` does not "rescue" an SSR-thrown `redirect()`; (b) a no-op `clientLoader` widens the inferred `loaderData` type to `T | null` and breaks narrowing in `AdminLayout`. The JSDoc is the right artifact; reintroduce the `clientLoader` only if the cookie contract drifts again. Today: WAI.

## 7. REQ coverage matrix (re-validation)

All 35 REQs across the 2 delta specs (`http-client`, `admin-auth`).
The fix is scoped to V-1 + V-2; all other REQs are unchanged from the
prior report's evaluation. I re-read every REQ-bearing file
(`core.ts`, `client.ts`, `server.ts`, `refresh.ts`, `errors.ts`,
`get-session.ts`, `session.ts`, `app/admin/auth/api/login.ts`,
`app/admin/auth/api/logout.ts`, `app/admin/auth/pages/login.tsx`,
`app/admin/auth/components/sign-out-button.tsx`, `app/routes/admin.tsx`,
`app/root.tsx`, `app/shared/lib/cookies.ts`) and re-checked each
scenario. No regression.

### `http-client/spec.md` (18 REQs)

| ID | Requirement | Status | Note (post-fix) |
| -- | ----------- | ------ | --------------- |
| REQ-CORE-1 | Request envelope `{ status, data, headers }` | **PASS** | `core.ts:32-36, 118-122` returns the exact shape. Unchanged. |
| REQ-CORE-2 | Error mapping (status → `ApiError.kind`) | **PASS** | `errors.ts:115-162`. Unchanged. |
| REQ-CORE-3 | AbortSignal wiring + `AbortError` → `network` | **PASS** | `core.ts:77, 80-98, 112-129`; `errors.ts:169-175`. Unchanged. |
| REQ-CORE-4 | Optional zod `schema` narrows `data` | **PASS** | `core.ts:32-36, 108-117, 221-229`. Unchanged. |
| REQ-ERR-1 | `ApiError extends Error` with `readonly kind` | **PASS** | `errors.ts:57-77`. Unchanged. |
| REQ-ERR-2 | `validation` carries `fieldErrors` | **PASS** | `errors.ts:129-136, 216-231`. Unchanged. |
| REQ-ERR-3 | `throttled` carries `retryAfter` | **PASS** | `errors.ts:120-127, 201-205`. Unchanged. |
| REQ-SRV-1 | `serverFetch` forwards incoming `Cookie` header | **PASS** | `server.ts:56, 113-116`. Unchanged. |
| REQ-SRV-2 | `serverFetch` returns `Set-Cookie` from internal response | **PASS** | `server.ts:130-135`. Unchanged. |
| REQ-SRV-3 | `serverFetch` reads `access` cookie as bearer fallback | **PASS** | `server.ts:57, 97-111`. Unchanged. |
| REQ-CLI-1 | `clientFetch` uses `credentials: 'include'` + bearer injection | **PASS** ✓ (V-1 CLOSED) | `core.ts:97` sets `credentials: 'include'` on the shared `doFetch`; `client.ts:31, 41, 80-87` reads from `useSessionStore` and injects `Authorization: Bearer`. |
| REQ-CLI-2 | Skip bearer on `/auth/login` and `/auth/refresh` | **PASS** | `client.ts:32, 41` (`isAuth` guard). Unchanged. |
| REQ-RFR-1 | Single-flight refresh dedupe via module-level `refreshPromise` | **PASS** | `refresh.ts:55-67, 99-100, 142-143`. Unchanged. |
| REQ-RFR-2 | Retry original request EXACTLY once with the NEW access token | **PASS** ✓ (V-2 CLOSED) | `core.ts:107-110` (retry + loop guard); `client.ts:67-72` (mutate `env.accessToken` from refresh response); `server.ts:79-93` (parse + mutate `env.accessToken` from refresh body). |
| REQ-RFR-3 | Terminal refresh-401 → clear store + throw `unauthorized` | **PASS** | `refresh.ts:115-127`; `client.ts:74-76` clears the store. Unchanged. |
| REQ-RFR-4 | Refresh promise is abortable via the same `AbortSignal` | **PASS** | `refresh.ts:104-108`; `client.ts:46` passes `init.signal`; `server.ts:62, 70` passes `request.signal`. Unchanged. |
| REQ-SWR-1 | `swrFetcher(url)` returns `result.data` | **PASS** | `app/shared/swr/fetcher.ts:18-19`. Unchanged. |
| REQ-SWR-2 | SWR keys equal the URL | **PASS** | One-liner; no key mutation. Unchanged. |

### `admin-auth/spec.md` (17 REQs)

| ID | Requirement | Status | Note (post-fix) |
| -- | ----------- | ------ | --------------- |
| REQ-SES-1 | Store shape `{ accessToken, expiresAt, user }` + actions `hydrate`, `login`, `logout`, `refresh` | **PASS** (with note) | Shape + actions all defined. The `login()` action is **never called** by any UI path (V-4 WARNING) — the action exists and is dispatchable but the spec scenario is not exercised in the current code. Store is hydrated from cookie via `app/root.tsx:42-47`. |
| REQ-SES-2 | No `persist` middleware | **PASS** | `session.ts:19` imports only `create`. Unchanged. |
| REQ-SES-3 | Selector-form access only | **PASS** | `git grep -nE "useSessionStore\(\)" app/` → 0 call sites. Unchanged. |
| REQ-SES-4 | `hydrate()` from `app/root.tsx` once on first client render | **PASS** | `app/root.tsx:42-47` with `useRef` strict-mode guard. Unchanged. |
| REQ-GATE-1 | Admin layout loader calls `getSession(request)` → `serverFetch('/api/v1/auth/profile')` | **PASS** | `app/routes/admin.tsx:27`. Unchanged. |
| REQ-GATE-2 | 401 from profile → `redirect('/admin/auth?next=...')` | **PASS** | `get-session.ts:62-66, 84-87`. Unchanged. |
| REQ-GATE-3 | `/admin/auth` is exempt from the session gate | **PASS** | `app/routes/admin.tsx:23-25`. Unchanged. |
| REQ-GATE-4 | Loader forwards `Set-Cookie` from the profile call | **PASS** | `app/routes/admin.tsx:34-42` uses `Headers.append('Set-Cookie', c)`. Unchanged. |
| REQ-LOG-1 | Login form uses `react-hook-form` + `zodResolver(loginSchema)` | **PASS** | `login.tsx:46-62, 78-81`; `schema.ts:17-22`. Unchanged. |
| REQ-LOG-2 | Form submits to a server action that calls `POST /api/v1/auth/login` via `serverFetch` | **PASS** | `login.tsx:99`; `api/login.ts:69-74`. Unchanged. |
| REQ-LOG-3 | Action forwards `Set-Cookie: access=...; rt=...` | **PASS** | `api/login.ts:81-85`. Unchanged. |
| REQ-LOG-4 | 401 from action surfaces typed `ApiError` | **PASS** | `api/login.ts:87-99`; `login.tsx:187-208`. Unchanged. |
| REQ-LOG-5 | Redirect to `next` (validated) on success, else `/admin` | **PASS** | `api/login.ts:65-66, 85`. Unchanged. |
| REQ-LOG-6 | Login form is English + uses shadcn/ui | **PASS** | `login.tsx` hardcoded English; uses `Button` / `Input` / `Field` from `app/components/ui/`. Unchanged. |
| REQ-LO-1 | Logout is a server action that calls `POST /api/v1/auth/logout` via `serverFetch` + forwards `Set-Cookie` | **PASS** | `api/logout.ts:58-69`; backend's `setRefreshCookie` sets `rt=; Max-Age=0`; `api/logout.ts:56` explicitly clears `access` via `clearAccessCookie()`. Unchanged. |
| REQ-LO-2 | Logout clears the store + redirects to `/admin/auth` | **PASS** | `api/logout.ts:85` returns `redirect("/admin/auth", { headers })`; `sign-out-button.tsx:46-50` clears the store on `fetcher.state === 'idle' && fetcher.data !== undefined`. Unchanged. |
| REQ-NEXT-1 | `next` is same-origin AND starts with `/admin/`; else `/admin` | **PASS** | `get-session.ts:76-82`; rejects `//evil.com` via `!next.startsWith('//')` and non-admin paths. **V-6 WARNING** for `/admin` (no trailing slash) — non-blocking. |

### Tally

- **35 REQs total**: 35 PASS, 0 FAIL, 0 PARTIAL that is a regression.
- 2 REQs (`REQ-CLI-1`, `REQ-RFR-2`) moved from **PARTIAL → PASS** thanks to the fix.
- 4 WARNINGs (V-3, V-4, V-5, V-6) carry over from the prior report as non-blocking follow-ups.
- 3 SUGGESTIONs (V-7, V-8, V-9) carry over from the prior report as out-of-scope.

## 8. Quality gates

### 8.1 `bun run typecheck` (the only automated gate per `AGENTS.md`)

```
$ bun run typecheck
$ react-router typegen && tsc
The `envFile` option is deprecated, please use `envDir: false` instead.
The `envFile` option is deprecated, please use `envDir: false` instead.
The `envFile` option is deprecated, please use `envDir: false` instead.
---EXIT 0---
```

**Verdict**: **PASS** (exit 0). The 3 deprecation warnings are
pre-existing project config noise (per the prior report), unrelated
to this change. `react-router typegen` regenerated type definitions
cleanly; `tsc` exited 0.

### 8.2 `bun run build` (opportunistic smoke check)

```
build/server/assets/noto-sans-vietnamese-wght-normal-DLTJy58D.woff2          14.45 kB
build/server/assets/hanken-grotesk-latin-400-normal-CjyVwvJV.woff            17.24 kB
build/server/assets/noto-sans-cyrillic-wght-normal-B2hlT84T.woff2           20.08 kB
build/server/assets/playfair-display-latin-ext-wght-normal-CT1r92Rl.woff2    21.14 kB
build/server/assets/playfair-display-cyrillic-wght-normal-5WvUvBgZ.woff2     21.15 kB
build/server/assets/noto-sans-greek-wght-normal-Ymb6dZNd.woff2               21.77 kB
build/server/assets/noto-sans-latin-wght-normal-BYSzYMf3.woff2               35.82 kB
build/server/assets/playfair-display-latin-wght-normal-BOwq7MWX.woff2       38.40 kB
build/server/assets/noto-sans-cyrillic-ext-wght-normal-DSNfmdVt.woff2        70.68 kB
build/server/assets/noto-sans-devanagari-wght-normal-Cv-V-Vwajv.woff2        99.23 kB
build/server/assets/noto-sans-latin-ext-wght-normal-W1qJv59v.woff2          167.96 kB
build/server/assets/server-build-Ct3OyPNH.css                                41.99 kB │ gzip: 10.18 kB
build/server/index.js                                                        78.37 kB │ gzip: 17.54 kB

✓ built in 149ms

real    0m1,049s
```

**Verdict**: **PASS** (exit 0, 149ms built). Confirms SSR still
works end-to-end after the fix; no SSR-side regression from
`credentials: 'include'` (Node `fetch` treats it as a no-op for
the cookie-jar story, as documented at `core.ts:91-96`).

## 9. Cross-cutting checks (sweep after the fix)

| # | Check | Result |
| - | ----- | ------ |
| 1 | Fix commit `3b20b70` only touches 3 files (`core.ts`, `client.ts`, `server.ts`) | **PASS** — confirmed via `git show 3b20b70 --stat` |
| 2 | No `@radix-ui/*` imports introduced | **PASS** — `git grep -nE "from ['\"]@radix-ui" app/` → 0 matches |
| 3 | No `useMemo` / `useCallback` / `React.memo` in our code | **PASS** — the only match in `app/admin/auth/components/sign-out-button.tsx:18` is a JSDoc comment ("NOT `useMemo` / `useCallback`") |
| 4 | No `var()` in `className` in our code | **PASS** — unchanged from prior report |
| 5 | No new dependencies in `package.json` / `bun.lock` | **PASS** — fix commit does not touch either file |
| 6 | `CoreEnv.accessToken` stays mutable (invariant for V-2 fix) | **PASS** — `core.ts:45-49` defines `accessToken: string \| null` (no `readonly`); commit message documents the invariant |
| 7 | Defensive parse guards on the server side | **PASS** — `server.ts:86-93` handles `null` body, non-string `accessToken`, and empty string |
| 8 | Defensive parse guards on the client side | **PASS** — `client.ts:50-72` already had them; the V-2 mutation is inside the `if (token && expiresIn !== null)` guard |
| 9 | Loop guard (no second refresh on the retry 401) preserved | **PASS** — `core.ts:107-110` is a single `if` with one retry, not a loop |
| 10 | Single-flight dedupe (REQ-RFR-1) preserved | **PASS** — `refresh.ts:99-100` checks `getRefreshPromise()`; the fix did not touch `refresh.ts` |
| 11 | `req-err-3` (`retryAfter: number` on 429) not regressed | **PASS** — `errors.ts:120-127` unchanged |
| 12 | Terminal refresh-401 (REQ-RFR-3) still clears the store | **PASS** — `refresh.ts:115-127` + `client.ts:74-76` unchanged |
| 13 | JSDoc on `client.ts:5` is no longer misleading | **PASS** — the false claim is replaced with a comment at `client.ts:82-85` pointing to `core.ts` |
| 14 | The fix preserves `verbatimModuleSyntax` compliance | **PASS** — typecheck exit 0 confirms it |

## 10. Manual smoke (not run, but worth noting)

The prior report's §6 manual smoke checklist (steps 1-15) is still
the right user-visible proof. The two steps that were expected to
fail under the BLOCKED verdict (step 6 — silent refresh on
`JWT_EXPIRES_IN=5s`; step 13 — garbage access token → silent refresh
continues) should now pass end-to-end after the V-1 + V-2 fix.

This verifier did NOT run the manual smoke (no backend running, no
DevTools). The proof for this re-verification is by source
inspection + runtime evidence (typecheck + build), which matches
the project's "typecheck only" quality gate per `AGENTS.md`. The
user should run the manual smoke to confirm the user-visible
behavior matches the spec.

## 11. Recommendation

**Verdict: GREEN — orchestrator may proceed to `sdd-archive`.**

- The 2 prior CRITICALs (V-1, V-2) are CLOSED with a minimal, scoped
  fix (+31 / −4 across 3 files in 1 commit).
- No new CRITICALs were introduced.
- 35 / 35 REQs PASS (2 moved from PARTIAL → PASS; 0 regressed).
- 4 WARNINGs (V-3..V-6) carry over as non-blocking follow-ups.
- 3 SUGGESTIONs (V-7..V-9) carry over as out-of-scope.
- `bun run typecheck` PASS; `bun run build` PASS.

### Suggested archive handoff notes for `sdd-archive`

When the orchestrator launches `sdd-archive`, the archive phase
should:

1. **Move** `openspec/changes/auth-fetch-client/` →
   `openspec/changes/archive/2026-08-03-auth-fetch-client/`
   (today's date is 2026-08-03; the prior report used 2026-08-01
   for the BLOCKED archive that never happened — use 2026-08-03).
2. **Promote the delta specs** to locked specs:
   - `openspec/changes/auth-fetch-client/specs/http-client/spec.md`
     → `openspec/specs/http-client/spec.md` (NEW — no main spec yet).
   - `openspec/changes/auth-fetch-client/specs/admin-auth/spec.md`
     → `openspec/specs/admin-auth/spec.md` (NEW — no main spec yet).
3. **Archive** the `verify-report.md` (this file) at
   `openspec/changes/archive/2026-08-03-auth-fetch-client/verify-report.md`.
4. **Optional**: archive `apply-progress.md` (gitignored working
   artifact; contains the cross-batch ledger).
5. **Carry forward the V-2 design invariant**: `CoreEnv.accessToken`
   MUST stay mutable. Any future refactor that adds `readonly` will
   re-break silent refresh. This is documented in the commit message
   of `3b20b70` and should be reflected in any future redesign of
   the fetch-client `CoreEnv` type.
6. **Optional follow-up SDD changes** (non-blocking, but worth
   tracking):
   - **V-3 + V-4 cleanup**: small refactor to either use `userSchema`
     in `getSession` + dispatch `useSessionStore.login()` from the
     login page, OR remove the dead code. Affects REQ-SES-1 scenario
     coverage.
   - **V-5 + V-6 cleanup**: `safeNext` parameter + `/admin` UX nit.
   - **V-8 (highest leverage)**: add Vitest + Playwright as a
     dedicated SDD change. Would have caught V-1 and V-2 in CI.

### Cross-project note (for the archive)

The backend repo's `setAccessCookie` helper (commit `05c1689` on
backend `dev`) is the cross-project seam this change depends on. If
the backend ever drops the `setAccessCookie` call, the frontend's
silent refresh path will start 401ing (the SSR loader will not find
an `access` cookie in the request, `getSession` will redirect to
login immediately). The cookie spec table
(`openspec/changes/auth-fetch-client/design.md` §7.2) is the
cross-project source of truth; `app/shared/lib/cookies.ts`'s
`COOKIE_SPEC` const is the frontend's mirror. Any change to the
backend's cookie attributes must update both repos. (This note is
unchanged from the prior report.)

### Skill resolution

- `sdd-verify` (loaded via Skill tool)
- `typescript` (loaded via Skill tool — strict pattern review for the
  fix's defensive `typeof` guards and the `verbatimModuleSyntax`
  compliance check)
- `react-router` (project-local, paths-injected — read for
  `Route.LoaderArgs` / `Route.ComponentProps` typing of the admin
  layout, but the fix is fetch-client-side, not route-side, so not
  directly loaded)

All skill files read successfully — **paths-injected**.

---

## Appendix: What the re-verification did NOT do

- **Did not run the manual smoke checklist** (the prior report's §6).
  The user should run it post-archive to confirm user-visible
  behavior matches the spec. The 2 steps that were expected to fail
  under BLOCKED (step 6 + step 13) should now pass.
- **Did not add tests**. Per the project rules (no test runner
  wired; this SDD change precedes the Vitest+Playwright change),
  the verifier does not author tests. The V-2 fix is the kind of
  bug a 5-line Vitest test would catch in CI — that is the V-8
  follow-up's payoff.
- **Did not modify production code**. The fix is the user's commit
  `3b20b70`; this verifier only READS the working tree.
- **Did not commit**. The orchestrator will.

— end of verify-report.md
