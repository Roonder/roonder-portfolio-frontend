import { Outlet } from "react-router";
import type { Route } from "./+types/_public";

/**
 * Public surface layout.
 *
 * Responsibilities:
 * - Detect locale from URL pathname (en at root, es at /es/...).
 * - Boot i18next for the subtree (TODO when wiring react-i18next).
 * - Render global header, footer, and the matched child route.
 *
 * The `data-lang` attribute lets the subtree read the current locale without
 * re-parsing the URL.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const lang = url.pathname.startsWith("/es") ? "es" : "en";
  return { lang };
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Roonder Portfolio" }];
}

export default function PublicLayout({ loaderData }: Route.ComponentProps) {
  return (
    <div data-lang={loaderData.lang}>
      <Outlet />
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return (
    <section>
      <h1>Public layout error</h1>
      <p>{error instanceof Error ? error.message : "Unknown error"}</p>
    </section>
  );
}
