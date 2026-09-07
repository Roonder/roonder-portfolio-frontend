/**
 * Admin review mutation route — ACTION ONLY.
 *
 * There is no single-review GET-by-id endpoint on the backend, so
 * this route has no meaningful loader UI: a GET redirects to the
 * list. The list page's fetchers POST here with a `_method`
 * override (`PATCH` for approve-toggle, `DELETE` for delete) —
 * mirrors `admin.projects.$id.tsx`'s mutation pattern, minus the
 * edit-page GET.
 *
 * Both mutations return plain JSON (no redirect): the list page's
 * `useFetcher` calls stay on `/administration-panel/reviews` and
 * React Router revalidates the list loader automatically.
 */
import { data, redirect } from 'react-router';
import type { Route } from './+types/admin.reviews.$id';

import {
	toggleReviewApprovalAction,
	deleteReviewAction,
} from '~/admin/reviews/api/reviews';

export async function loader({}: Route.LoaderArgs) {
	throw redirect('/administration-panel/reviews');
}

export async function action({ request, params }: Route.ActionArgs) {
	const { id } = params;
	if (!id) return data({ ok: false, error: { message: 'Missing review id' } }, { status: 400 });

	// Peek at `_method` via a clone — the action helpers each read the
	// ORIGINAL request's body themselves, and a `Request` body can
	// only be consumed once.
	const form = await request.clone().formData();
	const method = form.get('_method');

	if (method === 'DELETE') {
		const result = await deleteReviewAction(request, id);
		const headers = new Headers();
		if (result.ok) {
			for (const c of result.setCookies ?? []) headers.append('Set-Cookie', c);
			return data(result, { headers });
		}
		return data(result, { status: result.error.status, headers });
	}

	// Default: PATCH (toggle approval)
	const result = await toggleReviewApprovalAction(request, id);
	const headers = new Headers();
	if (result.ok) {
		for (const c of result.setCookies ?? []) headers.append('Set-Cookie', c);
		return data(result, { headers });
	}
	return data(result, {
		status: result.error.status >= 400 ? result.error.status : 400,
		headers,
	});
}

export function meta({}: Route.MetaArgs) {
	return [{ title: 'Review — Admin' }];
}
