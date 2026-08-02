/**
 * Single-flight refresh policy.
 *
 * The `refreshPromise` module-level variable is the dedupe point: when
 * the first 401 is observed, the policy sets it; every other in-flight
 * caller awaits the SAME promise. This is what stops N concurrent 401s
 * from racing into N refresh calls (which would trip the backend's
 * `rt` reuse-detection and revoke the whole family).
 *
 * This module is intentionally decoupled from `core.ts`: it does NOT
 * import `requestCore` directly. Instead, the `Requester` type below is
 * a structural contract — the wiring is done by the caller
 * (`server.ts`, `client.ts`) which has the right `env` and the right
 * way to capture `Set-Cookie` (server) or update the store (client).
 *
 * Module-scoped mutable is intentional: a per-store or per-component
 * `refreshPromise` would let N components each have their own — defeating
 * the dedupe. The module is the right scope because the refresh result
 * is the same for the entire JS realm.
 */

import { API_ERROR_KIND, ApiError } from './errors';

/**
 * The contract for "do one HTTP request". The `core` module satisfies
 * it; the policy does not care which one. The shape mirrors
 * `core.ts`'s `requestCore` return so the policy can do its work
 * without a type-level import of `core`.
 */
export type Requester = (
	init: RequestInitLike,
) => Promise<{ status: number; data: unknown; headers: Headers }>;

/**
 * Minimal `RequestInit` shape the policy needs. Mirrors the public
 * surface of `core.ts`'s `RequestInit_` but expressed structurally so
 * the policy does not need to import it.
 */
export type RequestInitLike = {
	url: string;
	method?: string;
	headers?: Record<string, string>;
	body?: unknown;
	signal?: AbortSignal;
};

export type IsAuthEndpoint = (url: string) => boolean;
export type RefreshOnSuccess = (data: unknown) => void;
export type RefreshOnTerminal = () => void;

/**
 * Module-scoped dedupe variable. `null` means no refresh in flight; a
 * `Promise` means N callers are already waiting on the same one.
 */
let refreshPromise: Promise<void> | null = null;

export function setRefreshPromise(p: Promise<void> | null): void {
	refreshPromise = p;
}

export function getRefreshPromise(): Promise<void> | null {
	return refreshPromise;
}

export function clearRefreshPromise(): void {
	refreshPromise = null;
}

export type RefreshPolicyOptions = {
	request: Requester;
	isAuthEndpoint: IsAuthEndpoint;
	signal: AbortSignal;
	onSuccess: RefreshOnSuccess;
	onTerminal: RefreshOnTerminal;
};

/**
 * Run (or wait for) the single-flight refresh. If the URL is an auth
 * endpoint, throws `unauthorized` directly — no refresh (avoids a
 * loop where `/auth/refresh` 401s and tries to refresh itself). On
 * success, calls `onSuccess` with the parsed body so the caller can
 * write the new token to the store / capture the new cookie. On
 * terminal failure, calls `onTerminal` so the caller can clear the
 * store before the error propagates.
 */
export function refreshPolicy(opts: RefreshPolicyOptions): Promise<void> {
	const { request, isAuthEndpoint, signal, onSuccess, onTerminal } = opts;

	if (isAuthEndpoint('/api/v1/auth/refresh')) {
		return Promise.reject(
			new ApiError({
				kind: API_ERROR_KIND.unauthorized,
				status: 401,
				message: 'Refresh is itself an auth endpoint',
			}),
		);
	}

	const existing = getRefreshPromise();
	if (existing) return existing;

	const next = (async () => {
		try {
			const result = await request({
				url: '/api/v1/auth/refresh',
				method: 'POST',
				signal,
			});
			if (result.status >= 200 && result.status < 300) {
				onSuccess(result.data);
				return;
			}
			// Non-2xx from /auth/refresh. Map to ApiError and treat as
			// terminal (401 / 5xx alike — the session is dead).
			const err = result.status === 401
				? new ApiError({
						kind: API_ERROR_KIND.unauthorized,
						status: 401,
						message: 'Refresh failed',
					})
				: new ApiError({
						kind: API_ERROR_KIND.server,
						status: result.status,
						message: 'Refresh failed',
					});
			onTerminal();
			throw err;
		} catch (err) {
			if (err instanceof ApiError) {
				onTerminal();
				throw err;
			}
			// Network / abort during refresh — terminal too. The store
			// clear still happens via onTerminal; the caller will see
			// the ApiError.network and decide what to do.
			onTerminal();
			throw new ApiError(
				{ kind: API_ERROR_KIND.network, status: 0, message: 'Network error' },
				err,
			);
		} finally {
			clearRefreshPromise();
		}
	})();

	setRefreshPromise(next);
	return next;
}
