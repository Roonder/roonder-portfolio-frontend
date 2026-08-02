import { data, Outlet } from "react-router";
import type { Route } from "./+types/admin";

import { getSession } from "~/shared/lib/fetch-client/get-session";

/**
 * Admin surface layout.
 *
 * The loader implements the auth gate (REQ-GATE-1..4):
 *  - `/admin/auth` is exempt so the login form is reachable
 *    unauthenticated (REQ-GATE-3).
 *  - For every other admin route, `getSession(request)` reads the
 *    `access` cookie, calls `GET /api/v1/auth/profile` via
 *    `serverFetch`, and returns the user + any `Set-Cookie` the
 *    internal response carried. On 401 (terminal) it throws
 *    `redirect('/admin/auth?next=…')` (REQ-GATE-2).
 *  - The `Set-Cookie` array is forwarded via `data({ user }, {
 *    headers })` so a server-side silent refresh updates the
 *    browser's `rt` (REQ-GATE-4).
 */
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/admin/auth")) {
    return { authenticated: false as const };
  }

  const session = await getSession(request);

  // Forward any rotated cookies (`rt`, `access`) the backend set on
  // the internal response so the browser picks them up. Each value
  // is a separate `Set-Cookie` header — the `Headers` object handles
  // this correctly (vs. `Record<string, string>` which would collapse
  // multiple Set-Cookie into a single comma-joined value).
  const headers = new Headers();
  for (const c of session.setCookies) {
    headers.append("Set-Cookie", c);
  }

  return data(
    { authenticated: true as const, user: session.user },
    { headers }
  );
}

// Design §4.7 / T-I-3: a `clientLoader` fallback for the
// pre-PR-0 (backend `setAccessCookie`) window was considered. With
// PR 0 merged, the SSR loader's `getSession` is the production
// path and the fallback would be a no-op. Two reasons we did NOT
// add it:
//
//  1. **React Router 8 redirect semantics.** When the SSR `loader`
//     throws `redirect()`, the response IS a 30x navigation and a
//     `clientLoader` does NOT get a chance to "rescue" it. The
//     `clientLoader` only runs on client-side navigations and
//     (with `clientLoader.hydrate = true`) on initial hydration.
//     The design's "if the SSR loader threw, the clientLoader
//     retries on the client" pattern is not how React Router 8
//     actually behaves. A no-op export with documentation would
//     add typegen noise (`loaderData` becomes `null | <loader type>`)
//     for zero behavioral benefit.
//
//  2. **Cost of dead code.** An exported `clientLoader` that
//     typechecks is a maintenance surface: a future maintainer
//     reading the file might assume it does something and add
//     logic that races the SSR loader. The design itself notes
//     ("OR drop the `clientLoader` if the PR 2 code path already
//     covers the cookie-missing window — apply-phase decision")
//     that dropping is the right call when the production path
//     is the SSR loader.
//
// The historical intent is preserved in this comment and in
// design §4.7 / tasks.md §6 (T-I-3). If the cookie contract ever
// drifts again (e.g. a future PR renames the cookie), reintroduce
// the clientLoader as a real rescue path — at that point the
// typegen trade-off is justified.

export function meta({}: Route.MetaArgs) {
  return [{ title: "Admin — Roonder Portfolio" }];
}

export default function AdminLayout({
  loaderData,
}: Route.ComponentProps) {
  const user = loaderData.authenticated ? loaderData.user : null;
  return (
    <div>
      <p>Admin layout (scaffold)</p>
      {user ? <p>Signed in as {user.email}</p> : null}
      <Outlet />
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return (
    <section>
      <h1>Admin layout error</h1>
      <p>{error instanceof Error ? error.message : "Unknown error"}</p>
    </section>
  );
}
