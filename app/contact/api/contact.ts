/**
 * `submitContact` — server-side submit for the contact form.
 *
 * Calls the locked `POST /api/v1/contacts` endpoint (PLURAL per
 * backend `domain-contact` spec) through `serverFetch`. The
 * function returns the discriminated `ActionResult` shape that
 * the `ContactForm` molecule consumes:
 *
 *   - `{ ok: true }` on 201
 *   - `{ ok: false, error: ApiError }` on any non-2xx
 *
 * The form layer pattern-matches on `error.kind` per the locked
 * `http-client` REQ-CORE-2 contract. We do NOT throw — the
 * `action` is the orchestration point; the form reads
 * `fetcher.data?.error` directly.
 *
 * The function runs in a React Router action context so `request`
 * carries the incoming headers (cookie + signal). The contact
 * endpoint is public, so no Authorization header is sent.
 */
import { serverFetch } from '~/shared/lib/fetch-client/server';
import { ApiError } from '~/shared/lib/fetch-client/errors';

import type { ContactFormValues } from '~/contact/schema';

export type SubmitContactResult =
	| { ok: true }
	| { ok: false; error: ApiError };

export async function submitContact(
	request: Request,
	values: ContactFormValues,
): Promise<SubmitContactResult> {
	try {
		const result = await serverFetch(request, {
			url: '/api/v1/contacts',
			method: 'POST',
			body: values,
		});
		if (result.status >= 200 && result.status < 300) {
			return { ok: true };
		}
		// Non-2xx that `serverFetch` did not throw on (defensive):
		// surface as a generic `server` ApiError so the form can
		// pattern-match on `kind`.
		return {
			ok: false,
			error: new ApiError({
				kind: 'server',
				status: result.status,
				message: 'Unexpected response',
			}),
		};
	} catch (err) {
		if (err instanceof ApiError) {
			return { ok: false, error: err };
		}
		return {
			ok: false,
			error: new ApiError({
				kind: 'network',
				status: 0,
				message: 'Network error',
			}),
		};
	}
}
