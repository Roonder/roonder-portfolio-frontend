import type { Route } from "./+types/admin.reviews._index";

/**
 * Admin reviews list route.
 *
 * TODO loader: fetch reviews from `/api/v1/reviews`.
 */
export function meta({}: Route.MetaArgs) {
  return [{ title: "Reviews — Admin" }];
}

export default function AdminReviewsList() {
  return (
    <section>
      <h1>Reviews (scaffold)</h1>
      <p>TODO: replace with the real page from <code>app/admin/reviews/</code>.</p>
    </section>
  );
}
