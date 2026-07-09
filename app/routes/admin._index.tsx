import type { Route } from "./+types/admin._index";

/**
 * Admin dashboard route.
 *
 * The dashboard is the landing surface after sign-in. It should summarize
 * counts from each subdomain (projects, reviews, contact) by calling their
 * list endpoints. For now this is a scaffold.
 */
export function meta({}: Route.MetaArgs) {
  return [{ title: "Dashboard — Admin" }];
}

export default function AdminDashboard() {
  return (
    <section>
      <h1>Dashboard (scaffold)</h1>
      <p>TODO: replace with the real page from <code>app/admin/</code>.</p>
    </section>
  );
}
