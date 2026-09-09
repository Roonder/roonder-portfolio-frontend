import { Outlet } from 'react-router';
import type { Route } from './+types/admin.reviews';

/**
 * Admin reviews sub-layout.
 *
 * This layout scopes domain UI for the Reviews subdomain: list and
 * the action-only detail route. It is mounted under the parent
 * `admin.tsx` layout, so the auth guard already runs before this
 * loader (mirrors `admin.projects.tsx`).
 */
export async function loader({}: Route.LoaderArgs) {
	return null;
}

export function meta({}: Route.MetaArgs) {
	return [
		{ title: 'Reviews — Admin' },
		{ name: 'robots', content: 'noindex, nofollow' },
	];
}

export default function AdminReviewsLayout() {
	return (
		<div className="flex flex-1 flex-col">
			<Outlet />
		</div>
	);
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	return (
		<section className="flex flex-col gap-4 p-6">
			<h1 className="text-lg font-semibold text-destructive">
				Reviews error
			</h1>
			<p className="text-sm text-muted-foreground">
				{error instanceof Error ? error.message : 'Unknown error'}
			</p>
		</section>
	);
}
