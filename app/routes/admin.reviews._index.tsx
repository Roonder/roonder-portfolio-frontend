/**
 * Admin reviews list route.
 *
 * The loader fetches the admin reviews list with `page` + `status`
 * query params from the URL, mapping `status` ('pending' | 'approved'
 * | undefined) to the backend's `isApproved` filter. Mirrors
 * `admin.projects._index.tsx`.
 *
 * The session gate is in the `admin.tsx` layout loader; this route
 * does NOT add a second gate.
 */
import { data } from 'react-router';
import type { Route } from './+types/admin.reviews._index';

import { getAdminReviews } from '~/admin/reviews/api/reviews';
import { ApiError, API_ERROR_KIND } from '~/shared/lib/fetch-client/errors';
import AdminReviewsListPage from '~/admin/reviews/pages/list';

export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url);
	const page = Number(url.searchParams.get('page') ?? 1);
	const statusParam = url.searchParams.get('status') ?? 'all';
	const status: 'all' | 'pending' | 'approved' =
		statusParam === 'pending' || statusParam === 'approved' ? statusParam : 'all';
	const isApproved =
		status === 'approved' ? true : status === 'pending' ? false : undefined;

	try {
		const result = await getAdminReviews(request, {
			page: Number.isFinite(page) && page > 0 ? page : 1,
			pageSize: 20,
			isApproved,
		});

		const headers = new Headers();
		for (const c of result.setCookies) {
			headers.append('Set-Cookie', c);
		}

		return data(
			{
				reviews: result.data.data,
				total: result.data.total,
				page: result.data.page,
				pageSize: result.data.pageSize,
				currentStatus: status,
			},
			{ headers },
		);
	} catch (err) {
		if (err instanceof ApiError && err.kind === API_ERROR_KIND.unauthorized) {
			throw err;
		}
		throw err;
	}
}

export function meta({}: Route.MetaArgs) {
	return [
		{ title: 'Reviews — Admin' },
		{ name: 'robots', content: 'noindex, nofollow' },
	];
}

export default function AdminReviewsList({
	loaderData,
}: Route.ComponentProps) {
	return <AdminReviewsListPage {...loaderData} />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	return (
		<section className="flex flex-col gap-4 p-6">
			<h1 className="text-lg font-semibold text-destructive">
				Failed to load reviews
			</h1>
			<p className="text-sm text-muted-foreground">
				{error instanceof Error ? error.message : 'Unknown error'}
			</p>
			<button
				type="button"
				onClick={() => window.location.reload()}
				className="self-start rounded-none border border-primary/50 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
			>
				Retry
			</button>
		</section>
	);
}
