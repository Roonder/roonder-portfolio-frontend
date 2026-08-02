/**
 * `getSession` — the loader-side session reader.
 *
 * The admin layout's loader (and any other loader that needs the
 * current user) calls this. It:
 *  1. Reads the `access` cookie from the incoming request. If absent,
 *     throws `redirect('/admin/auth?next=<currentPath>')` (REQ-GATE-2)
 *     so the admin gate catches the unauthenticated case before
 *     hitting the API.
 *  2. Calls `serverFetch(request, { url: '/api/v1/auth/profile' })`.
 *     On 200, returns the user payload AND the `Set-Cookie` headers
 *     the internal backend response carried (REQ-GATE-4). The
 *     loader forwards those via `data({ user }, { headers })` so
 *     the browser picks up a rotated `rt` (or `access`) from a
 *     server-side refresh.
 *  3. On 401 (terminal — the backend's `setAccessCookie` did not set
 *     one, or the cookie was cleared server-side), throws the same
 *     `redirect()`.
 */

import { redirect } from 'react-router';

import { readAccessToken } from '../cookies';
import { ApiError, API_ERROR_KIND } from './errors';
import { serverFetch } from './server';

export type SessionUser = { id: string; email: string };

export type Session = {
	user: SessionUser;
	/**
	 * `Set-Cookie` headers from the internal backend response. Empty
	 * when the backend did not rotate any cookie. The loader
	 * forwards these via `data({ user }, { headers })` so the
	 * browser picks up the new `rt` / `access` after a server-side
	 * silent refresh.
	 */
	setCookies: string[];
};

/**
 * Read the admin session from the SSR request. Throws a `redirect()`
 * to `/admin/auth?next=<currentPath>` when the user is not
 * authenticated (no `access` cookie OR the profile call 401s).
 */
export async function getSession(request: Request): Promise<Session> {
	const accessToken = readAccessToken(request);
	if (!accessToken) {
		throw redirectToAuth(request);
	}

	try {
		const result = await serverFetch<undefined>(request, {
			url: '/api/v1/auth/profile',
			method: 'GET',
		});
		const data = result.data as SessionUser;
		if (!data || typeof data.id !== 'string' || typeof data.email !== 'string') {
			throw redirectToAuth(request);
		}
		return { user: data, setCookies: result.setCookies };
	} catch (err) {
		if (err instanceof ApiError && err.kind === API_ERROR_KIND.unauthorized) {
			throw redirectToAuth(request);
		}
		throw err;
	}
}

/**
 * Validate a `?next=…` query param. The guard is per REQ-NEXT-1:
 * same-origin (must start with `/`) AND must start with `/admin/`.
 * Anything else falls back to `/admin` so the user lands on a safe
 * page. This is the same-origin + admin-prefix phishing guard.
 */
export function safeNext(next: string | null, currentPath: string): string {
	if (next && next.startsWith('/admin/') && !next.startsWith('//')) {
		return next;
	}
	void currentPath;
	return '/admin';
}

function redirectToAuth(request: Request): Response {
	const url = new URL(request.url);
	const next = encodeURIComponent(url.pathname + url.search);
	return redirect(`/admin/auth?next=${next}`);
}
