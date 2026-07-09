import type { Route } from "./+types/admin.projects.$id";

/**
 * Admin edit-project route.
 *
 * TODO loader: fetch the project by `params.id` from `/api/v1/projects/:id`.
 * TODO action: handle update (PUT) and delete (DELETE) on the same endpoint.
 * Use a `useFetcher` to keep the user on this URL when mutating.
 */
export function meta({}: Route.MetaArgs) {
  return [{ title: "Edit project — Admin" }];
}

export default function AdminProjectsEdit({ params }: Route.ComponentProps) {
  return (
    <section>
      <h1>Edit project (scaffold)</h1>
      <p>TODO: replace with the real page from <code>app/admin/projects/</code>.</p>
      <p>id: {params.id}</p>
    </section>
  );
}
