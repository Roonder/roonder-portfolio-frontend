/**
 * `swrFetcher` — thin SWR wrapper over `clientFetch`.
 *
 * The SWR `key` IS the URL (per REQ-SWR-2). Returning `result.data`
 * (not the full `{ status, data, headers }` wrapper) keeps the
 * consumer's `data` field the parsed payload. SWR expects the
 * fetcher to throw on non-2xx; the discriminated `ApiError` from
 * `clientFetch` already does.
 */

import type { z } from 'zod';

import { clientFetch } from '~/shared/lib/fetch-client/client';

export async function swrFetcher<S extends z.ZodType | undefined = undefined>(
	url: string,
): Promise<S extends z.ZodType ? z.infer<S> : unknown> {
	const result = await clientFetch<S>({ url, method: 'GET' });
	return result.data;
}
