import { Outlet } from "react-router";
import type { Route } from "./+types/admin";

/**
 * Admin surface layout.
 *
 * The loader implements the auth guard pattern: it skips the check for the
 * login page itself (`/admin/auth`) so the user can sign in. For every other
 * admin route, a real session cookie check must redirect to `/admin/auth`
 * when the visitor is unauthenticated.
 *
 * The session helper will live in `app/admin/auth/` (TODO). Wire it up inside
 * the `else` branch below; for now, every non-auth request is treated as
 * authenticated so the scaffold is navigable.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/admin/auth")) {
    return { authenticated: false };
  }
  // TODO: real session cookie check, then:
  //   if (!isAuthenticated(request)) throw redirect("/admin/auth");
  return { authenticated: true };
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Admin — Roonder Portfolio" }];
}

export default function AdminLayout() {
  return (
    <div>
      <p>Admin layout (scaffold)</p>
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
