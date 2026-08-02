/**
 * `logoutAction` — the React Router server action for admin sign-out.
 *
 * Called by `SignOutButton` via
 * `fetcher.submit(null, { method: 'post', action: '/admin/auth/logout' })`.
 *
 * Flow (per REQ-LO-1 / REQ-LO-2):
 *  1. POST `/api/v1/auth/logout` via `serverFetch`. The backend's
 *     `setRefreshCookie` will set `Set-Cookie: rt=; Max-Age=0` on the
 *     internal response. `serverFetch` captures every `Set-Cookie` into
 *     `serverResult.setCookies` (REQ-SRV-2).
 *  2. Independently of the backend's response, append a
 *     `Set-Cookie: access=; Max-Age=0` via `clearAccessCookie()` — the
 *     backend does NOT clear the non-HttpOnly `access` cookie on
 *     `/auth/logout`, so the frontend is responsible for that half of
 *     the wipe (design §5 open question 6).
 *  3. Return `redirect('/admin/auth', { headers })` with the merged
 *     `Set-Cookie` array on the outgoing response. The browser stores
 *     both clear directives and the user lands on the login form.
 *
 * On any error from the backend, we still clear the `access` cookie
 * and redirect to `/admin/auth` — logout is best-effort and must never
 * leave the user in a half-signed-in state. The typed `ApiError` is
 * swallowed silently (no toast, no modal — locked decision D4); the
 * next page render will see an unauthenticated session and the
 * admin gate will redirect to login on the next protected call.
 *
 * The `useSessionStore.logout()` JS-side wipe is dispatched by the
 * `SignOutButton` component (the action runs on the server, the
 * zustand store is client-only) — see `sign-out-button.tsx`.
 */

import { redirect } from "react-router";

import { clearAccessCookie } from "~/shared/lib/cookies";
import { ApiError } from "~/shared/lib/fetch-client/errors";
import { serverFetch } from "~/shared/lib/fetch-client/server";

/**
 * React Router 8 server action. Always returns a `Response`: on the
 * happy path it's a `redirect('/admin/auth')` with the cookie-clear
 * `Set-Cookie` headers; on backend failure it's the same redirect
 * (with the `access` cookie clear still attached). The store-level
 * clear is the button's responsibility.
 */
export async function logoutAction({
	request,
}: {
	request: Request;
}): Promise<Response> {
	const headers = new Headers();

	// Always clear the `access` cookie on the outgoing response — the
	// backend does not. Pre-append BEFORE attempting the backend call
	// so a backend error does not skip the wipe.
	clearAccessCookie(headers);

	try {
		const result = await serverFetch(request, {
			url: "/api/v1/auth/logout",
			method: "POST",
		});
		// Append the backend's `Set-Cookie` (the `rt=; Max-Age=0` clear)
		// to the outgoing response. `Headers.append` handles multiple
		// `Set-Cookie` values correctly (vs. `Record<string, string>`
		// which would collapse them into a single comma-joined value).
		for (const c of result.setCookies) {
			headers.append("Set-Cookie", c);
		}
	} catch (err) {
		// Logout is best-effort. If the backend is down or the call 401s
		// (e.g. the `rt` was already gone), we still redirect to login
		// and the browser sees the `access` cookie clear. The next
		// protected call from the client will 401, the admin gate will
		// redirect, and the user lands on the same place.
		if (!(err instanceof ApiError)) {
			// Unexpected (non-ApiError) — re-throw so the route's
			// ErrorBoundary surfaces it. ApiError is the typed
			// "the backend said no" path, which we treat as terminal
			// but recoverable (the redirect still wins).
			throw err;
		}
	}

	return redirect("/admin/auth", { headers });
}
