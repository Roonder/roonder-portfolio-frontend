/**
 * Pure request envelope for the HTTP client. Environment-agnostic —
 * no cookies, no zustand, no `request` binding. The wrappers
 * (`server.ts`, `client.ts`) build a `CoreEnv` and call into here.
 *
 * The DI seam is `CoreEnv.refresh`: the caller wires a closure that
 * knows whether we're on the server (capture Set-Cookie) or the
 * client (update the zustand store). `core.ts` does not know — it just
 * calls `env.refresh()` on a 401 and retries exactly once.
 *
 * Decoupling rationale: this module MUST NOT import from `refresh.ts`
 * or the store. The only contract is the `CoreEnv` interface, which
 * keeps the two files commit-able in either order (the apply phase
 * relies on this — see `openspec/changes/auth-fetch-client/tasks.md`).
 */

import { z } from 'zod';

import { ApiError, fromNetwork, fromResponse } from './errors';

// --- public types -----------------------------------------------------------

export type RequestInit_ = {
	url: string;
	method?: string;
	headers?: Record<string, string>;
	body?: unknown;
	signal?: AbortSignal;
	schema?: z.ZodType;
};

export type CoreResult<S extends z.ZodType | undefined = undefined> = {
	status: number;
	data: S extends z.ZodType ? z.infer<S> : unknown;
	headers: Headers;
};

/**
 * The environment the wrappers inject. `accessToken` is the bearer
 * value to use on this call (server reads the `access` cookie; client
 * reads the zustand store). `signal` is the abort signal the
 * `requestCore` composes into the underlying `fetch`. `refresh` is the
 * 401-recovery closure — the only side-effect the core invokes.
 */
export type CoreEnv = {
	accessToken: string | null;
	signal?: AbortSignal;
	refresh: () => Promise<void>;
};

// --- the public function ----------------------------------------------------

/**
 * Run one HTTP request end-to-end:
 *  1. Build the URL (auto-prepend `/api/v1` for relative paths).
 *  2. Compose headers (apply bearer if `accessToken` is set, content-type
 *     for non-GET with a body, plus any caller-supplied extras).
 *  3. Run `fetch` with the composed abort signal.
 *  4. On 2xx: parse JSON; if a zod `schema` was provided, narrow via
 *     `schema.safeParse` (parse failure → `ApiError { kind: 'server' }`).
 *  5. On non-2xx: throw `ApiError.fromResponse` (envelope-mapped).
 *  6. On 401 from a non-auth URL: call `env.refresh()`, retry ONCE.
 *  7. On `AbortError` / `TypeError` from `fetch`: throw
 *     `ApiError { kind: 'network' }`.
 */
export async function requestCore<
	S extends z.ZodType | undefined = undefined,
>(init: RequestInit_, env: CoreEnv): Promise<CoreResult<S>> {
	const url = normalizeUrl(init.url);
	const method = (init.method ?? 'GET').toUpperCase();
	const headers = composeHeaders({
		callerHeaders: init.headers,
		accessToken: env.accessToken,
		hasBody: init.body !== undefined && init.body !== null,
		method,
	});
	const signal = composeSignal(env.signal, init.signal);
	const body = serializeBody(init.body);

	const doFetch = (token: string | null): Promise<Response> =>
		fetch(url, {
			method,
			headers: composeHeaders({
				callerHeaders: init.headers,
				accessToken: token,
				hasBody: init.body !== undefined && init.body !== null,
				method,
			}),
			body,
			signal,
			// REQ-CLI-1: send the HttpOnly `rt` cookie cross-origin.
			// `serverFetch` (Node) already forwards the incoming `Cookie`
			// header explicitly (REQ-SRV-1), so this is a no-op for SSR
			// but REQUIRED for the browser — without it the default
			// `same-origin` policy strips `rt` on cross-origin production
			// and the silent refresh flow collapses.
			credentials: 'include',
		});

	try {
		let response = await doFetch(env.accessToken);

		// 401-retry: only once, only on non-auth endpoints, only if a
		// refresh callback is wired. Auth endpoints (/auth/login,
		// /auth/refresh) are excluded so the refresh call itself can
		// fail with a 401 without looping.
		if (response.status === 401 && !isAuthEndpoint(url)) {
			await env.refresh();
			response = await doFetch(env.accessToken);
		}

		const parsedBody: unknown = await readJsonSafe(response);

		if (response.ok) {
			const data = init.schema
				? (parseWithSchema(parsedBody, init.schema) as CoreResult<S>['data'])
				: (parsedBody as CoreResult<S>['data']);
			return {
				status: response.status,
				data,
				headers: response.headers,
			};
		}

		throw fromResponse(response, parsedBody);
	} catch (err) {
		if (err instanceof ApiError) throw err;
		throw fromNetwork(err);
	}
}

// --- helpers ----------------------------------------------------------------

function normalizeUrl(url: string): string {
	// Absolute (http(s)://, //evil.com/x) or root-relative to another
	// origin stays untouched. Same-origin relative paths get the
	// /api/v1 prefix so callers can write `'/projects'` instead of the
	// full path.
	if (/^(https?:)?\/\//i.test(url)) return url;
	return url.startsWith('/api/v1/') || url === '/api/v1'
		? url
		: `/api/v1${url.startsWith('/') ? '' : '/'}${url.replace(/^\/+/, '')}`.replace(
				/\/+/g,
				'/',
			);
}

function isAuthEndpoint(url: string): boolean {
	// Strip the leading prefix we may have added and check the path.
	const path = url.replace(/^https?:\/\/[^/]+/, '').replace(/^\/api\/v1/, '');
	return path === '/auth/login' || path === '/auth/refresh' || path === '/auth/logout';
}

type ComposeHeadersInput = {
	callerHeaders: Record<string, string> | undefined;
	accessToken: string | null;
	hasBody: boolean;
	method: string;
};

function composeHeaders(input: ComposeHeadersInput): Headers {
	const h = new Headers();
	if (input.callerHeaders) {
		for (const [k, v] of Object.entries(input.callerHeaders)) {
			h.set(k, v);
		}
	}
	if (input.hasBody && !h.has('Content-Type')) {
		h.set('Content-Type', 'application/json');
	}
	if (!h.has('Accept')) {
		h.set('Accept', 'application/json');
	}
	if (input.accessToken && !h.has('Authorization')) {
		h.set('Authorization', `Bearer ${input.accessToken}`);
	}
	return h;
}

function composeSignal(
	a: AbortSignal | undefined,
	b: AbortSignal | undefined,
): AbortSignal | undefined {
	if (!a) return b;
	if (!b) return a;
	// Node 20+ and modern browsers have AbortSignal.any. We try it
	// without `as any` first; if it errors at runtime in an older
	// runtime, fall back to the most relevant signal.
	if (typeof AbortSignal.any === 'function') {
		return AbortSignal.any([a, b]);
	}
	return a;
}

function serializeBody(body: unknown): BodyInit | undefined {
	if (body === undefined || body === null) return undefined;
	if (
		typeof body === 'string' ||
		body instanceof FormData ||
		body instanceof URLSearchParams ||
		body instanceof Blob ||
		body instanceof ArrayBuffer
	) {
		return body as BodyInit;
	}
	return JSON.stringify(body);
}

async function readJsonSafe(res: Response): Promise<unknown> {
	const contentType = res.headers.get('content-type') ?? '';
	if (!contentType.includes('application/json')) {
		return res.text();
	}
	try {
		return await res.json();
	} catch {
		return null;
	}
}

function parseWithSchema(parsed: unknown, schema: z.ZodType): unknown {
	const result = schema.safeParse(parsed);
	if (result.success) return result.data;
	throw new ApiError({
		kind: 'server',
		status: 200,
		message: 'Response did not match the expected schema',
	});
}
