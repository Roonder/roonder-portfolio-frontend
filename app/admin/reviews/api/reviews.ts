/**
 * Admin reviews API module.
 *
 * Mirrors `app/admin/projects/api/projects.ts`: every function uses
 * `serverFetch` — loaders AND actions both execute server-side in
 * React Router, so `clientFetch` never worked here (relative URLs
 * throw in Node's `fetch`, and it reads an in-memory client-only
 * zustand store for the access token).
 */
import { mutate } from 'swr';
import { z } from 'zod';

import { serverFetch } from '~/shared/lib/fetch-client/server';
import { ApiError, API_ERROR_KIND } from '~/shared/lib/fetch-client/errors';
import { swrKeys } from '~/shared/swr/keys';

// --- Response schemas -------------------------------------------------------

export const adminReviewSchema = z.object({
	id: z.string(),
	authorName: z.string(),
	authorRole: z.string().nullable(),
	content: z.string(),
	rating: z.number().int().min(1).max(5),
	isApproved: z.boolean(),
	comments: z.array(z.unknown()).default([]),
	createdAt: z.string(),
});

export type AdminReview = z.infer<typeof adminReviewSchema>;

export const adminReviewsListResponseSchema = z.object({
	data: z.array(adminReviewSchema),
	total: z.number().int().nonnegative(),
	page: z.number().int().positive(),
	pageSize: z.number().int().positive(),
});

export type AdminReviewsListResponse = z.infer<
	typeof adminReviewsListResponseSchema
>;

// --- Loader helpers ---------------------------------------------------------

/**
 * Fetch the admin reviews list. Used by the list route's loader.
 * Omitting `isApproved` returns both approved and pending
 * (`ReviewsService.findAllForAdmin`'s default).
 */
export async function getAdminReviews(
	request: Request,
	filters: {
		page?: number;
		pageSize?: number;
		rating?: number;
		isApproved?: boolean;
	},
) {
	const result = await serverFetch(request, {
		url: swrKeys.admin.reviews.list(filters),
		method: 'GET',
		schema: adminReviewsListResponseSchema,
	});
	return { data: result.data, setCookies: result.setCookies };
}

// --- Action helpers ---------------------------------------------------------

type ActionResult =
	| { ok: true; data?: unknown; setCookies?: string[] }
	| { ok: false; error: ReturnType<ApiError['toJSON']> };

/**
 * Toggle a review's approval (idempotent flip — not a one-way
 * "approve"). No request body needed.
 */
export async function toggleReviewApprovalAction(
	request: Request,
	id: string,
): Promise<ActionResult> {
	try {
		const result = await serverFetch(request, {
			url: swrKeys.admin.reviews.approve(id),
			method: 'PATCH',
		});
		await mutate(swrKeys.admin.reviews.list());
		return { ok: true, data: result.data, setCookies: result.setCookies };
	} catch (err) {
		if (err instanceof ApiError) {
			return { ok: false, error: err.toJSON() };
		}
		return {
			ok: false,
			error: new ApiError({
				kind: API_ERROR_KIND.server,
				status: 500,
				message: err instanceof Error ? err.message : 'Approve toggle failed',
			}).toJSON(),
		};
	}
}

/**
 * Delete a review (hard delete, cascades to `review_comments`).
 */
export async function deleteReviewAction(
	request: Request,
	id: string,
): Promise<ActionResult> {
	try {
		const result = await serverFetch(request, {
			url: swrKeys.admin.reviews.delete(id),
			method: 'DELETE',
		});
		await mutate(swrKeys.admin.reviews.list());
		return { ok: true, setCookies: result.setCookies };
	} catch (err) {
		if (err instanceof ApiError) {
			return { ok: false, error: err.toJSON() };
		}
		return {
			ok: false,
			error: new ApiError({
				kind: API_ERROR_KIND.server,
				status: 500,
				message: err instanceof Error ? err.message : 'Delete failed',
			}).toJSON(),
		};
	}
}
