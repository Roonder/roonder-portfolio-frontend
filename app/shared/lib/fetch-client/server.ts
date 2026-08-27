/**
 * `serverFetch` — the React Router loader/action entry point.
 *
 * Responsibilities:
 *  1. Forward the incoming request's `Cookie` header verbatim on the
 *     internal fetch so the `rt` HttpOnly cookie rides along
 *     (REQ-SRV-1). Without this, the backend cannot read `rt` and
 *     `/auth/refresh` 401s.
 *  2. Read the `access` cookie as the `Authorization: Bearer` fallback
 *     when the caller did not pass an explicit `Authorization` header
 *     (REQ-SRV-3). The cookie is the SSR bridge for the access token.
 *  3. Compose the abort signal from `request.signal` and any caller
 *     `init.signal` so a user navigation away cancels the in-flight
 *     call.
 *  4. Capture the internal response's `Set-Cookie` headers via
 *     `response.headers.getSetCookie()` and return them on
 *     `serverResult.setCookies` (REQ-SRV-2). The loader forwards them
 *     via `data(payload, { headers })` so the browser picks up the
 *     rotated `rt` (or any other cookie the backend set).
 *  5. Wire the `env.refresh` callback so `core.ts`'s 401-retry path
 *     has a closure. The refresh call itself goes through `requestCore`
 *     with the same `request` (cookie forwarding) and the same
 *     `Set-Cookie` capture merged into the eventual retry's
 *     `serverResult.setCookies`.
 */

import { z } from 'zod';

import { readAccessToken } from '../cookies';
import type { CoreEnv, CoreResult, RequestInit_ } from './core';
import { requestCore } from './core';

/**
 * The backend's base URL for SSR `fetch` calls. Node.js cannot resolve
 * relative URLs — `fetch('/api/v1/projects')` throws `TypeError: Failed
 * to parse URL`. The `API_BASE_URL` env var (e.g. `http://localhost:3000`)
 * provides the origin. In production, set this to the backend's public
 * URL (or leave empty if frontend and backend share an origin).
 */
const API_BASE_URL = (process.env.API_BASE_URL ?? '').replace(/\/+$/, '');

export type ServerResult<S extends z.ZodType | undefined = undefined> =
	CoreResult<S> & {
		/**
		 * `Set-Cookie` headers from the internal backend response, in
		 * order. Empty array when the backend did not rotate any
		 * cookie. The loader is responsible for forwarding these via
		 * `data(payload, { headers })` so the browser picks up the
		 * new `rt` (or `access`) after a server-side refresh.
		 */
		setCookies: string[];
	};

/**
 * Run one HTTP request from a React Router loader/action, with full
 * SSR cookie plumbing. The `request` is the loader's incoming Request
 * (used for `Cookie` forwarding and abort signal composition).
 */
export async function serverFetch<
	S extends z.ZodType | undefined = undefined,
>(
	request: Request,
	init: Omit<RequestInit_, 'schema'> & { schema?: S },
): Promise<ServerResult<S>> {
	const incomingCookie = request.headers.get('cookie') ?? undefined;
	const accessToken = readAccessToken(request);
	const setCookies: string[] = [];

	const env: CoreEnv = {
		accessToken,
		signal: request.signal,
		// The refresh callback is wired here, not in `core.ts`, so
		// `core` stays pure and unaware of cookies. The callback
		// re-calls `serverFetch` with the same `request` so the
		// `Cookie` header and abort signal are preserved; any new
		// `Set-Cookie` from the refresh is captured into the
		// same `setCookies` array the eventual retry will read.
		refresh: async () => {
			const refreshed = await serverFetch(request, {
				url: '/api/v1/auth/refresh',
				method: 'POST',
			});
			// Merge any cookies the refresh call set (the new `rt` and
			// the new `access`). Subsequent calls to `setCookies.push`
			// will pick them up; the original caller will see them in
			// the returned `serverResult.setCookies`.
			for (const c of refreshed.setCookies) setCookies.push(c);
			// REQ-RFR-2: propagate the new access token from the
			// refresh response body to the in-flight `env` so the
			// retry in `core.ts` uses the NEW access token (not the
			// closure-captured stale cookie from the start of this
			// call). The new `Set-Cookie: access=...` also rides back
			// to the browser via `setCookies` above, so subsequent
			// requests read the new cookie naturally.
			const refreshedData = refreshed.data as
				| { accessToken?: unknown }
				| null;
			const newToken =
				refreshedData && typeof refreshedData.accessToken === 'string'
					? refreshedData.accessToken
					: null;
			if (newToken) env.accessToken = newToken;
		},
	};

	// If the caller did not pass an explicit `Authorization` header, do
	// not pass one at all — let `core.ts` read the access token from
	// `env`. If the caller DID pass one, it wins.
	const callerHeaders = { ...(init.headers ?? {}) };
	if (!callerHeaders.Authorization && !callerHeaders.authorization) {
		// No-op: let core read from env.
	} else {
		// Strip the caller's explicit Authorization from the headers
		// we hand to core; we'll inject it via env (so the explicit
		// header still wins over the cookie).
		const explicit = callerHeaders.Authorization ?? callerHeaders.authorization;
		delete callerHeaders.Authorization;
		delete callerHeaders.authorization;
		env.accessToken = explicit?.replace(/^Bearer\s+/i, '') ?? null;
	}

	const forwardedHeaders: Record<string, string> = { ...callerHeaders };
	if (incomingCookie) {
		forwardedHeaders.Cookie = incomingCookie;
	}

	// Resolve the URL to absolute for Node.js `fetch`. Relative URLs
	// work in the browser (same-origin resolution) but throw in SSR.
	// `API_BASE_URL` (e.g. `http://localhost:3000`) provides the origin.
	// When empty, fall back to the relative URL (works if the backend
	// shares the origin — e.g. reverse proxy in production).
	const resolvedUrl = API_BASE_URL
		? `${API_BASE_URL}${init.url.startsWith('/') ? '' : '/'}${init.url}`
		: init.url;

	const result = await requestCore<S>(
		{
			url: resolvedUrl,
			method: init.method,
			body: init.body,
			signal: init.signal,
			schema: init.schema,
			headers: forwardedHeaders,
		},
		env,
	);

	// Capture the internal response's Set-Cookie. `getSetCookie()` is
	// the platform API that returns each Set-Cookie value separately
	// (vs. the joined `get('Set-Cookie')` that loses per-cookie
	// attributes).
	const internalSetCookies = (result.headers as Headers).getSetCookie?.() ?? [];
	for (const c of internalSetCookies) setCookies.push(c);

	return {
		status: result.status,
		data: result.data,
		headers: result.headers,
		setCookies,
	};
}
