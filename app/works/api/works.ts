/**
 * `works` api — server-side loaders for the public catalog and
 * detail pages.
 *
 * - `fetchWorksList` calls `GET /api/v1/projects?isPublished=true&pageSize=100`
 *   (REQ-WORKS-1). The catalog fetches the full list ONCE; client-side
 *   filter + pagination per REQ-WORKS-2.
 * - `fetchWorkBySlug` calls `GET /api/v1/projects/:slug` (REQ-WORKS-5).
 *   A 404 is returned as `null` so the loader can throw a typed
 *   `Response` (404) that the route's `ErrorBoundary` renders.
 */
import { serverFetch } from '~/shared/lib/fetch-client/server';
import { ApiError } from '~/shared/lib/fetch-client/errors';

import {
	projectsListResponseSchema,
	projectDetailSchema,
	type Project,
	type ProjectDetail,
} from '~/works/schema';

export type WorksListResult = {
	projects: Project[];
	total: number;
};

export async function fetchWorksList(
	request: Request,
): Promise<WorksListResult> {
	const result = await serverFetch(request, {
		url: '/api/v1/projects?isPublished=true&pageSize=100',
		method: 'GET',
		schema: projectsListResponseSchema,
	});
	return { projects: result.data.data, total: result.data.total };
}

export type FetchWorkBySlugResult =
	| { ok: true; project: ProjectDetail }
	| { ok: false; notFound: true };

export async function fetchWorkBySlug(
	request: Request,
	slug: string,
): Promise<FetchWorkBySlugResult> {
	try {
		const result = await serverFetch(request, {
			url: `/api/v1/projects/${encodeURIComponent(slug)}`,
			method: 'GET',
			schema: projectDetailSchema,
		});
		return { ok: true, project: result.data };
	} catch (err) {
		if (err instanceof ApiError && err.kind === 'notFound') {
			return { ok: false, notFound: true };
		}
		throw err;
	}
}
