import type { Route } from "./+types/admin.projects._index";

/**
 * Admin projects list route.
 *
 * TODO loader: fetch projects from `/api/v1/projects` for the admin surface.
 * SWR keys mirror REST paths, so the page can use
 * `swrFetcher("/api/v1/projects")`.
 */
export function meta({}: Route.MetaArgs) {
  return [{ title: "Projects — Admin" }];
}

export default function AdminProjectsList() {
  return (
    <section>
      <h1>Projects (scaffold)</h1>
      <p>TODO: replace with the real page from <code>app/admin/projects/</code>.</p>
    </section>
  );
}
