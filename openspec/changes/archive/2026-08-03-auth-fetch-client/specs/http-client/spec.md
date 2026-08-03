# Delta for `http-client`

> New cross-cutting capability. Owns the unified `fetch` client every
> domain in `app/` calls: `core` (pure, env-agnostic), `serverFetch`
> (loaders/actions, Node), `clientFetch` (browser, SWR, components),
> `swrFetcher` (thin SWR wrapper), and the `ApiError` discriminated
> union. The single error shape every consumer pattern-matches on.
> Lives at `app/shared/lib/fetch-client/`.
>
> Locked decisions inherited from the proposal round: native `fetch`
> only (no axios, ky, ofetch, got); split `serverFetch`/`clientFetch`
> over a shared `core`; single-flight refresh; terminal refresh-401;
> access token in a non-HttpOnly `access` cookie (cross-project
> dependency on the backend's `auth.controller.ts`); SWR keys equal
> the URL; errors are a discriminated union, not a class hierarchy.

## ADDED Requirements

### REQ-CORE-1: Request envelope

`requestCore` SHALL accept `{ url, method, headers, body, signal, schema }`
and return `{ status, data, headers }` where `data` is the parsed
JSON body on 2xx, optionally narrowed by the zod `schema`.

#### Rationale

The envelope is the unit of testability. Pure `core` + thin env
wrappers is the split that lets a Node client and a browser client
coexist without `typeof window` branches. Native `fetch` already
gives us `Request`/`Response`/`Headers`; the envelope layers a
single `{ status, data, headers }` shape on top so callers never
double-parse JSON. A single return shape is what makes the SWR
fetcher, the loader, and the form action interchangeable.

#### Scenarios

- GIVEN a 2xx response whose body parses and matches the zod `schema`
- WHEN `requestCore` returns
- THEN `data` is the schema-narrowed value and `status` is the HTTP status

- GIVEN a 2xx response whose body FAILS the zod `schema`
- WHEN `requestCore` runs
- THEN the call throws `ApiError { kind: 'server' }` (see REQ-ERR-1)

### REQ-CORE-2: Error mapping

`requestCore` SHALL map every non-2xx response to a typed `ApiError`
discriminated union by parsing the backend's canonical
`{ statusCode, error, message, timestamp, path }` envelope (per the
backend's `global-exception-filter` spec) and switching on `statusCode`.

#### Rationale

A class hierarchy for HTTP errors is a footgun: consumers must
`instanceof` a chain they cannot statically verify, and the compiler
cannot narrow `fieldErrors` to `Record<string, string[]>` when
`kind === 'validation'`. A const-object + index type + discriminated
union gives an exhaustive `switch (err.kind)` with narrowing. The
status-code → kind mapping is centralized so a new status code is
one edit, not a sweep across every consumer.

#### Scenarios

- GIVEN status `400` AND `message` is a `string[]`
- WHEN `requestCore` parses the envelope
- THEN it throws `ApiError { kind: 'validation', fieldErrors }`
  flattened per-field (REQ-ERR-2)

- GIVEN status `401` (from a non-auth endpoint)
- WHEN `requestCore` parses the envelope
- THEN it throws `ApiError { kind: 'unauthorized' }`

- GIVEN status `429` AND the `Retry-After` header equals `12`
- WHEN `requestCore` parses the envelope
- THEN it throws `ApiError { kind: 'throttled', retryAfter: 12 }`
  (REQ-ERR-3)

- GIVEN status `500`
- WHEN `requestCore` parses the envelope
- THEN it throws `ApiError { kind: 'server' }`

- GIVEN status `403`
- WHEN `requestCore` parses the envelope
- THEN it throws `ApiError { kind: 'forbidden' }`

### REQ-CORE-3: AbortSignal wiring

`requestCore` SHALL attach the supplied `AbortSignal` to every
`fetch` call AND SHALL map `AbortError` to `ApiError { kind: 'network' }`.

#### Rationale

`AbortSignal` is the only portable cancellation primitive. Mapping
`AbortError` to a kind on the same `ApiError` keeps the error
discriminator exhaustive — the caller never has to remember to
catch a separate class. React Router 8 already wires
`request.signal` into loaders and actions; the client MUST
propagate it so a user navigation away aborts the in-flight call.

#### Scenarios

- GIVEN the caller-supplied `signal` is aborted before `fetch` resolves
- WHEN `requestCore` runs
- THEN the in-flight `fetch` is cancelled AND the call throws
  `ApiError { kind: 'network' }`

### REQ-CORE-4: Schema-driven response narrowing

`requestCore` SHALL use the optional zod `schema` to narrow the
response type on 2xx; on a parse failure it SHALL throw
`ApiError { kind: 'server' }` and SHALL NOT swallow the underlying
error silently.

#### Scenarios

- GIVEN a `schema` is provided AND the body parses successfully
- WHEN `requestCore` returns
- THEN the static type of `data` is `z.infer<typeof schema>`

### REQ-ERR-1: ApiError is a class with a discriminated `kind`

`ApiError` SHALL be a `class extends Error` with a `readonly kind:
ApiErrorKind` discriminator.

#### Rationale

`extends Error` so it survives `Error.cause` chaining and stack
inspection (a bare object does not). The `readonly kind` is the
discriminator; consumers narrow with `switch (err.kind)`. `kind`
is built as a `const` object + index type per the `typescript`
skill, so adding a new kind is one edit and the compiler
re-checks every switch.

#### Scenarios

- GIVEN a caller catches an `ApiError`
- WHEN they read `err.kind`
- THEN the value is one of the `API_ERROR_KIND` literal members

- GIVEN a `switch (err.kind)` with one case per `API_ERROR_KIND`
- WHEN the compiler type-checks the switch
- THEN the switch is exhaustive (no `never`-fall-through warnings)

### REQ-ERR-2: Validation field errors

`ApiError { kind: 'validation' }` SHALL carry `fieldErrors:
Record<string, string[]>` parsed from the backend's `message` array
using dot-path keys (e.g. `user.email`, `items.0.title`).

#### Rationale

The backend's `ValidationPipe` returns `message: string[]` with
paths like `['email must be an email', 'password must be longer
than or equal to 8']`. Flattening into a `fieldErrors` map lets the
form layer do `fieldErrors.email?.[0]` without re-parsing strings
client-side. Dot-path keys keep room for nested-object forms
without a second parser.

#### Scenarios

- GIVEN the backend returns
  `{ message: ['email must be an email', 'password must be longer than or equal to 8'] }`
- WHEN the client maps the envelope
- THEN `fieldErrors` is
  `{ email: ['must be an email'], password: ['must be longer than or equal to 8'] }`

### REQ-ERR-3: Throttled retry-after

`ApiError { kind: 'throttled' }` SHALL carry `retryAfter: number`
parsed from the `Retry-After` response header in delta-seconds.

#### Scenarios

- GIVEN the response includes `Retry-After: 30`
- WHEN the client maps the envelope
- THEN the thrown `ApiError` has `kind: 'throttled'` and
  `retryAfter: 30`

- GIVEN the response does NOT include `Retry-After`
- WHEN the client maps a 429 envelope
- THEN `retryAfter` is `undefined` (the caller falls back to a
  default UI message)

### REQ-SRV-1: Cookie header forwarding

`serverFetch(request)` SHALL forward the incoming request's `Cookie`
header verbatim on the internal fetch to the backend.

#### Rationale

The backend's `cookie-parser` middleware reads `rt` from the
`Cookie` header. If the loader drops the header, the refresh
endpoint cannot find the `rt` row and the user gets a 401 even
with a valid browser session. The SSR client has NO cookie jar of
its own — it MUST proxy what the browser sent. This is the
mechanism that makes silent refresh on first SSR possible.

#### Scenarios

- GIVEN the incoming request has
  `Cookie: rt=<opaque>; access=<jwt>`
- WHEN `serverFetch` calls `/api/v1/auth/profile`
- THEN the internal request includes both cookies

### REQ-SRV-2: Set-Cookie forwarding to the browser

`serverFetch` SHALL return a `serverResult` whose `headers` include
the internal response's `Set-Cookie` entries so the loader can
forward them via `data(payload, { headers })`.

#### Rationale

`Set-Cookie` from the backend sets a cookie on the INTERNAL fetch
response, not on the user's outgoing SSR response. The loader MUST
copy the header onto the React Router `data()` envelope so the
browser actually picks up the rotated `rt` after a server-side
refresh. Without this step, the user's `rt` silently expires the
next time the browser does not auto-attach it. The shape matches
React Router 8's `headers` export convention.

#### Scenarios

- GIVEN the internal backend response carries
  `Set-Cookie: rt=<new>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=<n>`
- WHEN `serverFetch` returns
- THEN `serverResult.headers.getSetCookie()` includes the same value
  (or its `set-cookie` array form)

- GIVEN a loader returned the `serverResult` headers via
  `data(payload, { headers })`
- WHEN the browser receives the SSR response
- THEN the browser stores the new `rt` cookie (round-trip verified
  via DevTools)

### REQ-SRV-3: Access cookie as Authorization fallback

`serverFetch` SHALL read the `access` cookie from the incoming
request and use it as the `Authorization: Bearer` value when the
caller did not pass an explicit `Authorization` header.

#### Rationale

The SSR loader has no zustand store to read the access token from
(localStorage is browser-only). The non-HttpOnly `access` cookie
is the bridge that makes the token reachable on the server. The
fallback chain is: explicit `Authorization` header → `access`
cookie → no header. Login and refresh calls do not need an
authorization header and the caller is expected to set `body`
without one.

#### Scenarios

- GIVEN the incoming request has `Cookie: access=<jwt>` AND the
  caller passes no `Authorization` header
- WHEN `serverFetch` calls a protected endpoint
- THEN the internal request includes
  `Authorization: Bearer <jwt>`

- GIVEN the caller passes an explicit `Authorization: Bearer <other>`
- WHEN `serverFetch` calls a protected endpoint
- THEN the explicit header wins and the `access` cookie is NOT read

### REQ-CLI-1: Client credentials and bearer injection

`clientFetch` SHALL use `credentials: 'include'` AND SHALL read the
access token from `useSessionStore` and inject it as
`Authorization: Bearer <token>` on every request except
`/auth/login` and `/auth/refresh`.

#### Rationale

`credentials: 'include'` is what makes the `rt` HttpOnly cookie
ride along in the browser. The access token lives in zustand (not
in a cookie) so React state and SWR mutations see the latest value
without a round-trip. Login/refresh are excluded because they do
not have a bearer yet — sending one would be ignored by the
backend anyway. This is the symmetry to REQ-SRV-3 on the browser
side.

#### Scenarios

- GIVEN `useSessionStore` holds `accessToken: '<jwt>'`
- WHEN `clientFetch` calls `GET /api/v1/admin/projects`
- THEN the request includes
  `Authorization: Bearer <jwt>` AND `credentials: 'include'`

### REQ-CLI-2: Skip bearer on auth endpoints

`clientFetch` SHALL NOT inject the `Authorization` header on
`/auth/login` or `/auth/refresh`, regardless of store state.

#### Scenarios

- GIVEN the store holds a stale `accessToken`
- WHEN `clientFetch` calls `POST /api/v1/auth/refresh`
- THEN the request does NOT include an `Authorization` header AND
  `credentials: 'include'` is still set

### REQ-RFR-1: Single-flight refresh dedupe

The client SHALL dedupe concurrent refresh attempts into ONE
in-flight `POST /api/v1/auth/refresh` (via a module-level
`refreshPromise: Promise<RefreshResult> | null`) on 401 from a
request that is NOT `/auth/refresh` or `/auth/login`.

#### Rationale

Without dedupe, N concurrent SWR keys revalidating at once each
see a 401 and race to refresh. The backend's reuse-detection
revokes the whole family on the second `rt` use, signing the
user out (`auth-domain` §Refresh Token Reuse Detection). A
module-level `refreshPromise` collapses N callers into 1 refresh
— every other caller awaits the same promise and reuses the
result. Analogy: a single bartender serving a group — each patron
waves their empty glass, but only one trip to the tap happens.

#### Scenarios

- GIVEN 5 SWR keys are revalidating in parallel AND all 5 see 401
- WHEN the first caller sets `refreshPromise`
- THEN exactly ONE `POST /api/v1/auth/refresh` is in flight AND
  the other 4 await the same promise

### REQ-RFR-2: Retry original request exactly once

On a successful refresh, the client SHALL retry the original
request EXACTLY once with the new access token.

#### Scenarios

- GIVEN the original request 401'd AND the refresh succeeded
- WHEN the client retries
- THEN the retry uses the new `accessToken` from the refresh
  response AND no further 401 on the retry triggers a second
  refresh (loop guard)

### REQ-RFR-3: Terminal refresh-401

On a refresh endpoint that itself returns 401, the client SHALL
clear `useSessionStore` atomically AND SHALL throw
`ApiError { kind: 'unauthorized' }` — no retry, no second refresh.

#### Rationale

A refresh-401 means the session is dead (expired, revoked, or
reuse-detected). Retrying just hammers the backend and would
re-trigger reuse-detection. The client surfaces a typed
`unauthorized` and the UI redirects to login. Analogy: a dead
battery doesn't get better by trying the ignition again — you
call roadside assistance and start over.

#### Scenarios

- GIVEN `POST /api/v1/auth/refresh` returns 401
- WHEN the client maps the response
- THEN `useSessionStore` is cleared AND the call throws
  `ApiError { kind: 'unauthorized' }` AND no second refresh is
  attempted

### REQ-RFR-4: Refresh promise is abortable

The in-flight `refreshPromise` SHALL be abortable via the same
`AbortSignal` as the original request.

#### Rationale

If the user navigates away mid-refresh, the in-flight refresh
must not leak. The same `signal` that aborts the original call
aborts the refresh; awaiters see `ApiError { kind: 'network' }`
and the store is left in whatever state the partial refresh
achieved (we never write to the store before the promise resolves).

#### Scenarios

- GIVEN a 401 triggers refresh AND the original request's `signal`
  aborts before the refresh resolves
- WHEN the caller awaits `refreshPromise`
- THEN the awaiter receives `ApiError { kind: 'network' }` AND
  the refresh `fetch` is cancelled

### REQ-SWR-1: SWR fetcher returns parsed data

`swrFetcher(url)` SHALL be `(url: string) => Promise<unknown>` that
calls `clientFetch(url, { method: 'GET' })` and returns
`result.data`.

#### Rationale

SWR expects the fetcher to throw on non-2xx; the discriminated
`ApiError` already does. Returning `data` (not the full envelope)
keeps the SWR consumer's `data` field the parsed payload, not a
`{ status, data, headers }` wrapper. `unknown` is the safe return
type — domain hooks narrow with their zod schema (`useSWR(url,
swrFetcher, { schema })` is a future addition; today they
narrow manually).

#### Scenarios

- GIVEN `clientFetch` returns `{ status: 200, data: { id: 'x' } }`
- WHEN `swrFetcher('/api/v1/projects')` is called
- THEN it resolves to `{ id: 'x' }`

- GIVEN `clientFetch` throws `ApiError { kind: 'unauthorized' }`
- WHEN `swrFetcher('/api/v1/projects')` is called
- THEN the SWR hook receives the thrown error as `error`

### REQ-SWR-2: SWR keys equal the URL

SWR keys SHALL equal the URL string (no transformation in the
fetcher).

#### Rationale

Cache keys mirror REST paths (DESIGN.md §4). `swrFetcher` is
`url => data`; mutating the key in the fetcher would defeat
SWR's dedupe by URL and cause N components requesting
`/api/v1/projects` to fire N fetches.

#### Scenarios

- GIVEN a component calls
  `useSWR('/api/v1/projects', swrFetcher)`
- WHEN another component calls
  `useSWR('/api/v1/projects', swrFetcher)`
- THEN the second call reuses the first's cache entry (no extra
  network call)

## Open questions for the design phase

- `core` module shape: free functions vs. factory? (Free functions
  with a module-level `refreshPromise` are simpler; a factory
  enables per-test injection but adds API surface.)
- `refreshPromise` lifetime: a module-level `let` in `core.ts` is
  the simplest. Does the design export a `resetRefreshState()` test
  helper, or rely on test isolation?
- How to type the optional `schema` so `core` narrows `data` to
  `z.infer<S>`? Candidate:
  `requestCore<S extends ZodTypeAny | undefined>(init: { ...; schema?: S }): Promise<{ status: number; data: S extends ZodTypeAny ? z.infer<S> : unknown; headers: Headers }>`.
- Should `core` expose a `withSchema(schema)` builder for repeated
  calls with the same schema, or accept it inline per call?
- Where exactly does `getSession(request)` read the `access`
  cookie — from `request.headers.get('cookie')` and a tiny parser,
  or through a `Request` helper in `app/shared/lib/cookies.ts`?
- Should `clientFetch` set `credentials: 'include'` only on
  same-origin requests, or unconditionally? Today it is
  unconditional; the design should confirm.

## Skill resolution

- `react-router`: paths-injected (project-local
  `.agents/skills/react-router/`).
- `typescript`: paths-injected.
- `zustand-5`: paths-injected.
- `react-19`: paths-injected.
