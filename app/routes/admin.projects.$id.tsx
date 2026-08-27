/**
 * Admin edit-project route.
 *
 * The loader fetches the project by `params.id` and pre-populates
 * the form. The action supports PATCH (save) and DELETE (via the
 * `_method` discriminator in FormData). REQ-ADM-3, REQ-ADM-5.
 *
 * On PATCH 200: invalidate both SWR keys, redirect to `/admin/projects`.
 * On DELETE 204: invalidate the list SWR key, redirect to `/admin/projects`.
 * On 404: render the "Project not found" UI via ErrorBoundary.
 */
import { data, redirect } from 'react-router';
import type { Route } from './+types/admin.projects.$id';

import {
	getAdminProjectById,
	updateProjectAction,
	deleteProjectAction,
} from '~/admin/projects/api/projects';
import { ApiError, API_ERROR_KIND } from '~/shared/lib/fetch-client/errors';
import AdminProjectEditPage from '~/admin/projects/pages/edit';

export async function loader({ request, params }: Route.LoaderArgs) {
	const { id } = params;
	if (!id) throw redirect('/admin/projects');

	try {
		const result = await getAdminProjectById(request, id);

		const headers = new Headers();
		for (const c of result.setCookies) {
			headers.append('Set-Cookie', c);
		}

		return data({ project: result.data }, { headers });
	} catch (err) {
		if (err instanceof ApiError && err.kind === API_ERROR_KIND.notFound) {
			throw data('Project not found', { status: 404 });
		}
		throw err;
	}
}

export async function action({ request, params }: Route.ActionArgs) {
	const { id } = params;
	if (!id) return data({ error: 'Missing project id' }, { status: 400 });

	const form = await request.formData();
	const method = form.get('_method');

	if (method === 'DELETE') {
		const result = await deleteProjectAction(request, id);
		if (!result.ok) {
			return data({ error: result.error }, { status: result.error.status });
		}
		return redirect('/admin/projects');
	}

	// Default: PATCH (update)
	const result = await updateProjectAction(request, id);
	if (!result.ok) {
		return data(
			{ error: result.error },
			{ status: result.error.status >= 400 ? result.error.status : 400 },
		);
	}
	return redirect('/admin/projects');
}

export function meta({}: Route.MetaArgs) {
	return [
		{ title: 'Edit Project — Admin' },
		{ name: 'robots', content: 'noindex, nofollow' },
	];
}

export default function AdminProjectsEdit({
	loaderData,
}: Route.ComponentProps) {
	return <AdminProjectEditPage project={loaderData.project} />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	const isNotFound =
		typeof error === 'string' && error.includes('not found');

	return (
		<section className="flex flex-col gap-4 p-6">
			<h1 className="text-lg font-semibold text-destructive">
				{isNotFound ? 'Project not found' : 'Failed to load project'}
			</h1>
			<p className="text-sm text-muted-foreground">
				{error instanceof Error ? error.message : String(error)}
			</p>
		</section>
	);
}
