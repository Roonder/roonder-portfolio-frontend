/**
 * Admin login route.
 *
 * Re-exports the page (and its meta) from `~/admin/auth/pages/login`
 * and the server action from `~/admin/auth/api/login`. The action
 * is what `fetcher.submit` from the form targets via
 * `action: '/admin/auth'`.
 */
export { default, meta } from "~/admin/auth/pages/login";
export { loginAction as action } from "~/admin/auth/api/login";
