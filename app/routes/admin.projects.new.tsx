/**
 * Admin new-project route.
 *
 * The action validates the form with `adminProjectSchema` and POSTs
 * to `/api/v1/admin/projects`. On 201, the action invalidates the
 * SWR list key and redirects to the edit page for the new project.
 * REQ-ADM-2.
 */
import { data, redirect } from 'react-router';
import type { Route } from './+types/admin.projects.new';

import { createProjectAction } from '~/admin/projects/api/projects';
import AdminProjectNewPage from '~/admin/projects/pages/new';

export async function action({ request }: Route.ActionArgs) {
	const result = await createProjectAction(request);

	if (!result.ok) {
		return data(
			{ error: result.error },
			{ status: result.error.status >= 400 ? result.error.status : 400 },
		);
	}

	// createProjectAction returns a redirect on success
	return result;
}

export function meta({}: Route.MetaArgs) {
	return [
		{ title: 'New Project — Admin' },
		{ name: 'robots', content: 'noindex, nofollow' },
	];
}

export default function AdminProjectsNew() {
	return <AdminProjectNewPage />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	return (
		<section className="flex flex-col gap-4 p-6">
			<h1 className="text-lg font-semibold text-destructive">
				Failed to create project
			</h1>
			<p className="text-sm text-muted-foreground">
				{error instanceof Error ? error.message : 'Unknown error'}
			</p>
		</section>
	);
}
