import type { Route } from "./+types/_public.works";

/**
 * Public works list route.
 *
 * TODO loader: fetch projects from `/api/v1/projects` via swrFetcher or a
 * direct fetch in the loader. Read the backend's openspec/ first to learn
 * the projection shape before defining a domain type here.
 */
export function meta({}: Route.MetaArgs) {
  return [{ title: "Works — Roonder Portfolio" }];
}

export default function PublicWorks() {
  return (
    <section>
      <h1>Works (scaffold)</h1>
      <p>TODO: replace with the real page from <code>app/works/</code>.</p>
    </section>
  );
}
