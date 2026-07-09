import type { Route } from "./+types/admin.projects.new";

/**
 * Admin new-project route.
 *
 * TODO action: validate the form with zod and POST to `/api/v1/projects`.
 * The page itself should use react-hook-form for client validation.
 */
export function meta({}: Route.MetaArgs) {
  return [{ title: "New project — Admin" }];
}

export default function AdminProjectsNew() {
  return (
    <section>
      <h1>New project (scaffold)</h1>
      <p>TODO: replace with the real page from <code>app/admin/projects/</code>.</p>
    </section>
  );
}
