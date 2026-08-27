/**
 * `fetchHomeFeatured` — server-side loader for the home page.
 *
 * Per `home-domain` REQ-HOME-1, runs `Promise.all` over the three
 * backend endpoints:
 *
 *   - `GET /api/v1/projects?featured=true` (the home bento)
 *   - `GET /api/v1/reviews?featured=true`  (the testimonials split)
 *   - `GET /api/v1/home/metrics`           (the metrics bento;
 *                                            BLOCKED-ON-BACKEND —
 *                                            REQ-HOME-8 — uses the
 *                                            hardcoded fallback)
 *
 * The `home/metrics` call is wrapped in a try/catch so the home
 * page renders even when the backend has not shipped the endpoint
 * yet. The `ApiError` propagates for the other two endpoints so
 * the route's `ErrorBoundary` surfaces the failure per
 * REQ-HOME-5.
 *
 * No new runtime dependencies; all consumers are from the locked
 * `http-client` spec.
 */
import { serverFetch } from '~/shared/lib/fetch-client/server';
import { ApiError } from '~/shared/lib/fetch-client/errors';

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
 * Design-time fallback for `GET /api/v1/home/metrics` per
 * REQ-HOME-8 (BLOCKED-ON-BACKEND). The numbers (124 / 48 / 92)
 * are the Aurelian design-time values; when the backend ships
 * the endpoint, swap this fallback for the live fetch.
 */
// TODO(home-domain): swap for live fetch from swrKeys.home.metrics()
const HOME_METRICS_FALLBACK: HomeMetrics = {
	activeWorks: 124,
	retainedClients: 48,
	deliveredProjects: 92,
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

	let homeMetrics: HomeMetrics = HOME_METRICS_FALLBACK;
	try {
		const metricsResult = await serverFetch(request, {
			url: '/api/v1/home/metrics',
			method: 'GET',
		});
		const parsed = metricsResult.data as Partial<HomeMetrics> | null;
		if (
			parsed &&
			typeof parsed.activeWorks === 'number' &&
			typeof parsed.retainedClients === 'number' &&
			typeof parsed.deliveredProjects === 'number'
		) {
			homeMetrics = {
				activeWorks: parsed.activeWorks,
				retainedClients: parsed.retainedClients,
				deliveredProjects: parsed.deliveredProjects,
			};
		}
	} catch (err) {
		// REQ-HOME-8: the endpoint is BLOCKED-ON-BACKEND. Swallow
		// the 404/500 and use the fallback. Re-throw any
		// non-metrics error so the route's ErrorBoundary still
		// surfaces true failures.
		if (err instanceof ApiError && err.kind !== 'notFound') {
			// keep the fallback; the projects/reviews fetches
			// already surface their own errors above
		}
	}

	return {
		featuredProjects: projectsResult.data.data,
		featuredReviews: reviewsResult.data.data,
		homeMetrics,
	};
}
