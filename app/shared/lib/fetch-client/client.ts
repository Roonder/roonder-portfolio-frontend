/**
 * `clientFetch` — the browser entry point.
 *
 * Responsibilities:
 *  1. Add `credentials: 'include'` to every request so the HttpOnly
 *     `rt` cookie rides along. The browser auto-attaches `rt` from
 *     the cookie jar; we just have to opt in.
 *  2. Inject `Authorization: Bearer <accessToken>` on every request
 *     UNLESS the URL matches `/auth/login` or `/auth/refresh`
 *     (REQ-CLI-2). The access token comes from `useSessionStore`.
 *  3. Wire the `env.refresh` callback so `core.ts`'s 401-retry path
 *     has a closure. On success, the new access token is written to
 *     the store; on terminal failure, the store is cleared and the
 *     `ApiError` propagates.
 */

import type { z } from 'zod';

import type { CoreEnv, CoreResult, RequestInit_ } from './core';
import { requestCore } from './core';
import { refreshPolicy, type Requester } from './refresh';
import { useSessionStore } from '~/shared/stores/session';

/**
 * Run one HTTP request from the browser, with bearer + cookie plumbing
 * and the same single-flight refresh policy as the server side.
 */
export async function clientFetch<S extends z.ZodType | undefined = undefined>(
	init: Omit<RequestInit_, 'schema'> & { schema?: S },
): Promise<CoreResult<S>> {
	const accessToken = useSessionStore.getState().accessToken;
	const isAuth = isAuthEndpoint(init.url);

	// The `request` callback the refresh policy invokes is itself
	// `clientFetch` — but typed structurally as a `Requester` (the
	// contract the policy needs, not the full generic shape).
	const requester: Requester = (r) =>
		clientFetch(r as Omit<RequestInit_, 'schema'> & { schema?: S });

	const env: CoreEnv = {
		accessToken: isAuth ? null : accessToken,
		refresh: () =>
			refreshPolicy({
				request: requester,
				isAuthEndpoint,
				signal: init.signal ?? new AbortController().signal,
				onSuccess: (data) => {
					// The refresh response is `{ accessToken, expiresIn }`
					// per the backend's AuthResponseDto. We persist the
					// token + expiry; the user is unchanged.
					const parsed = data as
						| { accessToken?: unknown; expiresIn?: unknown }
						| null;
					const token =
						parsed && typeof parsed.accessToken === 'string'
							? parsed.accessToken
							: null;
					const expiresIn =
						parsed && typeof parsed.expiresIn === 'number'
							? parsed.expiresIn
							: null;
					if (token && expiresIn !== null) {
						useSessionStore.getState().refresh({
							accessToken: token,
							expiresAt: Date.now() + expiresIn * 1000,
						});
						// REQ-RFR-2: propagate the new token to the
						// in-flight `env` so the retry in `core.ts` uses
						// the NEW access token (not the closure-captured
						// stale one from the start of this call).
						env.accessToken = token;
					}
				},
				onTerminal: () => {
					useSessionStore.getState().logout();
				},
			}),
	};

	const result = await requestCore<S>(init, env);

	// `core.ts` sets `credentials: 'include'` on the underlying fetch
	// so the HttpOnly `rt` cookie rides along cross-origin (REQ-CLI-1).
	// The result is returned as-is; `core.ts` already parsed the body
	// and applied the optional schema.
	return result;
}

function isAuthEndpoint(url: string): boolean {
	const path = url.replace(/^https?:\/\/[^/]+/, '').replace(/^\/api\/v1/, '');
	return path === '/auth/login' || path === '/auth/refresh' || path === '/auth/logout';
}
