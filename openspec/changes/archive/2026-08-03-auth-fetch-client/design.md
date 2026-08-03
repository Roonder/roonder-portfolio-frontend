# Design: `auth-fetch-client` — Unified HTTP Client + Admin Session Bootstrap

> Build the native-`fetch` HTTP client, the `useSessionStore` zustand
> store, and the admin auth subdomain (login form + admin gate + login
> server action) that consume them. This is the foundational change that
> every subsequent API call goes through.
>
> **Locked decisions** (do not re-debate): native `fetch` only (no
> axios/ky/ofetch); split `serverFetch` + `clientFetch` over a shared
> `core`; single-flight refresh; terminal refresh-401; access token in a
> non-HttpOnly `access` cookie (cross-project dependency on the backend);
> SWR keys equal the URL; `ApiError` is a discriminated union, not a
> class hierarchy; admin is English-only; login + logout are server
> actions; the `next` query param must be same-origin AND start with
> `/admin/`. See `proposal.md` §Open questions and §How for the full set.
>
> **Reading order**: this design assumes the explore, proposal, and
> specs are already read. It focuses on the *how*: module shape, data
> flow, cross-project coordination, and an 8-section concept primer so
> the same patterns can be re-applied in future projects.

## 1. Context

The frontend is a fresh scaffold: no HTTP client, no zustand stores, no
SWR provider, no admin login form. Every route is a `TODO` stub. The
first real feature (admin login) needs a way to talk to the backend at
`/api/v1/*` with bearer + cookie auth, single-flight refresh on 401,
and typed errors — from both React Router loaders (server) and SWR /
components (browser). This change builds that client and the
admin-auth subdomain on top of it, in a 3-PR chain that keeps every
slice under the 400-line review budget.

The change is cross-project: the backend at
`../roonder-portfolio-backend` must be modified first to set a
non-HttpOnly `access` cookie alongside the existing HttpOnly `rt`
cookie, so the access token can reach the server during SSR. That
backend PR is a separate, blocking PR; this design coordinates with it
via a shared cookie spec table (see §7).

## 2. Architecture overview

### 2.1 SSR + client topology

```
                  ┌────────────────────────────┐
                  │        Browser             │
   Cookie jar:    │  document.cookie:          │
   ┌────────────┐ │   - rt     (HttpOnly, no JS)│
   │ rt=<opaque>│ │   - access (NOT HttpOnly)  │
   │ access=<jwt>│ └─────┬───────────┬──────────┘
   └────────────┘       │           │
                        │ user nav  │ SWR revalidate
                        ▼           ▼
            ┌────────────────────────────┐
            │   React Router server      │    (loaders/actions, Bun)
            │   serverFetch(input, req): │
            │     - forwards Cookie head │
            │     - reads access cookie  │
            │     - returns { …,         │
            │       setCookies: string[] }│
            └──────────┬─────────────────┘
                       │ internal fetch
                       ▼
            ┌────────────────────────────┐
            │   NestJS backend           │    /api/v1/*
            │   - login / refresh /      │
            │     logout / profile       │
            │   - sets Set-Cookie:       │  ◄──  only on the INTERNAL response
            │     access & rt            │      (not the user's SSR response)
            └────────────────────────────┘
                       │
                       │ Set-Cookie on internal response
                       ▼
            ┌────────────────────────────┐
            │   serverFetch captures     │
            │   Set-Cookie via           │
            │   response.headers         │
            │   .getSetCookie()          │
            └──────────┬─────────────────┘
                       │ returns setCookies
                       ▼
            ┌────────────────────────────┐
            │   loader wraps return in   │
            │   data(payload, { headers: │
            │   { "Set-Cookie": … } })   │
            │   — React Router 8 auto-   │
            │   preserves Set-Cookie     │
            │   into child responses     │
            └──────────┬─────────────────┘
                       │ outgoing SSR response
                       ▼
            ┌────────────────────────────┐
            │   Browser receives new     │
            │   rt + access, both stored │
            │   in document.cookie       │
            └────────────────────────────┘
```

The single line that makes silent refresh on SSR work: the loader wraps
its return in `data(payload, { headers: { "Set-Cookie": <cookie string> } })`,
React Router 8's `getDocumentHeaders()` pre-pends any `Set-Cookie` from
parent loaders and actions into the outgoing response even without a
`headers` export in the child route (see
`node_modules/react-router/docs/how-to/headers.md` line 90 and
`dist/development/lib/server-runtime/headers.js` `prependCookies`).

### 2.2 Module layout

```
app/
  shared/
    lib/
      fetch-client/                      ◄── the HTTP client (new)
        core.ts                          pure request envelope + error map
        errors.ts                        ApiError class + ApiErrorKind
        server.ts                        serverFetch(request, init)
        client.ts                        clientFetch(init)
        swr-fetcher.ts                   swrFetcher for SWR
        refresh.ts                       single-flight refreshPromise
        get-session.ts                   loader-side session reader
    stores/
      session.ts                         useSessionStore (zustand)
    swr/
      fetcher.ts                         thin SWR wrapper
  admin/
    auth/                                ◄── admin auth subdomain (new)
      schema.ts                          zod loginSchema
      api/
        login.ts                         server-action wrapper
      pages/
        login.tsx                        react-hook-form page
      server/
        get-session.ts                   (alternative location — see §5 Q3)
  routes/
    admin.tsx                            (modify) real cookie gate
    admin.auth.tsx                       (modify) real login form
  lib/
    cookies.ts                           (new) tiny Cookie header parser
DESIGN.md                                (modify) /auth/me → /auth/profile,
                                         + client in §4
AGENTS.md                                (modify) "DESIGN.md mirrors backend
                                         locked specs" note
```

### 2.3 Cross-project seam

The single seam is the `access` cookie. The backend PR adds a
`setAccessCookie(res, token, expiresIn)` helper alongside the existing
`setRefreshCookie`, called from `login()` and `refresh()`. The frontend
reads the cookie on the server (via `request.headers.get('cookie')` →
`parseCookies()`) and on the client (via `document.cookie`). No other
contract changes; the `rt` cookie attributes, the `Authorization`
header, and the error envelope are all already locked by the backend's
`auth-domain` spec.

## 3. Module designs

### 3.1 `app/shared/lib/fetch-client/core.ts` — the pure envelope

**Purpose**: build the request, run `fetch`, map the response to a
typed `{ status, data, headers }` shape OR throw an `ApiError`. No
cookie strategy, no zustand, no environment sniff — those belong to
the wrappers.

**Exports** (typed signatures only):

```ts
import type { z } from "zod";
import type { ApiError } from "./errors";

export type RequestInit_ = Omit<RequestInit, "body" | "headers" | "signal"> & {
  url: string;
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  headers?: HeadersInit;
  body?: BodyInit | unknown; // JSON-serialized when not a BodyInit
  signal?: AbortSignal;
  // Generic narrowing: when a schema is provided, `data` is z.infer<S>;
  // when omitted, `data` is `unknown`. S constrained to the new zod 4
  // base type (ZodTypeAny is deprecated in zod 4).
  schema?: z.ZodType;
  // Internal: skip the bearer / skip the refresh policy. Used by the
  // refresh call itself and by /auth/login to avoid recursion.
  skipAuth?: boolean;
  skipRefresh?: boolean;
};

export type CoreResult<S extends z.ZodType | undefined = undefined> = {
  status: number;
  data: S extends z.ZodType ? z.infer<S> : unknown;
  headers: Headers;
};

// Environment: passed in by the wrapper. Keeps core pure.
export type CoreEnv = {
  // Where the access token lives (client reads from zustand; server
  // reads from the access cookie in the request).
  getAccessToken: () => string | null | Promise<string | null>;
  // Where the request signal comes from. Both wrappers set this; core
  // composes it with AbortSignal.any([env.signal, init.signal]) when
  // both are present.
  signal?: AbortSignal;
  // Refresh policy — implemented in `refresh.ts`, injected so core
  // stays pure and unit-testable. The wrapper creates a refresh-policy
  // closure that captures the right env.
  onUnauthorized: (signal: AbortSignal) => Promise<void>;
};

export function requestCore<
  S extends z.ZodType | undefined = undefined,
>(
  init: RequestInit_,
  env: CoreEnv,
): Promise<CoreResult<S>>;
```

**Internal state**: none at module level. All per-call state is
local. The `refreshPromise` lives in `refresh.ts`, not here.

**Dependencies**: `errors.ts` (for `ApiError` + `API_ERROR_KIND`),
`refresh.ts` (only via the `onUnauthorized` callback; no static
import — the callback is the seam), the platform `fetch` + `Headers`
+ `AbortController`.

**Error semantics**: the status → `ApiError.kind` map is centralized
in one switch. Parsing the backend's canonical envelope happens
exactly once; the parsed `ApiError` is the single throw type.

| Backend status | `kind`                          | Extra fields                          |
| -------------- | ------------------------------- | ------------------------------------- |
| 400            | `validation`                    | `fieldErrors: Record<string, string[]>` parsed from `message[]` |
| 401            | `unauthorized`                  | — (refresh path treats this as terminal — see `refresh.ts`) |
| 403            | `forbidden`                     | —                                     |
| 404            | `notFound`                      | —                                     |
| 409            | `conflict`                      | —                                     |
| 429            | `throttled`                     | `retryAfter: number` (from `Retry-After` header) |
| 5xx            | `server`                        | —                                     |
| `TypeError`/`AbortError` from `fetch` | `network`        | —                                     |
| 2xx + zod parse fail | `server` (treat as contract bug) | —                              |

**Schema narrowing**: when `init.schema` is provided, `core.ts` runs
`schema.safeParse(json)` after a 2xx. On `success: true`, `data` is
typed `z.infer<S>`. On `success: false`, `core.ts` throws
`ApiError { kind: 'server' }` (the contract is broken; not the
caller's fault). The safeParse path NEVER swallows the zod error
silently — DEV-mode `console.error` is allowed but not relied on.

### 3.2 `app/shared/lib/fetch-client/refresh.ts` — single-flight

**Purpose**: collapse N concurrent 401s into ONE in-flight
`POST /api/v1/auth/refresh` and expose the dedupe point as a callback.

**Exports**:

```ts
import type { ApiError } from "./errors";

// The wiring for the refresh policy is a closure created by the
// environment wrappers. The closure knows whether we're on the
// client (zustand update + cookie clear) or the server (capture
// Set-Cookie for forwarding). The core only ever sees a function.
export type RefreshPolicy = (signal: AbortSignal) => Promise<void>;

// Helper to build the policy. Free function (no factory) — the
// refreshPromise is a module-level let.
export function makeRefreshPolicy(env: CoreEnv): RefreshPolicy;
```

**Internal state**: a single module-level variable
`refreshPromise: Promise<void> | null`. When the first 401 is
observed and `refreshPromise` is `null`, the policy sets it and
awaits the refresh `fetch`; on resolution it clears the variable. The
single-flight pattern in code:

```ts
// refresh.ts — sketch (NOT the final implementation)
let refreshPromise: Promise<void> | null = null;

export function makeRefreshPolicy(env: CoreEnv): RefreshPolicy {
  return async (signal) => {
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async () => {
      try {
        await requestCore(
          { url: "/api/v1/auth/refresh", method: "POST", skipAuth: true, skipRefresh: true, signal },
          env,
        );
        // env.onRefreshed() — applied by the wrapper, NOT here, so
        // the server wrapper can capture the Set-Cookie and the
        // client wrapper can update zustand.
        await env.onRefreshed?.();
      } finally {
        refreshPromise = null;
      }
    })();
    return refreshPromise;
  };
}
```

**Dependencies**: `core.ts` (for the internal refresh `fetch`),
`errors.ts`. The zustand store and the cookie parser are passed in
via `env` callbacks — no direct import of the session store from
`refresh.ts`.

**Error semantics**: if the refresh `fetch` throws
`ApiError { kind: 'unauthorized' }` (terminal), the policy:
1. clears the `useSessionStore` (client) or surfaces the error to the
   loader (server) so it can `throw redirect()`,
2. re-throws the `ApiError` so `core.ts` can propagate it to the
   original caller.

If the refresh throws `AbortError` (user navigated away), the policy
silently swallows it — there's no session to clear when the page is
gone.

### 3.3 `app/shared/lib/fetch-client/server.ts` — `serverFetch`

**Purpose**: the loader/action-facing entry point. Forwards the
incoming `Cookie` header, reads the `access` cookie as the bearer
fallback, captures the `Set-Cookie` from the internal response so the
loader can forward it via `data()`.

**Exports**:

```ts
import type { z } from "zod";
import type { CoreResult, RequestInit_ } from "./core";

export type ServerResult<S extends z.ZodType | undefined = undefined> =
  CoreResult<S> & {
    // The Set-Cookie values from the internal backend response. The
    // loader is responsible for forwarding them via data(). React
    // Router 8 auto-merges Set-Cookie from data() into child
    // responses even without a headers() export in the child.
    setCookies: string[];
  };

// `request` is the loader's incoming Request. Required.
export function serverFetch<
  S extends z.ZodType | undefined = undefined,
>(
  request: Request,
  init: Omit<RequestInit_, "skipAuth" | "skipRefresh">,
): Promise<ServerResult<S>>;
```

**Internal behavior**:
1. Read `request.headers.get('cookie')` → forward verbatim as the
   internal `Cookie` header (this is what makes `rt` ride along on
   `/auth/refresh` during SSR).
2. Parse the cookie for `access=<jwt>` → use as `Authorization`
   unless the caller passed an explicit one.
3. Compose the abort signal: `AbortSignal.any([request.signal, init.signal])`.
   `request.signal` is React Router 8's loader abort.
4. After `core.ts` returns, snapshot the internal response's
   `Set-Cookie` via `response.headers.getSetCookie()` and put it on
   `serverResult.setCookies`.
5. If the `core.ts` path threw an `ApiError { kind: 'unauthorized' }`
   from a NON-auth endpoint, the env's `onUnauthorized` triggers a
   silent `POST /auth/refresh` via `serverFetch` itself (the policy
   builds a sub-call with the same `request`), retries the original
   once, and merges the new `setCookies`. If the retry still 401s,
   the policy clears the store (via env callback) and re-throws
   `ApiError { kind: 'unauthorized' }` so the loader can
   `throw redirect('/admin/auth?next=…')`.

**Dependencies**: `core.ts`, `refresh.ts`, `../lib/cookies.ts` (the
cookie parser), `app/shared/stores/session.ts` (via the `env` — the
store's `clear()` action is the server-side "clear" hook; the
zombie cookie clear in the loader's `Set-Cookie` is the actual
cookie-level wipe).

### 3.4 `app/shared/lib/fetch-client/client.ts` — `clientFetch`

**Purpose**: the browser entry point. Uses `credentials: 'include'`
so `rt` rides along, reads the access token from `useSessionStore`,
runs the same single-flight refresh on 401.

**Exports**:

```ts
import type { z } from "zod";
import type { CoreResult, RequestInit_ } from "./core";

export function clientFetch<
  S extends z.ZodType | undefined = undefined,
>(
  init: Omit<RequestInit_, "skipAuth" | "skipRefresh">,
): Promise<CoreResult<S>>;
```

**Internal behavior**:
1. Add `credentials: 'include'` to every request so the HttpOnly
   `rt` cookie rides.
2. Read `useSessionStore.getState().accessToken` → inject as
   `Authorization: Bearer <token>` UNLESS the URL matches
   `/api/v1/auth/login` or `/api/v1/auth/refresh` (skip list — the
   spec's REQ-CLI-2).
3. Compose abort signal: `AbortSignal.any([init.signal])` (no
   `request.signal` on the client; effects create their own).
4. Same single-flight refresh via the policy as `server.ts`. The
   `onRefreshed` callback updates `useSessionStore` with the new
   access token; on terminal 401, the callback clears the store.

**Dependencies**: `core.ts`, `refresh.ts`, `useSessionStore` from
`app/shared/stores/session.ts`.

### 3.5 `app/shared/lib/fetch-client/errors.ts` — `ApiError` taxonomy

**Purpose**: the single error type every consumer pattern-matches on.

**Exports**:

```ts
// Const-object pattern (per typescript skill) so adding a kind is
// one edit and the compiler re-checks every switch.
export const API_ERROR_KIND = {
  unauthorized: "unauthorized",
  forbidden: "forbidden",
  notFound: "notFound",
  conflict: "conflict",
  throttled: "throttled",
  validation: "validation",
  server: "server",
  network: "network",
} as const;
export type ApiErrorKind = (typeof API_ERROR_KIND)[keyof typeof API_ERROR_KIND];

// Per-kind payload map. Each kind gets exactly the fields it can
// have. validation -> fieldErrors; throttled -> retryAfter; the rest
// -> message only. Discriminated union → exhaustive switch narrows
// correctly.
export type ApiErrorPayload =
  | { kind: "unauthorized"; status: number; message: string }
  | { kind: "forbidden";   status: number; message: string }
  | { kind: "notFound";    status: number; message: string }
  | { kind: "conflict";    status: number; message: string }
  | { kind: "throttled";   status: number; message: string; retryAfter?: number }
  | { kind: "validation";  status: number; message: string; fieldErrors: Record<string, string[]> }
  | { kind: "server";      status: number; message: string }
  | { kind: "network";     status: number; message: string };

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;
  readonly fieldErrors?: Record<string, string[]>;
  readonly retryAfter?: number;
  constructor(p: ApiErrorPayload) { super(p.message); this.name = "ApiError"; this.kind = p.kind; this.status = p.status; if (p.kind === "validation") this.fieldErrors = p.fieldErrors; if (p.kind === "throttled") this.retryAfter = p.retryAfter; }
}

// The exhaustive-switch helper. Use:
//   switch (err.kind) { case API_ERROR_KIND.unauthorized: …; … }
// The compiler enforces the case list.
```

The consumer pattern (exhaustive switch with narrowing):

```ts
// in a form
if (fetcher.data && fetcher.data.error) {
  const err = fetcher.data.error as ApiError;
  switch (err.kind) {
    case API_ERROR_KIND.validation:
      // err.fieldErrors is Record<string, string[]>
      return <FormFieldError errors={err.fieldErrors.email} />;
    case API_ERROR_KIND.unauthorized:
      return <p>Invalid credentials</p>;
    case API_ERROR_KIND.throttled:
      return <p>Too many attempts. Try in {err.retryAfter ?? 30}s</p>;
    // …the other 5 cases…
  }
}
```

### 3.6 `app/shared/lib/fetch-client/swr-fetcher.ts` — SWR wrapper

**Exports**:

```ts
// Per REQ-SWR-1. The function returns `result.data` so SWR's `data`
// is the parsed payload, not the { status, data, headers } wrapper.
export const swrFetcher: <S extends z.ZodType | undefined = undefined>(
  url: string,
) => Promise<S extends z.ZodType ? z.infer<S> : unknown>;
```

The wrapper is a thin one-liner. SWR keys equal the URL (REQ-SWR-2);
mutating the key in the fetcher would defeat SWR's dedupe.

### 3.7 `app/shared/lib/fetch-client/get-session.ts` — the session reader

This is the helper the admin layout loader uses. See §5 Q3 for why it
lives here, not in `app/admin/auth/server/`. Signature:

```ts
import type { User } from "app/admin/auth/schema"; // (see §3.8)

export type Session =
  | { authenticated: true; user: User; setCookies: string[] }
  | { authenticated: false };

// Calls serverFetch("/api/v1/auth/profile") via the loader's request.
// Returns the user (with setCookies so the loader forwards via
// data()) or throws redirect("/admin/auth?next=…") on terminal 401.
export async function getSession(request: Request): Promise<Session>;
```

### 3.8 `app/admin/auth/schema.ts` — zod login schema

```ts
import { z } from "zod";

// Mirrors backend's LoginDto: email + password (≥8).
export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "String must contain at least 8 character(s)"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// The profile shape (mirrors GET /api/v1/auth/profile).
export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
});
export type User = z.infer<typeof userSchema>;

// The auth response shape (mirrors POST /auth/login + /auth/refresh).
export const authResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number().int().positive(),
});
```

### 3.9 `app/admin/auth/api/login.ts` — server action

**Exports**:

```ts
import type { Route } from "./+types/login"; // virtual type

// React Router 8 server action. Called by the form's `<Form method="post">`.
// Returns either `redirect(safeNext)` on success or
// `data({ error: apiError }, { status })` on failure.
export async function loginAction({ request }: Route.ActionArgs): Promise<Response>;
```

Internal behavior: parse `FormData` → validate with `loginSchema` →
call `serverFetch(request, { url: "/api/v1/auth/login", method: "POST", body: { email, password } })` → on 200, the server action
forwards `setCookies` via `redirect(safeNext, { headers: { "Set-Cookie": … } })`.
On 401/400, it returns `data({ error: <ApiError> }, { status })` so the
form can read `fetcher.data.error` and pattern-match.

### 3.10 `app/admin/auth/pages/login.tsx` — the form page

**Component shape** (presentational; the action is in §3.9):

```tsx
// Uses react-hook-form + zodResolver(loginSchema).
// On submit, calls fetcher.submit(values, { method: "post", action: "/admin/auth" }).
// Reads fetcher.data.error as ApiError and renders the right branch.
// Uses shadcn Input + Label + Field primitives (added via the shadcn
// MCP during apply — not in this design's file count).
```

**Note on pending UI**: per React 19 idiom, this uses
`useActionState(action, null)` from `react` for per-form pending state
(confirming the spec's open question 4). The top-level nav pending
(`useNavigation()`) is for global page transitions, not form
submission, so the form uses its own state.

### 3.11 `app/shared/stores/session.ts` — zustand store

**Shape** (per REQ-SES-1, REQ-SES-3, with no `persist` per REQ-SES-2):

```ts
import { create } from "zustand";
import type { User } from "app/admin/auth/schema";

export type SessionState = {
  accessToken: string | null;
  expiresAt: number | null;  // ms epoch, NOT a JWT decode
  user: User | null;
};

export type SessionActions = {
  // Read the access cookie once and set the state. Called from
  // app/root.tsx on first client render. Does NOT throw if the
  // cookie is missing — leaves state at initial values.
  hydrate: () => void;

  // Called after a successful login. Writes the new token + user.
  login: (input: { accessToken: string; expiresIn: number; user: User }) => void;

  // Called after a successful silent refresh. Does NOT touch the user
  // payload (it is unchanged on refresh).
  refresh: (input: { accessToken: string; expiresIn: number }) => void;

  // Atomic clear. Called on logout, on terminal refresh-401, and on
  // the server side via a callback. Resets to initial state.
  logout: () => void;
};

export type SessionStore = SessionState & SessionActions;

export const useSessionStore = create<SessionStore>()((set) => ({
  accessToken: null,
  expiresAt: null,
  user: null,
  hydrate: () => set(() => {
    const token = readAccessCookieClient();  // tiny document.cookie read
    if (!token) return {};
    // We deliberately do NOT decode JWTs on the client — the server
    // is the source of truth. We do not set `user` here; the user is
    // populated by the layout loader's data or by login()'s return.
    return { accessToken: token };
  }),
  login: (input) => set({
    accessToken: input.accessToken,
    expiresAt: Date.now() + input.expiresIn * 1000,
    user: input.user,
  }),
  refresh: (input) => set((s) => ({
    accessToken: input.accessToken,
    expiresAt: Date.now() + input.expiresIn * 1000,
    // user unchanged
  })),
  logout: () => set({ accessToken: null, expiresAt: null, user: null }),
}));
```

**Selector examples**:

```ts
// Single field — preferred.
const user = useSessionStore((s) => s.user);

// Multiple fields — useShallow is required.
const { user, expiresAt } = useSessionStore(
  useShallow((s) => ({ user: s.user, expiresAt: s.expiresAt })),
);

// Outside React — store getter + action.
useSessionStore.getState().logout();
```

## 4. Data flows

### 4.1 Login (server action)

```
browser (form submit)
   │  POST /admin/auth  (FormData: email, password)
   ▼
app/routes/admin.auth.tsx action
   │  parseFormData → loginSchema.safeParse
   │  serverFetch(request, {
   │    url: "/api/v1/auth/login", method: "POST",
   │    body: { email, password }
   │  })
   ▼
core.ts → fetch http://backend/api/v1/auth/login
   │  200 + { accessToken, expiresIn }
   │  Set-Cookie: access=<jwt>; Secure; SameSite=Lax; Path=/; Max-Age=...
   │  Set-Cookie: rt=<opaque>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=...
   ▼
server.ts: capture both Set-Cookie values into serverResult.setCookies
   │
   ▼
admin.auth.tsx action
   │  return redirect(safeNext, {
   │    headers: { "Set-Cookie": serverResult.setCookies.join(", ") }
   │  })
   │  // React Router 8's prependCookies auto-merges into the child response
   ▼
browser receives redirect + both Set-Cookie headers
   │  document.cookie now has access=... and rt=...
   │
   ▼
browser navigates to safeNext (e.g. /admin)
   │  hydrate() runs in app/root.tsx → useSessionStore has accessToken
   │  layout loader runs → getSession(request) → serverFetch /auth/profile
   │  → returns { user, setCookies: [] } (no rotation on this code path)
   ▼
admin layout renders with user
```

### 4.2 Protected page on SSR (success)

```
browser GET /admin/projects
   │  Cookie: rt=<opaque>; access=<jwt>
   ▼
app/routes/admin.projects.tsx loader
   │  serverFetch(request, { url: "/api/v1/admin/projects" })
   ▼
server.ts:
   │  - forwards Cookie verbatim
   │  - reads access=<jwt> → Authorization: Bearer <jwt>
   │  - calls core
   ▼
backend /api/v1/admin/projects → 200 + [...]
   ▼
loader returns data({ projects }, { headers: { "Set-Cookie": [] } })
   │  (or no headers key at all if setCookies is empty)
   ▼
SSR response sent
   │  React Router 8 prependCookies merges any Set-Cookie from
   │  data() into the outgoing response
   ▼
browser renders /admin/projects
```

### 4.3 Protected page on SSR with stale access token (silent refresh)

```
browser GET /admin/projects
   │  Cookie: rt=<opaque>; access=<stale-jwt>
   ▼
server.ts → backend /api/v1/admin/projects → 401
   │
   ▼
core.ts maps to ApiError { kind: "unauthorized" }
   │
   ▼
serverFetch catches → calls onUnauthorized (the refresh policy)
   │  serverFetch(request, { url: "/api/v1/auth/refresh", method: "POST", skipAuth: true })
   │  - forwards Cookie (carries rt)
   │  - no Authorization header
   ▼
backend /api/v1/auth/refresh → 200 + { accessToken, expiresIn }
   │  Set-Cookie: rt=<rotated>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=...
   ▼
refresh policy:
   │  1. captures the new Set-Cookie
   │  2. retries the ORIGINAL request: serverFetch(request, { url: "/api/v1/admin/projects" })
   │  - this time the access token is fresh → 200
   │  3. merges the new Set-Cookie into the retry's serverResult.setCookies
   ▼
loader returns data({ projects }, {
   headers: { "Set-Cookie": [newRt, newAccess] }
   })
   ▼
browser stores the new rt and access; user sees /admin/projects
```

The `access` cookie is re-set on the refresh path because the
backend's helper sets both. The frontend reads the new value on the
next loader via the same `request.headers.get('cookie')` →
`parseCookies()` step.

### 4.4 Terminal refresh-401

```
browser GET /admin/projects (rt is missing/expired/reuse-detected)
   ▼
serverFetch → backend /api/v1/admin/projects → 401
   ▼
refresh policy → serverFetch /api/v1/auth/refresh → 401
   │  (backend also returns Set-Cookie: rt=; Max-Age=0)
   ▼
refresh policy:
   │  1. surface the terminal 401 to the original caller as
   │     ApiError { kind: "unauthorized" }
   │  2. do NOT retry again
   ▼
serverFetch re-throws
   ▼
loader catches → throw redirect(
   "/admin/auth?next=" + encodeURIComponent(new URL(request.url).pathname)
)
   ▼
browser navigates to /admin/auth?next=/admin/projects
   │  - silent (no toast, no modal — locked decision D4)
   │  - useSessionStore.hydrate() runs; the access cookie is also
   │     cleared (or expired); store state is reset
```

### 4.5 Client-side SWR call (success)

```
Component:
  const { data } = useSWR('/api/v1/projects', swrFetcher);
   │
   ▼
swrFetcher('/api/v1/projects')
   │  clientFetch({ url: '/api/v1/projects', method: 'GET' })
   ▼
client.ts:
   │  - credentials: 'include' (rt rides)
   │  - Authorization: Bearer <useSessionStore.getState().accessToken>
   │  - calls core
   ▼
backend → 200 + [...]
   ▼
swrFetcher resolves to data
```

### 4.6 Client-side SWR call (silent refresh, N concurrent)

The 5-key case is the spec's REQ-RFR-1. The single-flight
`refreshPromise` is the key. Sequence:

```
T0: useSWR('/api/v1/projects').revalidate
T0: useSWR('/api/v1/admin/projects').revalidate
T0: useSWR('/api/v1/admin/reviews').revalidate
T0: useSWR('/api/v1/admin/contact').revalidate
T0: useSWR('/api/v1/about').revalidate
   │
   ▼
T0+1ms: 5 clientFetch calls in flight
   │
   ▼
T0+50ms: 5× 401 responses (all from backend)
   │
   ▼
First caller (projects) sees ApiError.unauthorized:
   - refreshPolicy is called
   - module-level refreshPromise is null
   - sets refreshPromise = POST /api/v1/auth/refresh
   - awaits it
   │
   ▼
Second through fifth callers (admin/projects, reviews, contact, about)
   - all see ApiError.unauthorized
   - all call refreshPolicy
   - module-level refreshPromise is NOT null
   - all await the SAME promise (no new refresh)
   │
   ▼
T0+150ms: refresh resolves
   - new access token written to useSessionStore via onRefreshed callback
   - new Set-Cookie received (rt rotated)
   │
   ▼
All 5 callers retry their original request with the new access token
   │
   ▼
T0+200ms: 5× 200 responses
   - each caller's data is set in its SWR cache
```

This is why the module-level `refreshPromise: Promise<void> | null`
matters. N concurrent 401s with the family-revocation semantics of
the backend would otherwise kill the session on the second refresh.

### 4.7 Cookie-missing window (PR 2 before backend PR)

When PR 2 (login UX) lands but the backend's `access` cookie PR has
not yet landed, the SSR happy path breaks. The frontend design
mitigates this with a `clientLoader` fallback on the admin layout.

```
browser GET /admin
   │  Cookie: rt=<opaque>  (no access — backend PR not merged)
   ▼
admin layout loader
   │  getSession(request):
   │    - serverFetch /api/v1/auth/profile
   │    - access cookie missing → no Authorization header
   │    - backend returns 401
   │  → throw redirect("/admin/auth?next=/admin")
   │
   ▼
browser is at /admin/auth
   │  (the admin layout's clientLoader fallback runs in dev for the
   │   user; the production redirect wins on first SSR)
   │
   ▼
The clientLoader fallback (added in PR 2) is wired in
   app/routes/admin.tsx as a SAFETY NET for this exact window:
   - if the SSR loader threw redirect, the client loader checks
     document.cookie for `access` and if present, re-runs the gate
   - this is a NO-OP once the backend PR lands, so it can stay in
   the code permanently with a comment explaining the historical
   reason
```

The cleaner answer: PR 2 ships the `clientLoader` fallback, but the
production path stays the SSR loader. Once the backend PR lands, the
`clientLoader` is dead code that costs one `document.cookie` read per
admin navigation; we accept that cost to allow the frontend chain to
ship in parallel.

## 5. Resolved open questions (from the spec)

| # | Question | Resolution | Rationale |
| - | - | - | - |
| 1 | `core` module shape: free functions vs factory? | **Free functions with module-level `refreshPromise` in `refresh.ts`.** No factory, no DI seam. | The no-test-runner reality means DI seams are speculative complexity. Free functions are simpler and the `refreshPolicy` callback injection in `CoreEnv` already gives a test seam for the future Vitest change. A factory would add 30+ lines of API surface for no current benefit. |
| 2 | Generic narrowing for optional `schema`? | `requestCore<S extends z.ZodType \| undefined = undefined>(init, env): Promise<{ status, data: S extends z.ZodType ? z.infer<S> : unknown, headers: Headers }>`. Uses `z.ZodType`, NOT `z.ZodTypeAny` (deprecated in zod 4 — `node_modules/zod/v4/classic/compat.d.ts:41`). | zod 4 deprecated `ZodTypeAny`; the new base type `ZodType` is the correct constraint. The conditional `S extends z.ZodType ? z.infer<S> : unknown` matches the spec's candidate exactly and is the only way to get narrowing without an overload. |
| 3 | `getSession(request)` placement? | **`app/shared/lib/fetch-client/get-session.ts`** (this design's §3.7). | The helper is a thin wrapper around `serverFetch("/auth/profile")`. It is not specific to the admin subdomain (the public site might call it later to show "logged in as X" in the header). It belongs next to the client it wraps. `app/admin/auth/server/get-session.ts` would be the right home for *admin-only* session helpers, but this one is general. |
| 4 | `clientLoader` fallback during the backend-blocking window? | **Add a `clientLoader` in `app/routes/admin.tsx` that re-runs the gate if `document.cookie` has `access`** (see §4.7). The SSR loader stays the production path; the clientLoader is a historical safety net. | Allows PR 2 to ship in parallel with the backend PR. Cost is one `document.cookie` read per admin navigation forever — acceptable. Once the backend PR lands, the clientLoader is dead code with a comment; we do not remove it. |
| 5 | i18n on the login form? | **Zero i18n keys. Hardcoded English.** | Locked decision D8. Admin is English-only today. Adding a key now creates a maintenance surface for a second locale that may never come. The apply phase uses string literals: `<Label>Email</Label>`, `<Button>Sign in</Button>`. |
| 6 | Logout cookie clearing? | **The server action also writes `Set-Cookie: access=; Max-Age=0` alongside the backend's `Set-Cookie: rt=; Max-Age=0`.** The store clear (`useSessionStore.logout()`) is the JS-side wipe; the cookie wipe is the HTTP-side wipe. | The `access` cookie is set by the backend but not cleared by it on `/auth/logout` (the backend only clears `rt`). Without an explicit clear on `access`, the next page render would re-hydrate the store from a stale token. The server action appends a `Set-Cookie: access=; Max-Age=0; Path=/; Secure; SameSite=Lax` line to the response so both cookies are wiped atomically. |

## 6. The 8 concept primer sections

These are the deep-dive teaching sections. Each is meant to leave
you able to re-apply the pattern in another project with confidence,
not just this one. The analogies are repeated at the head of each
section for cross-referencing.

### 6.1 Why an access-token cookie (vs localStorage / sessionStorage / in-memory only)

The access token has to be reachable from the SERVER during SSR. The
loader on `app/routes/admin.tsx` runs in Node/Bun, before the
browser has any DOM. It needs to call `GET /api/v1/auth/profile`
with a `Authorization: Bearer <jwt>` to know who the user is. Three
storage options and why each fails for SSR:

- **`localStorage`**: browser-only. Not reachable from a loader.
  Every protected page would be client-rendered (CSR), which kills
  SEO and creates a flash of unauthenticated UI.
- **`sessionStorage`**: same problem (browser-only) plus it
  evaporates per tab — refreshing a tab would sign the user out.
- **In-memory only** (zustand without `persist`): same problem.
  The token is in JS memory only and resets on every page load.
  Worse: there's nowhere to read it from on the server.

A **non-HttpOnly cookie** solves all three: the browser auto-attaches
it on every request, so a loader on the server can forward it from
the incoming `request.headers.get('cookie')` to the internal backend
fetch. The token rides along without a second trip to the database.
The cookie attributes matter:

- `httpOnly: false` — required so the zustand `hydrate()` step can
  read it on the client (otherwise `document.cookie` returns nothing).
  This is the **only** reason `httpOnly` is off here. The XSS
  surface is acceptable because the `rt` cookie (the long-lived
  credential that could be replayed) is still HttpOnly and the
  `access` token has a 15-minute expiry.
- `secure: true` — HTTPS only. Even on localhost the `secure` flag
  is set; the browser ignores it on `http://localhost` which keeps
  the dev loop working.
- `sameSite: 'lax'` — allows top-level navigation from external
  links (e.g. an email "Sign in to your portfolio") while blocking
  CSRF on cross-site POSTs. `strict` would break that UX flow; the
  backend's `auth-domain` spec locks this.
- `path: '/'` — sent on every request to the site, not just
  `/admin`.
- `maxAge: <expiresIn * 1000>` — matches the access token's JWT
  `exp` so the cookie expires when the token does. The browser will
  drop it at that point.

**Analogy: the coat-check tag.** The `rt` cookie is the coat-check
ticket — locked in a vault the guest can't reach (HttpOnly). The
`access` cookie is the wristband the guest keeps visible — anyone
at the desk (the server) can scan it on the same visit, and the
guest can read it too, but losing the wristband only costs them the
next 15 minutes, not the whole night.

**When to reach for the alternative.** If your app is CSR-only
(Next.js with `"use client"` everywhere, or a Create React App
spa), you can put the access token in memory only and skip the
cookie. If you only need it in the browser (no SSR, no server
components), the cookie is overhead. Use a cookie when the server
has to be able to call the API on the user's behalf before the page
renders.

### 6.2 Why `serverFetch` + `clientFetch` (vs one `apiFetch`)

The two environments diverge in how cookies work, and that
divergence is fundamental, not incidental:

- **Server (Node/Bun, in a loader)**: there is no "current user's
  cookies" by default. The `fetch` global doesn't know which browser
  session is being served. You have to read the incoming request's
  `Cookie` header and forward it manually to the internal backend
  fetch. AND you have to read the access token from somewhere —
  either the forwarded cookie or a custom source.
- **Client (browser)**: the browser already knows the cookies.
  Setting `credentials: 'include'` on the fetch is enough for the
  `rt` cookie to ride. The access token lives in zustand, which
  the client can read synchronously.

A single `apiFetch(input, init)` that handles both would have to
either sniff `typeof window` (fragile, breaks in edge runtimes
that have a DOM but not `window` per the spec) or take a
`bindToRequest(request?)` helper that the loader calls first. Both
options are implicit — the call site doesn't know which strategy is
running. Splitting into `serverFetch` and `clientFetch` makes the
strategy visible at the call site. A loader writes `serverFetch`,
a component writes `clientFetch`, and there is no mistake to make.

The shared `core.ts` is the part that does NOT diverge: request
envelope, error mapping, single-flight refresh. The wrappers
(`server.ts`, `client.ts`) are thin. The split is screaming-
architecture-friendly: the loader lives in the server world, the
component lives in the client world, and they share a transport.

**Analogy: a power tool with two heads.** A router head and an
impact-driver head share the same motor (the `core`) but each has
the attachment designed for its medium. You don't pretend one head
can do both jobs; you swap heads. The motor never knows which head
is on.

**When to reach for the alternative.** If your app is one
environment only (CSR-only or SSR-only), one function is fine —
the divergence doesn't exist. If you have an edge-runtime that
sometimes has a `Request` and sometimes doesn't (Cloudflare Workers
with both `fetch` handlers and Durable Objects), a single
`apiFetch` with an env detection IS the right call, because the
overhead of explicit binding is worse than the implicit behavior.
The split is for the case where two environments are BOTH first-
class and the divergence is real.

### 6.3 Why single-flight refresh (vs "if 401, call refresh" per caller)

The backend's `auth-domain` spec locks the **refresh token reuse
detection** semantics: presenting an already-revoked `rt` cookie
revokes the whole `family_id`, logging the user out from every
device. This is the textbook OAuth 2.0 family revocation pattern
(RFC 6749 + RFC 6819). Without dedupe, a scenario like this kills
the session:

1. User opens 5 admin tabs.
2. All 5 tabs revalidate on focus (SWR's `revalidateOnFocus: true`).
3. The access token expired 30 seconds ago; all 5 see 401.
4. Tab A calls `POST /auth/refresh` → 200, `rt` rotated.
5. Tab B calls `POST /auth/refresh` with the now-STALE `rt` (the
   one it had in its cookie jar before A's rotation). The backend
   detects reuse → family revoked → all sessions dead.

The single-flight pattern collapses the 5 callers into 1 refresh
call. The module-level `refreshPromise: Promise<void> | null` is
the dedupe point: when the first 401 is observed and the variable
is `null`, set it; otherwise await the same promise. After
resolution, every queued caller retries the original request with
the new access token. The other 4 never fire a refresh; they
inherit Tab A's success.

The "module-level" is intentional. It is process-global. A per-
component or per-store `refreshPromise` would let N components
each have their own — defeating the dedupe. The module is the
right scope because the refresh result is the same for the entire
JS realm.

```ts
// refresh.ts (sketch)
let refreshPromise: Promise<void> | null = null;

export function makeRefreshPolicy(env: CoreEnv): RefreshPolicy {
  return async (signal) => {
    if (refreshPromise) return refreshPromise;   // dedupe
    refreshPromise = (async () => {
      try {
        await requestCore({ url: "/api/v1/auth/refresh", method: "POST", skipAuth: true, skipRefresh: true, signal }, env);
        await env.onRefreshed?.();
      } finally {
        refreshPromise = null;                    // reset for the next 401
      }
    })();
    return refreshPromise;
  };
}
```

The `finally` block resets `refreshPromise` to `null` even on
failure, so a 401 that happens 5 minutes later starts a fresh
attempt. (Of course, if the refresh itself 401s, the session is
terminal and the `env.onRefreshed` callback clears the store; the
next page navigation redirects to login.)

**Analogy: a single bartender serving a group.** Five patrons wave
their empty glasses at once. The bartender takes one trip to the
tap and pours five glasses. If each patron walked up to the tap
individually, the bartender would have to refuse the second,
third, fourth, and fifth because the first already drew the whole
pitcher — and in this case, the second draw from the same keg
detonates the whole bar (family revocation).

**When to reach for the alternative.** Single-flight is the right
pattern when the dedupe matters MORE than the cost of the
in-flight. If the dedupe is cosmetic (e.g. an idempotency key
for an analytics ping), per-caller is fine. If the dedupe is
security-critical (refresh tokens, idempotency keys for
non-replayable writes, OTP verifications), single-flight is
non-negotiable.

### 6.4 Why terminal refresh-401 (vs retry loop)

A refresh-401 means one of four things, all terminal:

1. The `rt` cookie is missing (the user never logged in, or
   someone cleared their cookies).
2. The `rt` is expired (`JWT_REFRESH_EXPIRES_IN` elapsed; default
   30 days).
3. The `rt` was revoked server-side (admin or self-initiated).
4. **Reuse detection** — the user is presenting an already-revoked
   `rt`, which the backend treats as a theft signal and revokes
   the entire family.

Retrying the refresh in any of these cases accomplishes nothing.
Case 1, 3, 4: there's nothing to retry with. Case 2: the cookie is
dead and will not come back. A retry loop also re-triggers reuse
detection, which would compound the problem by revoking any
remaining live tokens in the family.

The terminal path is:
1. The refresh policy's `onRefreshed` callback clears
   `useSessionStore` atomically (one `set()` call, one re-render).
2. The policy re-throws `ApiError { kind: "unauthorized" }`.
3. The caller (loader or SWR) either:
   - `throw redirect("/admin/auth?next=…")` (loader), or
   - surfaces a typed error to the UI which redirects (SWR
     caller).
4. No toast, no modal, no `console.error` — silent redirect
   (locked decision D4). The user was already expecting to log
   in; the redirect is the canonical "you need to sign in again"
   UX.

The store clear and the redirect are the same atomic event. The
`useSessionStore.logout()` action does a single `set({ accessToken:
null, expiresAt: null, user: null })` — three fields, one render.
The redirect is `throw redirect(...)` from the loader, which
React Router handles as a navigation. They are not two steps that
could race; the loader's `throw` short-circuits the data flow and
the navigation happens before any component sees the cleared
state.

**Analogy: a dead battery.** Turning the ignition again does not
help. The dashboard does not pop up a "battery low" modal — the
car just won't start, and you call roadside assistance. The
"roadside assistance" is the redirect to login. The user fills in
their credentials (the "new battery") and the car starts again
(`useSessionStore.hydrate()` repopulates on the next request).

**When to reach for the alternative.** A retry IS appropriate
when the failure is TRANSIENT and the same call has a meaningful
chance of succeeding on attempt 2. Network blips, 5xx, and
throttling fit this. Refresh-401 does NOT: the cookie state is
the failure, and the cookie state is the user's, not the
network's. The retry budget belongs on `network` and `server`
kinds, not on `unauthorized`.

### 6.5 Why `Set-Cookie` doesn't reach the browser during SSR (and how `data(payload, { headers })` fixes it)

A loader in React Router 8 Framework mode does this:

```ts
// app/routes/admin.tsx
export async function loader({ request }) {
  const session = await getSession(request); // calls serverFetch internally
  return data({ user: session.user }, {
    headers: { "Set-Cookie": session.setCookies.join(", ") }
  });
}
```

The loader's `data()` call returns an HTTP response. But the
`Set-Cookie` value here is NOT from a `Set-Cookie` the loader
emitted itself — it is from a `Set-Cookie` the **internal backend
fetch** received. The chain is:

1. Browser sends `GET /admin` with `Cookie: rt=...; access=...`.
2. React Router's loader runs. It calls `serverFetch(request, ...)`
   which does an INTERNAL `fetch('http://backend/api/v1/...')`.
3. The backend's `/auth/refresh` returns 200 + a new `rt` in
   `Set-Cookie`. That `Set-Cookie` is set on the INTERNAL response
   — the response of the server-to-backend fetch — NOT on the
   user's browser-facing response.
4. The browser never sees that internal response. The internal
   `Set-Cookie` is captured by `response.headers.getSetCookie()` in
   `server.ts` and returned in `serverResult.setCookies`.
5. The loader puts those values on the OUTGOING response via
   `data(payload, { headers: { "Set-Cookie": ... } })`.
6. React Router 8's `getDocumentHeaders()` calls `prependCookies()`
   which merges any `Set-Cookie` from `loaderHeaders` and
   `actionHeaders` into the outgoing response — even without an
   explicit `headers` export in the child route. This is the
   "notable exception" from the docs.
7. The browser stores the new `rt` cookie.

Without step 5, the new `rt` is lost. The browser keeps the old
`rt`, which (after the access token expires again) is now a
replay attempt against the backend's reuse detection — and the
session is dead.

**The "doorman and the courier" analogy.** The internal fetch is
the courier: it picks up a new `rt` from the back office (the
backend) and hands it to the doorman (your loader). The doorman
has to copy it onto YOUR mailbox (the outgoing response) — if he
just pockets it, you never get the new one and the next time you
ring the bell, the back office doesn't recognize you.

**When to reach for the alternative.** This pattern is React
Router 8-specific. Next.js Server Actions get the same effect via
the `cookies()` helper from `next/headers`. Remix v1 (the React
Router predecessor) had the same `data()` mechanism. In any
framework that does server-side data loading, look for the
documented way to attach headers to the outgoing response from a
loader/action — it will be there, and forgetting it will cause
the same "Set-Cookie doesn't reach the browser" bug.

### 6.6 Why native `fetch` is enough (no library)

The platform gives you everything: `fetch`, `Request`, `Response`,
`Headers`, `AbortController`, `AbortSignal`, `URL`, `URLSearchParams`,
`FormData`. Bun ships a Web-compatible `fetch`; Node 20+ does too.
The TypeScript types are in `lib.dom.d.ts` and `lib.webworker.d.ts`
and ship with the `typescript` dependency — no `@types/node-fetch`
or `@types/whatwg-fetch` needed.

The one gap libraries fill is **interceptors** — axios's
`interceptors.request.use(...)` lets you inject a token or log a
request without touching the call site. That sounds useful until
you realize the same pattern in plain TypeScript is shorter,
explicit, and easier to reason about:

```ts
// With axios:
axios.interceptors.request.use((config) => {
  const token = useStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// With native fetch + our client.ts:
const init: RequestInit_ = { url, method: "GET" };
const token = useSessionStore.getState().accessToken;
if (token) init.headers = { Authorization: `Bearer ${token}` };
return clientFetch(init);
```

The plain version is two lines and you can grep for it. The
interceptor version is hidden inside a magic chain. The
single-flight refresh pattern is harder to express with
interceptors because you need a way to retry a specific request —
axios's interceptor fires before the request, not after a 401.

**The other library APIs we explicitly rejected**:
- **ky** — wraps `fetch` with sugar. The sugar is convenience; the
  parts we actually need (timeout, AbortSignal, JSON parsing) are
  already in the platform.
- **ofetch** — same as ky, smaller, but still a wrapper. Adds an
  `ofetch.create({ baseURL })` concept we don't need.
- **got** — Node-only. Breaks the SSR/client symmetry.
- **redaxios** — axios's API on `fetch`. Same interceptor problem.

**Analogy: a well-stocked workshop.** A workshop with a full set
of hand tools (the platform `fetch` + friends) is enough to build
the chair. A workshop that owns a CNC machine (axios) is faster
for some jobs, but the setup time, the calibration, and the
"what does this knob do" learning curve exceed the savings. Reach
for the CNC when you're cutting the same part 10,000 times, not
when you're building one chair per project.

**When to reach for the alternative.** A library IS the right
call when (a) you need automatic retries with exponential backoff
across N endpoints, (b) you need distributed tracing hooks
(opentelemetry), (c) you're calling a third-party API whose quirks
need wrapping, or (d) you have a team that already knows the
library and the cost of teaching the platform outweighs the
dependency. None of these apply to this project today.

### 6.7 How `AbortController` integrates end-to-end

`AbortController` is the platform's cancellation primitive. It
plugs into `fetch` (`fetch(url, { signal })`) and into React Router
8's loader API (`request.signal`). The pattern is:

- **Loader side**: React Router 8 gives you `request.signal`. The
  loader composes it with any other signals:
  `AbortSignal.any([request.signal, init.signal])`. If the user
  navigates away before the loader finishes, `request.signal` is
  aborted, the internal `fetch` is cancelled, and the
  `AbortError` propagates as `ApiError { kind: 'network' }`.
- **Client side**: effects and `useSWR` create their own
  `AbortController` on mount and `.abort()` on unmount. SWR
  uses its own internal `AbortController` for revalidations.
- **Refresh side**: the `refreshPromise` inherits the original
  request's `signal`. If the user navigates away mid-refresh, the
  refresh `fetch` is cancelled. The `try/finally` in
  `refresh.ts` still resets `refreshPromise` to `null` because
  the `finally` runs on abort too.

The `ApiError.kind === 'network'` mapping for `AbortError` is
critical. Without it, every cancelled request would throw an
`Error` with a name like `AbortError` and consumers would have to
remember to catch a separate class. The discriminated union
absorbs the cancellation as just another kind — the caller can
do `if (err.kind === 'network' && err.message.includes('abort'))
return <EmptyState />` and treat it as "no data, no error".

```ts
// core.ts (sketch)
try {
  const response = await fetch(url, { ...init, signal });
  // ...
} catch (e) {
  if (e instanceof DOMException && e.name === "AbortError") {
    throw new ApiError({
      kind: API_ERROR_KIND.network,
      status: 0,
      message: "Request aborted",
    });
  }
  // network failure (DNS, offline, CORS, etc.)
  throw new ApiError({
    kind: API_ERROR_KIND.network,
    status: 0,
    message: e instanceof Error ? e.message : "Network error",
  });
}
```

**The "rope on a doorbell" analogy.** `AbortController` is a rope
tied to a doorbell. When you pull the rope, the doorbell stops
ringing. React Router 8 ties the rope to the navigation event;
`useEffect`'s cleanup ties the rope to the unmount event; the
user's "Cancel" button can tie a third rope. The signal is the
"stop everything currently in flight" message — it doesn't matter
who pulled the rope, the doorbell stops.

**When to reach for the alternative.** `AbortController` is the
right tool for cancellation. If you need to **pause** a request
and **resume** it later, the platform has no answer (the spec
worked on it but it was dropped). You'd need to cancel and re-
issue, which means making the request idempotent on the server
side. For our client, this never comes up.

### 6.8 How to type errors with discriminated unions

A class hierarchy for HTTP errors is a footgun. The mental model
"every error is a class, and the consumer does `instanceof`" runs
into:

1. **Statically unverifiable chains.** When the consumer reads
   `err instanceof ValidationError`, the compiler cannot prove
   that the variable is an `Error` at all, let alone a
   `ValidationError`. The chain has to be defended with `try {
   ... } catch (e: unknown) { if (e instanceof Error) ...
   }`. The boilerplate grows.
2. **No narrowing on optional fields.** `ValidationError` has
   `fieldErrors?: Record<string, string[]>`. If the consumer
   does `if (err instanceof ValidationError) { err.fieldErrors
   }`, the `?` is still optional inside the branch because the
   class hierarchy can't say "this field is present iff the kind
   is validation".
3. **Cross-package boundaries fail.** If `ApiError` is in
   `package-a` and the consumer is in `package-b`, the
   `instanceof` check breaks across bundles (multiple copies of
   the class).

A **discriminated union** with a const-object pattern fixes all
three:

```ts
// errors.ts
export const API_ERROR_KIND = {
  unauthorized: "unauthorized",
  forbidden: "forbidden",
  notFound: "notFound",
  conflict: "conflict",
  throttled: "throttled",
  validation: "validation",
  server: "server",
  network: "network",
} as const;

export type ApiErrorKind = (typeof API_ERROR_KIND)[keyof typeof API_ERROR_KIND];

export type ApiErrorPayload =
  | { kind: "unauthorized"; status: number; message: string }
  | { kind: "forbidden";   status: number; message: string }
  | { kind: "notFound";    status: number; message: string }
  | { kind: "conflict";    status: number; message: string }
  | { kind: "throttled";   status: number; message: string; retryAfter?: number }
  | { kind: "validation";  status: number; message: string; fieldErrors: Record<string, string[]> }
  | { kind: "server";      status: number; message: string }
  | { kind: "network";     status: number; message: string };

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;
  readonly fieldErrors?: Record<string, string[]>;
  readonly retryAfter?: number;
  constructor(p: ApiErrorPayload) {
    super(p.message);
    this.name = "ApiError";
    this.kind = p.kind;
    this.status = p.status;
    if (p.kind === "validation") this.fieldErrors = p.fieldErrors;
    if (p.kind === "throttled") this.retryAfter = p.retryAfter;
  }
}
```

The `class extends Error` is for `Error.cause` chaining and stack
traces (a bare object loses both). The `readonly kind` is the
discriminator; the consumer narrows with `switch (err.kind)`.

```ts
// Consumer (exhaustive switch with narrowing)
import { API_ERROR_KIND, type ApiError, type ApiErrorKind } from "~/shared/lib/fetch-client/errors";

function explain(err: ApiError): string {
  switch (err.kind) {
    case API_ERROR_KIND.unauthorized: return "Please sign in again.";
    case API_ERROR_KIND.forbidden:    return "You do not have access to this resource.";
    case API_ERROR_KIND.notFound:     return "Not found.";
    case API_ERROR_KIND.conflict:     return "This item already exists.";
    case API_ERROR_KIND.throttled:    return `Too many requests. Try in ${err.retryAfter ?? 30}s.`;
    case API_ERROR_KIND.validation:   return Object.values(err.fieldErrors).flat().join(" ");
    case API_ERROR_KIND.server:       return "The server is having trouble. Try again in a moment.";
    case API_ERROR_KIND.network:      return "You appear to be offline.";
  }
}
```

The compiler enforces the case list (TS will error if any
`API_ERROR_KIND` member is missing). The narrowing is automatic —
inside `case API_ERROR_KIND.throttled`, `err.retryAfter` is
`number | undefined`. Inside `case API_ERROR_KIND.validation`,
`err.fieldErrors` is `Record<string, string[]>` (NOT optional).

The const-object pattern is what makes adding a new kind a
one-line change. The literal type comes from `as const`, the union
type is derived via the `(typeof X)[keyof typeof X]` idiom, and
the consumer's `switch` re-checks automatically.

**The "labeled switchboard" analogy.** A class hierarchy is a
pile of unlabeled cables — you have to plug in and see which one
lights up. A discriminated union is a labeled switchboard — every
cable is marked, every port accepts exactly one kind, and a
missing port is visible from across the room (the compiler error).

**When to reach for the alternative.** Class hierarchies ARE
appropriate when (a) you need polymorphism — `err.toJSON()` on
each subclass produces a different shape, (b) you have shared
methods on the error type that the consumer calls unconditionally
(`err.toString()`), or (c) you're in a language without
discriminated unions (Java pre-17, Go pre-1.18). For TypeScript
error modeling, the discriminated union wins on every axis
relevant to us.

## 7. Cross-project coordination

### 7.1 The backend change (separate PR)

The backend PR modifies `../roonder-portfolio-backend/src/auth/auth.controller.ts`
to add a `setAccessCookie` helper alongside `setRefreshCookie`, called
from `login()` and `refresh()`. The helper is ~10 lines and follows
the existing `setRefreshCookie` shape:

```ts
// pseudocode — final impl lands in the backend PR
private setAccessCookie(res: Response, token: string, expiresInSeconds: number) {
  res.cookie(ACCESS_COOKIE_NAME, token, {
    httpOnly: false,         // bridge: client JS must read this
    secure: true,            // HTTPS only
    sameSite: "lax",         // same as rt — top-level nav allowed
    path: "/",               // sent on every request
    maxAge: expiresInSeconds * 1000,
  });
}
```

The `rt` cookie is untouched. The `access` cookie is the new
addition. The login response still returns `{ accessToken,
expiresIn }` in the body (for the client-side zustand store); the
cookie is the SSR bridge.

### 7.2 The cookie spec table

This is the SHARED SPEC that both the backend PR and the frontend
design reference. It prevents drift.

| Cookie | Set by | Lifetime | `httpOnly` | `secure` | `sameSite` | `path` | `maxAge` | Cleared on |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `rt` (refresh) | backend `setRefreshCookie` | `JWT_REFRESH_EXPIRES_IN` (default 30d) | **true** | true | lax | `/` | seconds×1000 | `/auth/logout` (200), refresh 401/reuse-detected |
| `access` (JWT) | backend `setAccessCookie` (NEW) | `JWT_EXPIRES_IN` (default 15m) | **false** | true | lax | `/` | seconds×1000 | frontend logout action (Max-Age=0) |

The two cookies are **separate by design**: `rt` is the long-lived
credential that can be replayed and is therefore HttpOnly; `access`
is the short-lived bearer that the client JS needs to read.

### 7.3 PR sequencing

The orchestrator preflight locks `block` on the backend — backend
PR lands FIRST, then the frontend chain starts. The 3-PR frontend
chain runs `stacked-to-main`:

- **Backend PR** (~10 lines): adds `setAccessCookie`, called from
  `login` and `refresh`. Tests pass (the existing `auth.controller.spec.ts`
  needs a new case for the `access` cookie attributes; the existing
  test for the `rt` cookie stays green).
- **PR 1 — foundation** (~220 lines, frontend): no UI, no smoke
  needed beyond `bun run typecheck`. Landed first in the frontend
  chain.
- **PR 2 — login UX** (~130 lines, frontend): UI change, manual
  smoke (login → admin → logout). Landed after PR 1.
- **PR 3 — integration smoke** (~50 lines frontend + nothing new
  on backend): the admin gate's `clientLoader` fallback is dropped
  (no longer needed) OR kept with a comment; the proposal/success
  criteria smoke is run end-to-end.

The `clientLoader` fallback described in §4.7 exists as a safety
net. With `block` sequencing, the backend PR is already merged
when PR 2 lands, so the fallback's effect is "no-op + read
`document.cookie`". We keep it (commented as historical) because
the cost is one cookie read per admin navigation and the safety
is worth it.

## 8. PR breakdown (the 3 chained PRs)

### 8.1 PR 1 — foundation (~220 lines)

**Goal**: ship the HTTP client + zustand store + SWR wrapper with no
UI change. The `bun run typecheck` gate must pass; no manual smoke
is required because no consumer is wired up yet.

**Files created** (all new):
- `app/shared/lib/fetch-client/core.ts` (~80 lines)
- `app/shared/lib/fetch-client/errors.ts` (~50 lines)
- `app/shared/lib/fetch-client/server.ts` (~50 lines)
- `app/shared/lib/fetch-client/client.ts` (~40 lines)
- `app/shared/lib/fetch-client/refresh.ts` (~30 lines)
- `app/shared/lib/fetch-client/swr-fetcher.ts` (~10 lines)
- `app/shared/lib/fetch-client/get-session.ts` (~20 lines)
- `app/shared/lib/cookies.ts` (~25 lines, the `Cookie` header parser)
- `app/shared/stores/session.ts` (~70 lines)
- `app/shared/swr/fetcher.ts` (~20 lines, replaces the existing TODO
  if any — currently no `app/shared/swr/` folder exists)

**Files modified**:
- `DESIGN.md` (line 271: `/api/v1/auth/me` → `/api/v1/auth/profile`;
  §4: document the new client in Data flow).
- `AGENTS.md` (add the "DESIGN.md mirrors the backend's locked
  specs; drift is the frontend's job to catch" note).

**Line total**: ~395. Over the 400 budget by a hair — but the
spec rounds down because comments + JSDoc don't count in the
review budget. If the apply phase adds inline comments that push
over, the orchestrator's `chained-pr` skill splits the
`fetch-client/` folder out of PR 1 into a sub-PR (foundation:
client + zustand → foundation: SWR glue + get-session). The
`chained-pr` decision lands at apply time.

**Manual smoke**: none. Just `bun run typecheck`.

### 8.2 PR 2 — login UX (~130 lines)

**Goal**: replace the `TODO` stubs in `app/routes/admin.tsx` and
`app/routes/admin.auth.tsx` with the real session gate + login form
+ server actions.

**Files created** (all new):
- `app/admin/auth/schema.ts` (~25 lines)
- `app/admin/auth/api/login.ts` (~35 lines, the server action)
- `app/admin/auth/pages/login.tsx` (~80 lines, the form page)

**Files modified**:
- `app/routes/admin.tsx` (replace the cookie-check `TODO` with
  `getSession(request)`; ~30 lines delta).
- `app/routes/admin.auth.tsx` (replace the placeholder with the
  real form import; ~5 lines delta).
- `app/root.tsx` (add a `useEffect` to call
  `useSessionStore.getState().hydrate()` once on first client
  render; ~10 lines delta).

**Primitives needed** (added via the shadcn MCP during apply, NOT
counted in the design budget): `Input`, `Label`, `Field` from
shadcn/ui. These are stock shadcn components and follow the same
recipe as the existing `Button`.

**Line total**: ~185. Well under 400.

**Manual smoke**:
1. `bun run dev` → open `http://localhost:3000/admin/auth` → login
   form renders.
2. Submit the seeded superuser credentials → land on `/admin`.
3. Open DevTools → Application → Cookies → confirm both `rt`
   (HttpOnly) and `access` are set.
4. Refresh the page → still authenticated, no redirect to login.
5. Click a protected link (e.g. `/admin/projects`) → page renders
   (scaffold content, no real data yet).
6. Click "Sign out" → cookies cleared, redirected to `/admin/auth`.
7. Wait > 15 minutes (or short-circuit the `JWT_EXPIRES_IN` to 5s
   via `.env` on the backend) → next protected call 401s → silent
   refresh → continues. (Set `JWT_EXPIRES_IN=5s` on the backend
   to make this testable in a dev session.)

### 8.3 PR 3 — integration smoke (~50 lines frontend)

**Goal**: run the full happy-path smoke end-to-end with the backend
PR + frontend chain merged. Add the final documentation pieces.

**Files modified** (frontend):
- `app/routes/admin.tsx` (add the `clientLoader` fallback as a
  historical safety net with a comment; ~15 lines delta). OR
  drop the `clientLoader` if the PR 2 code path already covers
  the cookie-missing window — apply-phase decision.
- `DESIGN.md` (add a §"Cross-project coordination" entry pointing
  to the cookie spec table; ~30 lines).
- `AGENTS.md` (add the "DESIGN.md mirrors the backend's locked
  specs" rule; ~5 lines).

**Backend**: no further changes; the backend PR from §7.1 is
already merged.

**Manual smoke** (the proposal's success criteria, run end-to-end):
1. Run the backend with `bun run start:dev`. Confirm Swagger at
   `/api/v1/docs`.
2. Seed a superuser with `npm run seed:superuser`.
3. `bun run dev` on the frontend. Open `/admin/auth`.
4. Log in with the seeded creds → land on `/admin`.
5. Confirm both cookies in DevTools.
6. Hit `/admin/projects` (scaffold) → renders.
7. Manually expire the `access` cookie in DevTools (or set
   `JWT_EXPIRES_IN=5s` on the backend).
8. Reload → silent refresh → still authenticated.
9. Manually clear the `rt` cookie in DevTools.
10. Reload → redirected to `/admin/auth?next=/admin/projects`
    silently (no toast).
11. Log in again → land on `/admin/projects` (the `next` was
    honored).
12. `bun run typecheck` → green.
13. `bun run build` → green.

**Chain strategy**: `stacked-to-main` by default. Each PR targets
the previous PR's branch; the final PR targets `main`. The
`chained-pr` skill in the orchestrator resolves the actual branch
graph at apply time.

## 9. Risk register

| # | Risk | Mitigation | New in this design? |
| - | - | - | - |
| R-1 | Concurrent 401s trigger N refresh calls → reuse-detection → family revoked. | Single-flight `refreshPromise` in `refresh.ts`. | — (inherited) |
| R-2 | Refresh-401 is terminal; retrying hammers the backend. | Terminal `unauthorized` path; atomic store clear; `throw redirect()`. | — (inherited) |
| R-3 | SSR cannot read `localStorage`. | Non-HttpOnly `access` cookie; backend PR sets it. | — (inherited) |
| R-4 | `Set-Cookie` from the backend does not reach the browser during SSR. | `serverFetch` captures `Set-Cookie`; loader forwards via `data(payload, { headers })`; React Router 8's `prependCookies` auto-merges. | — (inherited, refined) |
| R-5 | Backend's `message: string[]` validation shape needs flattening. | `ApiError { kind: 'validation', fieldErrors: Record<string, string[]> }`. | — (inherited) |
| R-6 | 429 throttling includes `Retry-After`. | Parsed and attached to `ApiError { kind: 'throttled', retryAfter }`. | — (inherited) |
| R-7 | `ZodTypeAny` is deprecated in zod 4. | Use `z.ZodType` directly in the generic constraint. | **NEW** — caught while reading `node_modules/zod/v4/classic/compat.d.ts`. |
| R-8 | Cookie spec drift between the two repos. | The shared cookie spec table in §7.2 is the single source of truth; the backend PR and the frontend design both reference it. | **NEW** — caught while drafting §7. |
| R-9 | `clientLoader` fallback changes URL semantics if not carefully scoped. | The fallback is a cookie-check + re-run, NOT a redirect; it only fires when the SSR loader already threw. Documented in §4.7. | **NEW** — caught while resolving open question 4. |
| R-10 | Backend PR's `setAccessCookie` helper could accidentally clear the `rt` cookie attributes. | Backend tests assert both cookies; the helper is a NEW private method, not a modification of `setRefreshCookie`. The frontend references the cookie spec table for any change. | **NEW** — cross-project risk. |
| R-11 | No test runner. | `bun run typecheck` gate + manual smoke checklist. | — (inherited) |
| R-12 | Review budget 400 lines. | 3-PR chain; PR 1 is ~395 lines, PR 2 ~185, PR 3 ~50. | — (inherited, refined) |

## 10. Verification plan (no test runner)

`bun run typecheck` is the only automated gate. Everything else is
manual. The smoke checklist maps to the spec scenarios from
`http-client/spec.md` and `admin-auth/spec.md`.

### 10.1 Spec coverage map

| Spec REQ | Where verified | Smoke step |
| - | - | - |
| REQ-CORE-1 (envelope) | typecheck | `requestCore` returns the typed shape; `tsc` validates. |
| REQ-CORE-2 (error mapping) | typecheck + manual | Hit `/api/v1/admin/projects` without a token → 401 → `ApiError { kind: 'unauthorized' }`. |
| REQ-CORE-3 (AbortSignal) | typecheck + manual | Cancel a navigation mid-load → `ApiError { kind: 'network' }`. |
| REQ-CORE-4 (schema narrowing) | typecheck | `tsc` verifies `data: z.infer<S>` in callers. |
| REQ-ERR-1 (`ApiError` class) | typecheck | exhaustive `switch` passes `tsc`. |
| REQ-ERR-2 (validation fields) | manual | Submit login with short password → 400 → `fieldErrors.password`. |
| REQ-ERR-3 (retry-after) | manual | Hit a throttled endpoint 6× in a minute → 429 → `retryAfter` in payload. |
| REQ-SRV-1 (cookie forwarding) | manual | Network tab: internal `/auth/profile` request has the `Cookie` header. |
| REQ-SRV-2 (Set-Cookie forwarding) | manual | Network tab: outgoing SSR response has `Set-Cookie: rt=...` after a refresh. |
| REQ-SRV-3 (access as Authorization) | manual | Network tab: internal `/auth/profile` has `Authorization: Bearer ...`. |
| REQ-CLI-1 (client credentials + bearer) | manual | Network tab: SWR call includes both. |
| REQ-CLI-2 (skip bearer on auth) | manual | Network tab: `/auth/refresh` has NO `Authorization` header. |
| REQ-RFR-1 (single-flight) | manual | Open 5 admin tabs; expire access; observe ONE `/auth/refresh`. |
| REQ-RFR-2 (retry once) | manual | The 5 tabs above all succeed after the single refresh. |
| REQ-RFR-3 (terminal 401) | manual | Clear `rt`; reload admin → redirect to `/admin/auth`. |
| REQ-RFR-4 (refresh abort) | manual | Cancel a navigation mid-refresh → `ApiError.network`. |
| REQ-SWR-1 (parsed data) | typecheck + manual | `useSWR('/api/v1/projects', swrFetcher).data` is the parsed object. |
| REQ-SWR-2 (key = URL) | typecheck | SWR cache dedupes by URL. |
| REQ-SES-1 (store shape) | typecheck | `useSessionStore.getState()` matches the type. |
| REQ-SES-2 (no persist) | typecheck | `import "zustand/middleware"` does NOT appear in `session.ts`. |
| REQ-SES-3 (selector form) | typecheck + code review | No `const x = useSessionStore()` calls. |
| REQ-SES-4 (hydrate) | manual | DevTools: first client render has `accessToken` populated. |
| REQ-GATE-1 (loader reads session) | manual | Network tab: admin navigation fires `/auth/profile`. |
| REQ-GATE-2 (401 redirects) | manual | Clear `rt`; reload → redirect. |
| REQ-GATE-3 (login exempt) | manual | Navigate to `/admin/auth` while signed out → no redirect. |
| REQ-GATE-4 (forward Set-Cookie) | manual | Network tab: admin navigation response has `Set-Cookie: rt=...` after a silent refresh. |
| REQ-LOG-1 (form shape) | typecheck + manual | Submit form with `email="x"` → client validation error. |
| REQ-LOG-2 (action posts) | manual | Network tab: form submit hits `/api/v1/auth/login`. |
| REQ-LOG-3 (forward cookies) | manual | Network tab: response has `Set-Cookie: access=...; rt=...`. |
| REQ-LOG-4 (401 surfaces) | manual | Submit wrong password → "Invalid credentials" shown. |
| REQ-LOG-5 (next redirect) | manual | `?next=/admin/projects` → lands on `/admin/projects` after login. |
| REQ-LOG-6 (English + shadcn) | code review | No `t('…')` calls; `Button` from `app/components/ui/`. |
| REQ-LO-1 (logout server action) | manual | Click sign out → `POST /api/v1/auth/logout` → `Set-Cookie: rt=; Max-Age=0`. |
| REQ-LO-2 (clear store + redirect) | manual | Click sign out → `useSessionStore.getState().accessToken` is `null`; URL is `/admin/auth`. |
| REQ-NEXT-1 (next sanitized) | manual | `?next=https://evil.com` → lands on `/admin`; `?next=/home` → lands on `/admin`. |

### 10.2 Build + typecheck gates

```bash
# Pre-merge
bun run typecheck   # react-router typegen && tsc — must be green
bun run build       # must produce a build artifact

# Pre-merge for the backend PR
cd ../roonder-portfolio-backend && npm run build && npm run test
```

## 11. Out of scope (explicit)

- **Admin CRUD pages** (projects list/edit, reviews moderation,
  contact inbox). The client is the foundation; the consumers ship
  in their own SDD changes.
- **Forgotten password**, email verification, MFA. Login is email +
  password; everything else is a follow-up.
- **i18n on the login form**. Admin is English-only (locked
  decision D8). Adding i18n keys for two strings is not worth the
  maintenance cost. If admin i18n becomes a real ask, it's its own
  SDD change.
- **A second HTTP library**, interceptors, or `package.json`
  churn. The hard constraint is **native `fetch` only**.
- **A test runner** (Vitest, Playwright). The only automated gate
  is `bun run typecheck`. Adding Vitest is a dedicated SDD change
  that flips `openspec/config.yaml` `testing.strict_tdd` to `true`.
- **Pre-rendering decisions per route**. The default is SSR; the
  per-route pre-render decision lives in a separate SDD change
  (see DESIGN.md §3 "Pre-rendering" + §13 "Open questions").
- **Token refresh on a timer**. The refresh is lazy (on 401),
  not eager (on a timer). An eager refresh would fire for users
  who never hit a protected route; lazy is the lower-cost default.
- **Refresh-401 retry on a non-401 status code**. The refresh
  policy is the single place that decides "the session is dead";
  it only fires on a 401 from `/auth/refresh` itself.
- **Cookie SameSite=Strict**. The spec locks `Lax`; the design
  follows.
- **HttpOnly `access` cookie**. The spec locks `httpOnly: false`;
  the design follows. The XSS surface is accepted as the cost of
  the SSR bridge.
- **A test seam for the `refreshPromise` module-level state**. No
  factory, no DI; a future Vitest change can introduce one without
  rewriting the call sites because the `refreshPolicy` callback
  is already injected via `CoreEnv`.

## 12. Skill resolution

- `react-router` skill: **paths-injected** (project-local
  `.agents/skills/react-router/`). Confirmed the `data(payload, {
  headers })` envelope, the `request.signal` wiring, and the
  `Set-Cookie` auto-merge via `prependCookies` in
  `node_modules/react-router/docs/how-to/headers.md` and
  `node_modules/react-router/dist/development/lib/server-runtime/headers.js`.
- `typescript` skill: **paths-injected**. Used the const-object
  pattern for `API_ERROR_KIND`, the discriminated union for
  `ApiErrorPayload`, and the type-only import rule.
- `zustand-5` skill: **paths-injected**. Used the selector form
  for `useSessionStore`, `useShallow` for multi-field selectors,
  and the no-`persist` rationale.
- `react-19` skill: **paths-injected**. Confirmed `useActionState`
  for the form's pending UI; confirmed no `useMemo` / `useCallback`
  introduced.
- `sdd-design` skill: loaded automatically per the orchestrator
  preflight.

## 13. Next step

Ready for `sdd-tasks`. The 3-PR chain is locked. The open questions
are resolved (§5). The 8 concept primer sections are written. The
backend's `setAccessCookie` is a known dependency with a cookie
spec table that both repos reference. The apply phase can start
with PR 1 (foundation) on its own branch.

## Carry-forward invariants

These are non-obvious invariants the implementation relies on. They
are NOT part of the spec contract — they are design observations
discovered during verification that any future refactor MUST respect.
If a refactor breaks one, the regression will not be caught by
`bun run typecheck`; it will surface as silent refresh breaking in
production.

- **`CoreEnv.accessToken` MUST stay mutable.** Adding `readonly` to
  the `accessToken` field on the `CoreEnv` type
  (`app/shared/lib/fetch-client/core.ts:45-49`) will re-break silent
  refresh in production. The V-2 fix in commit `3b20b70` mutates
  `env.accessToken = token` inside the refresh callback (both
  client and server paths) so the retry uses the NEW access token
  from the refresh response. `readonly` would silently re-introduce
  the "retry uses stale token → 401 → terminal redirect to login"
  bug. This was the root cause of V-2 in the verify report
  (`verify-report.md` §V-2).
