import {
  type RouteConfig,
  type RouteConfigEntry,
  index,
  layout,
  prefix,
  route,
} from "@react-router/dev/routes";

/**
 * Centralized route config.
 *
 * Public surface (en at root, es at /es/...) is mounted under both prefixes so
 * the URL stays shareable. Language detection happens in the _public layout's
 * loader (TODO when wiring i18next).
 *
 * Each public route needs an explicit, unique `id` because the same route
 * files are mounted at two URLs (root and /es). React Router derives route
 * IDs from file paths, so without overrides the manifest would have
 * duplicate-id collisions. The English version keeps the path-as-id
 * convention; the Spanish version is namespaced with an `es-` prefix.
 *
 * Admin has 4 subdomains (auth, projects, reviews, contact) — each is a nested
 * branch with its own sub-layout route, so domain UI can be scoped without
 * flattening the URL.
 */
const publicRoutes = (lang: "en" | "es"): RouteConfigEntry[] => {
  const id = (suffix: string) => (lang === "es" ? `es-${suffix}` : suffix);
  return [
    layout("routes/_public.tsx", { id: id("_public") }, [
      index("routes/_public._index.tsx", { id: id("_public._index") }),
      route("works", "routes/_public.works.tsx", { id: id("_public.works") }),
      route("works/:slug", "routes/_public.works.$slug.tsx", {
        id: id("_public.works.$slug"),
      }),
      route("contact", "routes/_public.contact.tsx", {
        id: id("_public.contact"),
      }),
      // P0 smoke route (REMOVED in T-F-12). Lives under the public
      // layout so it picks up the i18n seeding; lives at
      // /p0-smoke (en) and /es/p0-smoke (es) — same surface the
      // home page will live on.
      route("p0-smoke", "routes/_public.p0-smoke.tsx", {
        id: id("_public.p0-smoke"),
      }),
    ]),
  ];
};

export default [
  // Spanish surface
  ...prefix("es", publicRoutes("es")),
  // English surface (default at root)
  ...publicRoutes("en"),

  // Admin surface (no i18n in scope)
  layout("routes/admin.tsx", [
    index("routes/admin._index.tsx"),
    route("auth", "routes/admin.auth.tsx"),
    route("auth/logout", "routes/admin.auth.logout.tsx"),

    route("projects", "routes/admin.projects.tsx", [
      index("routes/admin.projects._index.tsx"),
      route("new", "routes/admin.projects.new.tsx"),
      route(":id", "routes/admin.projects.$id.tsx"),
    ]),

    route("reviews", "routes/admin.reviews.tsx", [
      index("routes/admin.reviews._index.tsx"),
      route(":id", "routes/admin.reviews.$id.tsx"),
    ]),

    route("contact", "routes/admin.contact.tsx", [
      index("routes/admin.contact._index.tsx"),
      route(":id", "routes/admin.contact.$id.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
