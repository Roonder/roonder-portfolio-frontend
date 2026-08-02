/**
 * Admin logout route.
 *
 * The URL `/admin/auth/logout` is a sibling of the login route
 * (`/admin/auth`); it exists solely to host the `logoutAction` server
 * action. The `SignOutButton` posts here via
 * `fetcher.submit(null, { method: 'post', action: '/admin/auth/logout' })`.
 *
 * The route has no `default` component — its only job is to expose
 * the action. The action returns `redirect('/admin/auth')` with the
 * `Set-Cookie: access=; Max-Age=0` and `Set-Cookie: rt=; Max-Age=0`
 * clears, so the user lands on the login form with both cookies gone.
 */
export { logoutAction as action } from "~/admin/auth/api/logout";
