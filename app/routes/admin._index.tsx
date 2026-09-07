/**
 * Admin overview route (`/administration-panel`).
 *
 * The loader fetches the top 3 recent projects plus the aggregate
 * stats (`GET /api/v1/admin/stats`) for the overview widget.
 */
import { data } from 'react-router';
import type { Route } from './+types/admin._index';

import { getAdminProjects, getAdminStats } from '~/admin/projects/api/projects';
import { ApiError, API_ERROR_KIND } from '~/shared/lib/fetch-client/errors';
import AdminOverviewPage from '~/admin/projects/pages/overview';

const STATS_FALLBACK = {
	activeWorks: 0,
	activeWorksThisMonth: 0,
	reviewsPending: 0,
	inboxPending: 0,
};

export async function loader({ request }: Route.LoaderArgs) {
	const headers = new Headers();

	let recentProjects: Awaited<ReturnType<typeof getAdminProjects>>['data']['data'] = [];
	try {
		const result = await getAdminProjects(request, { page: 1, pageSize: 3 });
		for (const c of result.setCookies) headers.append('Set-Cookie', c);
		recentProjects = result.data.data;
	} catch (err) {
		if (err instanceof ApiError && err.kind === API_ERROR_KIND.unauthorized) {
			throw err;
		}
		// On error, render the overview with an empty recent projects list
	}

	let stats = STATS_FALLBACK;
	try {
		const result = await getAdminStats(request);
		for (const c of result.setCookies) headers.append('Set-Cookie', c);
		stats = result.data;
	} catch (err) {
		if (err instanceof ApiError && err.kind === API_ERROR_KIND.unauthorized) {
			throw err;
		}
		// On error, render the overview with the zeroed fallback
	}

	return data({ recentProjects, stats }, { headers });
}

export function meta({}: Route.MetaArgs) {
	return [
		{ title: 'Dashboard — Admin' },
		{ name: 'robots', content: 'noindex, nofollow' },
	];
}

export default function AdminDashboard({
	loaderData,
}: Route.ComponentProps) {
	return (
		<AdminOverviewPage
			recentProjects={loaderData.recentProjects}
			stats={loaderData.stats}
		/>
	);
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	return (
		<section className="flex flex-col gap-4 p-6">
			<h1 className="text-lg font-semibold text-destructive">
				Failed to load dashboard
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
