import type { Route } from "./+types/_public.works.$slug";

/**
 * Public work detail route.
 *
 * TODO loader: fetch a single project by `params.slug` from
 * `/api/v1/projects/:slug` (or the appropriate endpoint). For the dynamic
 * meta title, derive from `loaderData.project.title`.
 */
export function meta({}: Route.MetaArgs) {
  return [{ title: "Work — Roonder Portfolio" }];
}

export default function PublicWorkDetail({ params }: Route.ComponentProps) {
  return (
    <section>
      <h1>Work (scaffold)</h1>
      <p>TODO: replace with the real page from <code>app/works/</code>.</p>
      <p>slug: {params.slug}</p>
    </section>
  );
}
