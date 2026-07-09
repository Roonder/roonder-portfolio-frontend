import { Outlet } from "react-router";
import type { Route } from "./+types/admin.contact";

/**
 * Admin contact inbox sub-layout.
 *
 * Scopes domain UI for the Contact subdomain: inbox list and message detail.
 * TODO loader: shared data for the contact branches.
 */
export async function loader({}: Route.LoaderArgs) {
  // TODO: shared contact data.
  return null;
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Contact inbox — Admin" }];
}

export default function AdminContactLayout() {
  return (
    <div>
      <p>Admin contact layout (scaffold)</p>
      <Outlet />
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return (
    <section>
      <h1>Admin contact error</h1>
      <p>{error instanceof Error ? error.message : "Unknown error"}</p>
    </section>
  );
}
