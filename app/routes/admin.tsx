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
