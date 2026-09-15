/**
 * Single source of truth for the backend origin in both runtimes.
 *
 * `API_BASE_URL` — the server-side origin. Node `fetch` cannot resolve
 * relative URLs, so SSR always resolves against it (e.g.
 * `http://localhost:3000` in dev, the backend's public URL in prod).
 *
 * `CLIENT_API_BASE_URL` — the browser-side origin. In dev it is empty so
 * relative `/api/*` calls keep hitting the Vite dev proxy (and avoid a
 * CORS mismatch with `localhost:5173`). In production it is the backend
 * origin because `react-router-serve` has NO reverse proxy forwarding
 * `/api` — relative URLs would hit the React Router handler and 404
 * with "No route matches URL".
 *
 * `import.meta.env.DEV` is the compile-time flag that picks the behavior
 * per build, so the same source works in both environments.
 */

const RAW_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

/** Server-side backend origin. Node fetch requires absolute URLs, also in dev. */
export const API_BASE_URL = RAW_API_BASE_URL;

/**
 * Browser-side backend origin. Empty in dev so relative `/api/*` calls keep
 * hitting the Vite dev proxy (and avoid CORS mismatch); absolute in
 * production so browser calls reach the backend directly (no proxy exists).
 */
export const CLIENT_API_BASE_URL = import.meta.env.DEV ? '' : RAW_API_BASE_URL;