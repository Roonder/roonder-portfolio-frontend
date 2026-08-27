/**
 * Admin overview route (`/admin`).
 *
 * The loader fetches the top 3 recent projects for the overview
 * widget. The Active Works stat uses the hardcoded fallback
 * (REQ-ADM-11 BLOCKED-ON-BACKEND). REQ-ADM-11.
 */
import { data } from 'react-router';
import type { Route } from './+types/admin._index';

import { getAdminProjects } from '~/admin/projects/api/projects';
import { ApiError, API_ERROR_KIND } from '~/shared/lib/fetch-client/errors';
import AdminOverviewPage from '~/admin/projects/pages/overview';

export async function loader({ request }: Route.LoaderArgs) {
	try {
		const result = await getAdminProjects(request, { page: 1, pageSize: 3 });

		const headers = new Headers();
		for (const c of result.setCookies) {
			headers.append('Set-Cookie', c);
		}

		return data(
			{ recentProjects: result.data.data },
			{ headers },
		);
	} catch (err) {
		if (err instanceof ApiError && err.kind === API_ERROR_KIND.unauthorized) {
			throw err;
		}
		// On error, render the overview with an empty recent projects list
		return data({ recentProjects: [] });
	}
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
	return <AdminOverviewPage recentProjects={loaderData.recentProjects} />;
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
