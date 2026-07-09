import type { Route } from "./+types/admin.reviews.$id";

/**
 * Admin review detail route.
 *
 * TODO loader: fetch a single review by `params.id` from `/api/v1/reviews/:id`.
 * TODO action: approve or reject the review (POST to a state-change endpoint).
 */
export function meta({}: Route.MetaArgs) {
  return [{ title: "Review — Admin" }];
}

export default function AdminReviewDetail({ params }: Route.ComponentProps) {
  return (
    <section>
      <h1>Review (scaffold)</h1>
      <p>TODO: replace with the real page from <code>app/admin/reviews/</code>.</p>
      <p>id: {params.id}</p>
    </section>
  );
}
