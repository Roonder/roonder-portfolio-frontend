import { Outlet } from "react-router";
import type { Route } from "./+types/admin.projects";

/**
 * Admin projects sub-layout.
 *
 * This layout scopes domain UI for the Projects subdomain: list, new, edit.
 * It is mounted under the parent `admin.tsx` layout, so the auth guard
 * already runs before this loader.
 *
 * TODO loader: return shared data (filters, current selection, etc.) used
 * across the projects branches. Return an empty payload for now.
 */
export async function loader({}: Route.LoaderArgs) {
  // TODO: shared projects data.
  return null;
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Projects — Admin" }];
}

export default function AdminProjectsLayout() {
  return (
    <div>
      <p>Admin projects layout (scaffold)</p>
      <Outlet />
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return (
    <section>
      <h1>Admin projects error</h1>
      <p>{error instanceof Error ? error.message : "Unknown error"}</p>
    </section>
  );
}
