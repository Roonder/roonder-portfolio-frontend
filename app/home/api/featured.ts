/**
 * `fetchHomeFeatured` — server-side loader for the home page.
 *
 * Runs `Promise.all` over the two real backend endpoints:
 *
 *   - `GET /api/v1/projects?pageSize=10` (the home bento; `total`
 *     also doubles as the "delivered projects" metric — every
 *     published project is assumed finished)
 *   - `GET /api/v1/reviews?pageSize=10`  (the testimonials split)
 *
 * The backend has no `/api/v1/home/metrics` (or any `/metrics`)
 * endpoint, so `activeWorks` / `retainedClients` are NOT fetched —
 * see `HOME_METRICS_MANUAL` below.
 */
import { serverFetch } from '~/shared/lib/fetch-client/server';

import {
	featuredProjectsResponseSchema,
	featuredReviewsResponseSchema,
	type HomeMetrics,
	type Project,
	type Review,
} from '~/home/schema';

export type HomeFeaturedData = {
	featuredProjects: Project[];
	featuredReviews: Review[];
	homeMetrics: HomeMetrics;
};

/**
 * Manually maintained metrics — there is no backend endpoint for
 * these (no `/metrics` route exists on the API). Update these two
 * numbers by hand as they change; `deliveredProjects` is NOT here
 * because it is derived live from the published project count
 * below.
 */
const HOME_METRICS_MANUAL: HomeMetrics = {
	activeWorks: 1,
	retainedClients: 4,
	deliveredProjects: 7
};

export async function fetchHomeFeatured(
	request: Request,
): Promise<HomeFeaturedData> {
	const [projectsResult, reviewsResult] = await Promise.all([
		serverFetch(request, {
			url: '/api/v1/projects?pageSize=10',
			method: 'GET',
			schema: featuredProjectsResponseSchema,
		}),
		serverFetch(request, {
			url: '/api/v1/reviews?pageSize=10',
			method: 'GET',
			schema: featuredReviewsResponseSchema,
		}),
	]);

	const homeMetrics: HomeMetrics = {
		...HOME_METRICS_MANUAL,
		deliveredProjects: projectsResult.data.total + HOME_METRICS_MANUAL.deliveredProjects,
	};

	return {
		featuredProjects: projectsResult.data.data,
		featuredReviews: reviewsResult.data.data,
		homeMetrics,
	};
}
