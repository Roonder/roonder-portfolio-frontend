# auth-fetch-client — archive report

> **Verdict at archive**: GREEN. **Archived on**: 2026-08-03.
> **Cycle**: 1 backend prerequisite + 3 chained frontend PRs + 1 critical-fix commit on `main`.

## Outcome in 30 seconds

The unified HTTP client (`http-client` capability) and the admin auth subdomain (`admin-auth` capability) shipped end-to-end. Both are now **locked specs**. The change is closed and the next cycle can start.

| Question | Answer |
| --- | --- |
| Is the change closed? | Yes — `openspec/changes/auth-fetch-client/` is gone; only `archive/` remains. |
| Where do the new contracts live? | `openspec/specs/http-client/spec.md` (454 lines, 18 REQs) and `openspec/specs/admin-auth/spec.md` (514 lines, 17 REQs). |
| What's the one thing future agents must NOT touch? | `CoreEnv.accessToken` MUST stay mutable. See `## Carry-forward invariants` below. |
| What's the next highest-leverage work? | Add Vitest + Playwright (verify report V-8) — would have caught V-1 and V-2 in CI. |

## What changed (commits, in order)

- **[backend, sibling repo]** `feat(auth): set non-HttpOnly access cookie on login and refresh` — the `setAccessCookie` helper; lands on backend `main` BEFORE the frontend chain.
- **PR 1 — foundation** (~220 lines): `core`, `serverFetch`, `clientFetch`, `single-flight refresh`, `ApiError`, `useSessionStore`, `swrFetcher`, `getSession`, cookie parser.
- **PR 2 — login UX** (~130 lines): login zod schema, login server action, react-hook-form login page, admin layout cookie gate, `useSessionStore.hydrate()` in `app/root.tsx`.
- **PR 3 — integration** (~50 lines): logout server action, sign-out button, `clientLoader` fallback for the cookie-missing window, `DESIGN.md` + `AGENTS.md` cross-repo mirror rules.
- **Fix on `main`** `3b20b70 fix(auth-fetch-client): address 2 CRITICALs in silent refresh` — closes V-1 (`credentials: 'include'` missing from `clientFetch`) and V-2 (refresh retry used the OLD access token). 3 files, +31/−4.

## Capabilities now locked (NEW)

| Capability | Spec path | REQs | Notes |
| --- | --- | --- | --- |
| `http-client` | `openspec/specs/http-client/spec.md` | 18 | First time locked. Pure `core` + `serverFetch` + `clientFetch` + `swrFetcher` + `ApiError` taxonomy. |
| `admin-auth` | `openspec/specs/admin-auth/spec.md` | 17 | First time locked. `useSessionStore`, admin layout cookie gate, login/logout server actions, `next` param safety. |

Both capabilities were previously only present as delta specs. No `openspec/specs/{http-client,admin-auth}/spec.md` existed before this archive — the delta IS the full spec.

## Resolved — carried forward as non-blocking follow-ups

These were WARNINGs (V-3..V-6) and SUGGESTIONs (V-7..V-9) in the verify report. They are NOT part of the locked contract. Track them as separate SDD changes when the leverage is right.

- **V-3** — `userSchema` is defined but never used at the `getSession` call site (dead code or missed narrowing).
- **V-4** — `useSessionStore.login()` action never called from any UI path; `user` is never populated on the client.
- **V-5** — `safeNext(next, currentPath)` has an unused `currentPath` parameter.
- **V-6** — `safeNext` rejects `?next=/admin` (no trailing slash); strict per spec but a UX nit.
- **V-7** — shadcn `field.tsx` has an upstream `useMemo` (out of our hands — MCP-managed).
- **V-8** — **Highest leverage**: add Vitest + Playwright as a dedicated SDD change. Would have caught V-1 and V-2 in CI. Flips `openspec/config.yaml > testing.strict_tdd` to `true`.
- **V-9** — `clientLoader` fallback for the cookie-missing window is documented WAI (the JSDoc at `app/routes/admin.tsx` is the right artifact).

## Carry-forward invariants

> These are design observations the implementation relies on. They are NOT part of the spec contract. A `bun run typecheck` pass will NOT catch a violation — it will surface as silent refresh breaking in production.

- **`CoreEnv.accessToken` MUST stay mutable.** Adding `readonly` to the `accessToken` field on the `CoreEnv` type (`app/shared/lib/fetch-client/core.ts:45-49`) will re-break silent refresh. The V-2 fix in commit `3b20b70` mutates `env.accessToken = token` inside the refresh callback (both client and server paths) so the retry uses the NEW access token. `readonly` would silently re-introduce the "retry uses stale token → 401 → terminal redirect to login" bug. This invariant is also appended to `design.md` in this archive.

## Cross-project contract (locked against the backend)

The cookie spec is the single seam. Both repos reference it; drift is the frontend's job to catch.

| Cookie | Set by | `httpOnly` | `secure` | `sameSite` | `path` | Cleared on |
| --- | --- | --- | --- | --- | --- | --- |
| `rt` (refresh) | backend `setRefreshCookie` | **true** | true | `lax` | `/` | `/auth/logout` (200), refresh-401/reuse-detected |
| `access` (JWT) | backend `setAccessCookie` (NEW) | **false** | true | `lax` | `/` | frontend logout action (`Max-Age=0`) |

Canonical source: `../roonder-portfolio-backend/openspec/specs/auth-domain/spec.md`.
Frontend mirror: `app/shared/lib/cookies.ts` (`COOKIE_SPEC` const).

> If the backend ever drops `setAccessCookie` on `/auth/login` or `/auth/refresh`, the frontend's silent refresh path will start 401ing and the SSR loader will redirect to login immediately. Update both repos if a cookie attribute changes.

## Verification evidence

See `verify-report.md` in this same archive folder.

- **35 / 35 REQs PASS** (2 moved from PARTIAL → PASS via the `3b20b70` fix).
- 0 new CRITICALs introduced.
- 4 WARNINGs + 3 SUGGESTIONs carried over (see `## Resolved` above).
- `bun run typecheck` — PASS.
- `bun run build` — PASS (149 ms built).
- Manual smoke (6 success criteria from the proposal) was NOT run by the verifier — user should run post-archive to confirm user-visible behavior matches the spec.

## Files in this archive

| File | Source | Archived? |
| --- | --- | --- |
| `proposal.md` | original | yes |
| `design.md` | original + `## Carry-forward invariants` appended | yes |
| `tasks.md` | original | yes |
| `verify-report.md` | original (GREEN) | yes |
| `specs/http-client/spec.md` | original delta | yes |
| `specs/admin-auth/spec.md` | original delta | yes |
| `apply-progress.md` | gitignored per `.gitignore:10` | **no** — session scratch, not an audit artifact |

## SDD cycle complete

The change has been planned, implemented, verified, and archived. Ready for the next change.
