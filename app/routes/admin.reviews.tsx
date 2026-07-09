import { Outlet } from "react-router";
import type { Route } from "./+types/admin.reviews";

/**
 * Admin reviews sub-layout.
 *
 * Scopes domain UI for the Reviews subdomain: list and detail.
 * TODO loader: shared data for the reviews branches.
 */
export async function loader({}: Route.LoaderArgs) {
  // TODO: shared reviews data.
  return null;
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Reviews — Admin" }];
}

export default function AdminReviewsLayout() {
  return (
    <div>
      <p>Admin reviews layout (scaffold)</p>
      <Outlet />
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return (
    <section>
      <h1>Admin reviews error</h1>
      <p>{error instanceof Error ? error.message : "Unknown error"}</p>
    </section>
  );
}
