/**
 * `submitReview` — client-side submit for the home testimonials
 * form.
 *
 * Calls the public `POST /api/v1/reviews` endpoint directly via
 * `clientFetch` (no server action needed: the endpoint is public,
 * unauthenticated, and the submission is a leaf interaction on the
 * home page, not a full page navigation like `/contact`). New
 * reviews persist with `isApproved=false` and only appear once an
 * admin approves them.
 */
import { clientFetch } from '~/shared/lib/fetch-client/client';
import { ApiError } from '~/shared/lib/fetch-client/errors';

import type { CreateReviewValues } from '~/home/schema';

export type SubmitReviewResult =
	| { ok: true }
	| { ok: false; error: ApiError };

export async function submitReview(
	values: CreateReviewValues,
): Promise<SubmitReviewResult> {
	try {
		await clientFetch({
			url: '/api/v1/reviews',
			method: 'POST',
			body: {
				...values,
				authorName: values.authorName || undefined,
				authorRole: values.authorRole || undefined,
			},
		});
		return { ok: true };
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
