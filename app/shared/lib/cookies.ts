/**
 * Cookie helpers and the `access` / `rt` cookie spec.
 *
 * The attribute map mirrors `openspec/changes/auth-fetch-client/design.md`
 * §7.2 (the SHARED SPEC referenced by both the backend `setAccessCookie`
 * helper and the frontend `serverFetch` / `clientFetch` wrappers). Any
 * change here MUST be reflected in the backend's `auth.controller.ts`.
 */

export type CookieAttrs = {
	httpOnly: boolean;
	secure: true;
	sameSite: 'lax';
	path: '/';
};

export const COOKIE_SPEC: Readonly<{ access: CookieAttrs; rt: CookieAttrs }> =
	{
		// `httpOnly: false` is intentional: the client-side zustand
		// `hydrate()` must read this. The XSS surface is accepted because
		// the `rt` cookie (the long-lived credential) is HttpOnly and the
		// access token has a 15-minute expiry.
		access: { httpOnly: false, secure: true, sameSite: 'lax', path: '/' },
		// `rt` is the long-lived refresh token. HttpOnly so JavaScript
		// (including the bundler's own code) cannot read it.
		rt: { httpOnly: true, secure: true, sameSite: 'lax', path: '/' },
	};

/**
 * Read the `access` cookie from a Request's `Cookie` header.
 *
 * Returns `null` when the header is missing or the cookie is absent.
 * Used by `serverFetch` to bridge the access token to SSR loaders
 * (which have no zustand store to read from).
 */
export function readAccessToken(request: Request): string | null {
	const header = request.headers.get('cookie');
	if (!header) return null;
	return parseCookieValue(header, 'access');
}

/**
 * Append a `Set-Cookie: access=; Max-Age=0` header to clear the access
 * cookie on logout. The `rt` cookie clear is set by the backend on
 * `/auth/logout`; this helper handles the frontend's half of the wipe.
 */
export function clearAccessCookie(headers: Headers): void {
	headers.append(
		'Set-Cookie',
		'access=; Max-Age=0; Path=/; SameSite=Lax',
	);
}

/**
 * Tiny `Cookie` header parser. Looks for `name=value` segments separated
 * by `; ` or `;`. Returns the first match's decoded value, or `null`.
 * No support for quoted values, attributes, or arrays — sufficient for
 * the two flat cookies the frontend reads.
 */
function parseCookieValue(cookieHeader: string, name: string): string | null {
	for (const segment of cookieHeader.split(';')) {
		const trimmed = segment.trim();
		const eq = trimmed.indexOf('=');
		if (eq === -1) continue;
		const key = trimmed.slice(0, eq);
		if (key !== name) continue;
		const value = trimmed.slice(eq + 1);
		return value.length > 0 ? value : null;
	}
	return null;
}
