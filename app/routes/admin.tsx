import { data, Outlet } from 'react-router';
import type { Route } from './+types/admin';

import { getSession } from '~/shared/lib/fetch-client/get-session';
import { AdminSidebar } from '~/shared/ui/molecules/admin-sidebar';
import { AdminHeader } from '~/shared/ui/molecules/admin-header';
import { MobileTabBar } from '~/shared/ui/molecules/mobile-tab-bar';

/**
 * Admin surface layout.
 *
 * The loader implements the auth gate (REQ-GATE-1..4):
 *  - `/admin/auth` is exempt so the login form is reachable
 *    unauthenticated (REQ-GATE-3).
 *  - For every other admin route, `getSession(request)` reads the
 *    `access` cookie, calls `GET /api/v1/auth/profile` via
 *    `serverFetch`, and returns the user + any `Set-Cookie` the
 *    internal response carried. On 401 (terminal) it throws
 *    `redirect('/admin/auth?next=…')` (REQ-GATE-2).
 *  - The `Set-Cookie` array is forwarded via `data({ user }, {
 *    headers })` so a server-side silent refresh updates the
 *    browser's `rt` (REQ-GATE-4).
 *
 * The layout renders the admin shell: AdminSidebar (desktop) +
 * AdminHeader + Outlet + MobileTabBar (mobile). REQ-ADM-6.
 */
export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url);
	if (url.pathname.startsWith('/admin/auth')) {
		return { authenticated: false as const };
	}

	const session = await getSession(request);

	const headers = new Headers();
	for (const c of session.setCookies) {
		headers.append('Set-Cookie', c);
	}

	return data(
		{ authenticated: true as const, user: session.user },
		{ headers },
	);
}

export function meta({}: Route.MetaArgs) {
	return [
		{ title: 'Admin — Roonder Portfolio' },
		{ name: 'robots', content: 'noindex, nofollow' },
	];
}

export default function AdminLayout({
	loaderData,
}: Route.ComponentProps) {
	const user = loaderData.authenticated ? loaderData.user : null;
	const isAuthRoute = !loaderData.authenticated;

	// Auth routes (login) render without the admin shell
	if (isAuthRoute) {
		return <Outlet />;
	}

	return (
		<div className="flex min-h-svh flex-col bg-background">
			<AdminHeader user={user} />
			<div className="flex flex-1">
				<AdminSidebar />
				<main className="flex-1 overflow-auto px-4 py-6 pb-20 md:px-8 md:pb-6">
					<Outlet />
				</main>
			</div>
			<MobileTabBar />
		</div>
	);
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	return (
		<section className="flex min-h-svh items-center justify-center bg-background p-6">
			<div className="flex flex-col gap-4 rounded-2xl border border-outline-variant/40 bg-surface-container-low p-8">
				<h1 className="text-lg font-semibold text-destructive">
					Admin layout error
				</h1>
				<p className="text-sm text-muted-foreground">
					{error instanceof Error ? error.message : 'Unknown error'}
				</p>
			</div>
		</section>
	);
}
