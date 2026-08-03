# Delta for `admin-auth`

> New capability for the `auth` subdomain of `/admin/*`. Owns the
> `useSessionStore` zustand store, the admin layout's session gate
> (cookie check via `serverFetch`), the login form + server action,
> the logout server action, and the `next` query-param safety rule.
> Lives at `app/shared/stores/session.ts` and `app/admin/auth/`.
>
> Locked decisions inherited from the proposal round: admin is
> English-only (no i18n keys); the `access` cookie is the source
> of truth and the zustand store is a per-render cache (NO
> `persist` middleware); single-flight refresh is the
> responsibility of the `http-client` capability (this spec only
> wires the `unauthorized` → redirect UX); login is a server
> action that calls `serverFetch`; logout is a server action so
> the `rt` cookie clear is guaranteed; the login route is exempt
> from the admin gate; `next` must be same-origin AND start with
> `/admin/`.

## ADDED Requirements

### REQ-SES-1: Session store shape

`useSessionStore` SHALL hold
`{ accessToken: string | null; expiresAt: number | null; user: { id: string; email: string } | null }`
plus the actions `hydrate`, `login`, `logout`, and `refresh`.

#### Rationale

`expiresAt` is stored (not derived from a JWT decode) so the
client never trusts a token whose signature it cannot verify
— the server is the source of truth for expiry. `user` lives
in the store so the admin layout does not fire a second
`GET /api/v1/auth/profile` after login to know who the user
is. The four actions match the four lifecycle transitions a
session goes through: hydrate from cookie on first paint,
login on a successful POST, refresh on a successful 401-recovery,
logout on user sign-out.

#### Scenarios

- GIVEN the store is freshly created
- WHEN no action has been called yet
- THEN `accessToken`, `expiresAt`, and `user` are all `null`

- GIVEN a successful login response carries
  `{ accessToken, expiresIn, user: { id, email } }`
- WHEN `login(payload)` is dispatched
- THEN the store has `accessToken: <token>`,
  `expiresAt: Date.now() + expiresIn * 1000`, and
  `user: { id, email }`

### REQ-SES-2: No `persist` middleware

`useSessionStore` SHALL NOT use the zustand `persist` middleware.
The `access` cookie is the source of truth and the store is a
per-render cache that is hydrated on first client render.

#### Rationale

Persisting the access token to localStorage would make it
XSS-readable AND would let a stale token live past logout.
The cookie is already the durable storage (set by the
backend on login/refresh, cleared on logout/refresh-401).
The store is a cache, not a database. `hydrate()` reads the
cookie once and that is the single source for the lifetime
of the page; if the cookie changes, the next hard navigation
rehydrates. The cost of not having `persist` is one extra
read per session, which is negligible.

#### Scenarios

- GIVEN the user logs out
- WHEN the page is reloaded
- THEN `useSessionStore` returns `null` for `accessToken` and
  `user` (NOT a stale value from localStorage)

- GIVEN the access token cookie is cleared by the backend
- WHEN the next `clientLoader` rehydrates
- THEN `useSessionStore.getState().accessToken` is `null`

### REQ-SES-3: Selector-form access

Components SHALL use the selector form
`useSessionStore((s) => s.user)`; reading the whole store
(`const state = useSessionStore()`) is forbidden.

#### Rationale

Zustand re-renders the component on every store change
when the whole store is read. The admin session updates
rarely (login, refresh, logout), but a component that
reads `state.user` AND `state.accessToken` re-renders on
every access-token rotation (which happens every 15
minutes). The selector form is a one-line change for
predictable re-renders.

#### Scenarios

- GIVEN a component calls `useSessionStore((s) => s.user)`
- WHEN `accessToken` changes
- THEN the component does NOT re-render (selector returned
  the same reference)

- GIVEN a component calls
  `useSessionStore(useShallow((s) => ({ user: s.user, expiresAt: s.expiresAt })))`
- WHEN neither `user` nor `expiresAt` changes
- THEN the component does NOT re-render

### REQ-SES-4: Hydrate on first client render

`useSessionStore.getState().hydrate()` SHALL be called from
`app/root.tsx` once on the first client render (via a
`useEffect` or the SWR/React mount lifecycle) to read the
`access` cookie and populate the store.

#### Rationale

The first client render happens after SSR. The loader has
already touched the access token (REQ-GATE-1) and the
browser has the cookie. Without a hydrate step, every
client component would either (a) read the cookie directly
on every render (expensive) or (b) see `null` until the
next loader round-trip (broken state). Hydrate is a one-time
`document.cookie` read, a parse, and `setState`. After that,
the store is the source of truth on the client.

#### Scenarios

- GIVEN the browser has `Cookie: access=<jwt>`
- WHEN the root component mounts on the client
- THEN `useSessionStore.getState().accessToken` equals `<jwt>`

- GIVEN the browser has no `access` cookie
- WHEN the root component mounts on the client
- THEN the store is left at its initial state
  (`accessToken: null`)

### REQ-GATE-1: Admin layout loader reads the session

`app/routes/admin.tsx` loader SHALL call
`getSession(request)`, which reads the `access` cookie and
calls `GET /api/v1/auth/profile` via `serverFetch`.

#### Rationale

The admin surface is session-gated (DESIGN.md §3). The
backend's `GET /api/v1/auth/profile` is the contract:
bearer in `Authorization` → user payload, 401 otherwise.
Calling it from the loader means the first paint already
knows who the user is; the client never sees a flash of
unauthenticated UI. The `access` cookie bridges the SSR
boundary (REQ-SRV-3) so the loader has the bearer without
the zustand store.

#### Scenarios

- GIVEN the incoming request has `Cookie: access=<valid jwt>`
- WHEN the admin layout loader runs
- THEN it returns `{ user: { id, email } }` from
  `GET /api/v1/auth/profile`

### REQ-GATE-2: 401 from profile redirects to login

The admin layout loader SHALL
`throw redirect('/admin/auth?next=<current-path>')` when
`GET /api/v1/auth/profile` returns 401 (no cookie, or cookie
present but the server-side refresh fails — i.e. the backend's
reuse-detection or expired-`rt` cleared the cookie).

#### Rationale

A 401 on `/auth/profile` is terminal: the session is dead.
Retrying here would hammer the backend. The redirect is
silent (no toast, no modal — locked decision D4) and
preserves the `next` param so the user lands where they
were headed after signing in.

#### Scenarios

- GIVEN the incoming request has no `access` cookie
- WHEN the admin layout loader runs
- THEN it throws
  `redirect('/admin/auth?next=' + encodeURIComponent(url.pathname))`

- GIVEN the incoming request has `access` cookie AND the
  backend returns 401
- WHEN the admin layout loader runs
- THEN it throws the same redirect (terminal, no retry)

### REQ-GATE-3: Login route is exempt

The `/admin/auth` route SHALL be exempt from the session gate.

#### Rationale

Without the exemption, an unauthenticated user navigating to
`/admin/auth` would be redirected to `/admin/auth` (infinite
loop). The exemption is explicit and lives in the loader
(`if (url.pathname.startsWith('/admin/auth')) return { authenticated: false }`).

#### Scenarios

- GIVEN the user is not signed in AND navigates to `/admin/auth`
- WHEN the admin layout loader runs
- THEN it does NOT redirect AND the login form renders

### REQ-GATE-4: Forward Set-Cookie from the profile call

On a successful SSR profile call, the loader SHALL forward
the `Set-Cookie` headers (if any) via
`data({ user }, { headers })` so the browser picks up a
rotated `rt` from a server-side refresh.

#### Rationale

If the `access` token is about to expire during the SSR
window, `serverFetch` (via `core`) may have called
`/auth/refresh` first; the backend rotates the `rt` cookie
on the internal response. Without forwarding, the browser
keeps the old `rt` and the next user action 401s (REQ-SRV-2).
This is the SSR-side complement of REQ-SRV-2.

#### Scenarios

- GIVEN `serverFetch` triggered a refresh AND the backend
  rotated the `rt` cookie
- WHEN the loader returns `data({ user }, { headers })`
- THEN the browser's `rt` cookie matches the new value

- GIVEN the backend did not rotate the `rt` cookie
- WHEN the loader returns
- THEN the response carries no `Set-Cookie` (the existing
  cookie stays in the browser)

### REQ-LOG-1: Login form uses react-hook-form + zod

The login form SHALL use `react-hook-form` with
`zodResolver(loginSchema)`, declaring fields `email` (string,
email) and `password` (string, min 8).

#### Rationale

`zodResolver` is the single source of truth for the login
shape: the form validates client-side (instant feedback) AND
the same schema is reusable on the server action
(REQ-LOG-2) so we never re-declare the contract. The min-8
on `password` mirrors the backend's `LoginDto`
(`@MinLength(8)`).

#### Scenarios

- GIVEN the user types `email = "not-an-email"`
- WHEN the form validates
- THEN the `email` field shows the validation error
  (`"Invalid email"`) and the form does NOT submit

- GIVEN the user types `password = "short"`
- WHEN the form validates
- THEN the `password` field shows the validation error
  (`"String must contain at least 8 character(s)"`)

### REQ-LOG-2: Login submits to a server action

The form SHALL submit to a React Router server `action` that
calls `POST /api/v1/auth/login` via `serverFetch`.

#### Rationale

A server action is the only way to GUARANTEE the response
cookies (`Set-Cookie: access=...` and `Set-Cookie: rt=...`)
reach the browser. A pure client-side `clientFetch` call
fires the cookies too, but a server action lets us return
`data({ user }, { headers })` after capturing the headers
explicitly — and lets us throw a `redirect()` without
firing the form twice. The action is colocated with the
route file so the lifecycle is local.

#### Scenarios

- GIVEN the user submits valid credentials
- WHEN the action runs
- THEN it calls `POST /api/v1/auth/login` via `serverFetch`
  with the JSON body `{ email, password }`

### REQ-LOG-3: Action forwards Set-Cookie headers

The action SHALL capture the new `Set-Cookie: access=...` and
`Set-Cookie: rt=...` from the backend's response and forward
them on the React Router `data()` response.

#### Rationale

The backend sets both cookies on the internal fetch
response; without forwarding, the browser never sees them
and the next loader call 401s. The action's return value
goes through `data(payload, { headers })` (REQ-SRV-2) so
the browser stores the cookies in the same round-trip as
the user payload.

#### Scenarios

- GIVEN the backend returns 200 with
  `Set-Cookie: access=<jwt>` AND `Set-Cookie: rt=<opaque>`
- WHEN the action returns
- THEN both `Set-Cookie` headers appear on the outgoing
  response AND the browser stores both cookies

### REQ-LOG-4: 401 from the action surfaces typed errors

On 401 from the action, the form SHALL surface the typed
`ApiError` (server-side validation messages displayed under
the offending field).

#### Rationale

The backend returns 401 for both "bad credentials" (a
generic error) and malformed bodies (a `validation`
error with `fieldErrors`). The form MUST show
"Invalid credentials" for the bad-credentials case and
the per-field error for the validation case. The discriminated
union lets the form pick the right rendering without
parsing strings.

#### Scenarios

- GIVEN the user submits `email = "x@y.z"`, `password = "wrong"`
- WHEN the action returns 401 with message `"Invalid credentials"`
- THEN the form shows `"Invalid credentials"` above the submit
  button AND no field is highlighted

- GIVEN the user submits a malformed body
- WHEN the action returns 400 with
  `fieldErrors: { password: ['must be longer than or equal to 8'] }`
- THEN the form shows the message under the `password` field

### REQ-LOG-5: Redirect to `next` on success

On a successful login, the action SHALL
`redirect()` to `next` if it is a same-origin path starting
with `/admin/`, otherwise to `/admin`.

#### Rationale

The `next` param is the URL the user was trying to reach
before they got bounced. Sending them back is the natural
UX, but an open redirect is a phishing vector (a malicious
link could be `?next=https://evil.com`). The same-origin +
`/admin/`-prefix guard is the minimum needed to block
phishing without a full URL parser (REQ-NEXT-1).

#### Scenarios

- GIVEN the user submitted the form with `?next=/admin/projects`
- WHEN the action returns success
- THEN the user is redirected to `/admin/projects`

- GIVEN the user submitted the form with NO `next` (or
  `next=/home`)
- WHEN the action returns success
- THEN the user is redirected to `/admin`

### REQ-LOG-6: Login form is English and uses shadcn/ui

The login form SHALL be in English (admin is English-only
today) and styled with the existing shadcn/ui primitives
(`Button`, `Input`, `Label`, `Field`) from
`app/components/ui/`.

#### Rationale

The admin surface is English-only (DESIGN.md §8) and a
second i18n namespace for two strings is not worth the
maintenance cost. Locked decision D8. shadcn/ui gives the
form a single visual language with the rest of the admin
shell; adding new primitives via the shadcn MCP is the
project rule (AGENTS.md).

#### Scenarios

- GIVEN the login form renders
- WHEN the user inspects the strings
- THEN every label, placeholder, and error is in English
  (no `t('…')` calls, no i18n key in the source)

- GIVEN the form submits
- WHEN the button is in its pending state
- THEN the `Button` component shows a disabled + spinner
  state (the same primitive used in every other form in
  the app)

### REQ-LO-1: Logout is a server action

Logout SHALL be a server action that calls
`POST /api/v1/auth/logout` via `serverFetch`, captures the
`Set-Cookie: rt=; Max-Age=0` clear, and forwards it.

#### Rationale

Locked decision D7: a server action guarantees the `rt`
clear reaches the browser even if the client tab closes
mid-request. A pure client-side `clientFetch` works most
of the time, but a server action is the only way to make
the cookie clear synchronous with the navigation away.
The backend's `/auth/logout` ALSO returns 200 with an
empty body, so the action's job is to forward the cookie
clear and return a redirect.

#### Scenarios

- GIVEN the user clicks "Sign out"
- WHEN the action runs
- THEN it calls `POST /api/v1/auth/logout` via `serverFetch`
  AND the outgoing response carries
  `Set-Cookie: rt=; Max-Age=0`

### REQ-LO-2: Logout clears the store and redirects

The logout action SHALL clear `useSessionStore` AND
`redirect('/admin/auth')`.

#### Rationale

The store is the client-side source of truth for the
session. The server action runs on the server, so the
clear is dispatched on the client during the redirect
hydration (or via a follow-up `fetcher.submit` if the
action is triggered from a button on a non-route page).
The redirect to `/admin/auth` ensures the next page the
user sees is the login form, even if they had `next`
set from a prior redirect.

#### Scenarios

- GIVEN the user clicks "Sign out"
- WHEN the action returns
- THEN the store is cleared
  (`accessToken`, `expiresAt`, `user` all `null`) AND the
  browser navigates to `/admin/auth`

### REQ-NEXT-1: `next` param is sanitized

The `next` query param SHALL be validated as same-origin
(must start with `/`) AND must start with `/admin/`.
Otherwise it is dropped and the user lands on `/admin`.

#### Rationale

An open redirect is a phishing vector. A malicious link
`?next=https://evil.com` would log the user in, then send
them to a credential-harvesting clone of the admin
shell. The guard — same-origin (must start with `/`)
plus the admin prefix — closes the hole without a full
URL parser. Anything else is treated as no `next` at
all and the user lands on `/admin` (the admin
dashboard, which is safe).

#### Scenarios

- GIVEN the URL is `/admin/auth?next=//evil.com`
- WHEN the action processes the `next` param
- THEN it is dropped AND the user is redirected to `/admin`

- GIVEN the URL is `/admin/auth?next=https://evil.com`
- WHEN the action processes the `next` param
- THEN it is dropped AND the user is redirected to `/admin`

- GIVEN the URL is `/admin/auth?next=/home`
- WHEN the action processes the `next` param
- THEN it is dropped (does not start with `/admin/`) AND
  the user is redirected to `/admin`

- GIVEN the URL is `/admin/auth?next=/admin/projects/123`
- WHEN the action processes the `next` param
- THEN the user is redirected to `/admin/projects/123`

## Open questions for the design phase

- Where exactly does `getSession(request)` live? Today the
  design is `app/admin/auth/server/get-session.ts` (admin
  subdomain) — but it depends on `serverFetch` from
  `http-client`, so it could equally live in
  `app/shared/lib/fetch-client/get-session.ts`. The
  decision is screaming-architecture-shaped.
- `loginSchema` lives at `app/admin/auth/schema.ts`. The
  form, the action, and the API client all import it.
  Confirm there is no second copy in `app/admin/auth/api/`.
- The login server action's pending UX: do we wire
  `useNavigation()` (top-bar pending) or `useActionState()`
  (per-form pending)? The form has a single submit, so
  `useActionState` is the React 19 idiom. Confirm.
- How does the admin layout's `clientLoader` fallback
  interact with the SSR `loader` for the cookie-missing
  path during the backend-blocking window? (See
  cross-project dependency in the proposal.) The design
  must sequence-diagram this.
- i18n on the login form: hardcoded English — confirm NO
  i18n keys at all (no `t('admin.signIn')` placeholder)?
  Adding a key later is a one-line change; removing one
  after the fact is a refactor.
- Should the logout action also clear the `access` cookie
  (the non-HttpOnly one) explicitly, or rely on the
  store clear? The backend does not set a clear for
  `access` today; the design should confirm whether the
  client should set `Max-Age=0` on `access` itself in
  the response.

## Skill resolution

- `react-router`: paths-injected (project-local
  `.agents/skills/react-router/`).
- `typescript`: paths-injected.
- `zustand-5`: paths-injected.
- `react-19`: paths-injected.
