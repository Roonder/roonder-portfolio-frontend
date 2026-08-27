/**
 * Admin projects list route.
 *
 * The loader fetches the admin projects list with `page` + `status`
 * query params from the URL. The page renders the list with filter
 * chips + pagination. REQ-ADM-1, REQ-ADM-5, REQ-ADM-7, REQ-ADM-10.
 *
 * The session gate is in the `admin.tsx` layout loader; this route
 * does NOT add a second gate (REQ-ADM-7).
 */
import { data } from 'react-router';
import type { Route } from './+types/admin.projects._index';

import { getAdminProjects } from '~/admin/projects/api/projects';
import { ApiError, API_ERROR_KIND } from '~/shared/lib/fetch-client/errors';
import AdminProjectsListPage from '~/admin/projects/pages/list';

export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url);
	const page = Number(url.searchParams.get('page') ?? 1);
	const status = url.searchParams.get('status') ?? 'all';

	try {
		const result = await getAdminProjects(request, {
			page: Number.isFinite(page) && page > 0 ? page : 1,
			status: status === 'all' ? undefined : status,
			pageSize: 20,
		});

		const headers = new Headers();
		for (const c of result.setCookies) {
			headers.append('Set-Cookie', c);
		}

		return data(
			{
				projects: result.data.data,
				total: result.data.total,
				page: result.data.page,
				pageSize: result.data.pageSize,
				currentStatus: status === 'all' ? 'all' : status,
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
		{ title: 'Projects — Admin' },
		{ name: 'robots', content: 'noindex, nofollow' },
	];
}

export default function AdminProjectsList({
	loaderData,
}: Route.ComponentProps) {
	return <AdminProjectsListPage {...loaderData} />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	return (
		<section className="flex flex-col gap-4 p-6">
			<h1 className="text-lg font-semibold text-destructive">
				Failed to load projects
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
