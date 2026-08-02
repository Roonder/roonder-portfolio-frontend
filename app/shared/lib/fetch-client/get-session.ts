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
 *     On 200, returns the user payload.
 *  3. On 401 (terminal — the backend's `setAccessCookie` did not set
 *     one, or the cookie was cleared server-side), throws the same
 *     `redirect()`.
 *
 * The `setCookies` forwarding (REQ-GATE-4) is a follow-up concern
 * handled by the loader that calls `getSession` (PR 2 wires
 * `data({ user }, { headers })`); this helper returns just the user
 * payload for now so the foundation can ship without a route change.
 */

import { redirect } from 'react-router';

import { readAccessToken } from '../cookies';
import { ApiError, API_ERROR_KIND } from './errors';
import { serverFetch } from './server';

export type SessionUser = { id: string; email: string };

/**
 * Read the admin session from the SSR request. Throws a `redirect()`
 * to `/admin/auth?next=<currentPath>` when the user is not
 * authenticated (no `access` cookie OR the profile call 401s).
 */
export async function getSession(request: Request): Promise<{ user: SessionUser }> {
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
		return { user: data };
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
