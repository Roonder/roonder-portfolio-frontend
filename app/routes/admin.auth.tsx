import type { Route } from "./+types/admin.auth";

/**
 * Admin login route.
 *
 * TODO action: validate credentials, set a session cookie, and redirect to
 * `/admin` on success. The parent `admin.tsx` layout already exempts this
 * URL from the auth guard, so unauthenticated users can reach it.
 */
export function meta({}: Route.MetaArgs) {
  return [{ title: "Sign in — Admin" }];
}

export default function AdminAuth() {
  return (
    <section>
      <h1>Sign in (scaffold)</h1>
      <p>TODO: replace with the real page from <code>app/admin/auth/</code>.</p>
    </section>
  );
}
