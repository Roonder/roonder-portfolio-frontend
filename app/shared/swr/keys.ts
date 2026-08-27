/**
 * `swrKeys` — the single source of truth for every SWR cache key.
 *
 * Per `DESIGN.md §4` and the locked `http-client` REQ-SWR-2, the SWR
 * key IS the URL string. This registry is the only place cache keys
 * are minted: components import the factory they need, mutators
 * invalidate by the same factory's return value, and the URL
 * transformation rules live in one file.
 *
 * Blocked-on-backend keys: `home.metrics()` and
 * `admin.projects.stats()` are registered here so the call sites
 * can use the same factory as the live endpoint when the backend
 * ships it. Today the consumers use the hardcoded fallback (see
 * `home-domain` REQ-HOME-8 + `admin-projects-domain` REQ-ADM-11)
 * with a TODO comment.
 */

function toQuery(params: Record<string, string | number | boolean | undefined>): string {
	const usp = new URLSearchParams();
	for (const [k, v] of Object.entries(params)) {
		if (v === undefined) continue;
		usp.set(k, String(v));
	}
	const s = usp.toString();
	return s ? `?${s}` : '';
}

export const swrKeys = {
	home: {
		/**
		 * The home loader's three Promise.all keys. Returned as a
		 * tuple for parallel `useSWR` consumption; each tuple entry
		 * is the URL string.
		 */
		featured: () =>
			[
				'/api/v1/projects?pageSize=10',
				'/api/v1/reviews?pageSize=10',
			] as const,
		/**
		 * `GET /api/v1/home/metrics` — BLOCKED-ON-BACKEND.
		 * The backend has no `home-domain` capability today; the
		 * loader uses the hardcoded fallback `{activeWorks: 124, …}`
		 * (REQ-HOME-8). When the backend ships the endpoint, swap
		 * the consumer's fallback for this factory's return value.
		 */
		metrics: () => '/api/v1/home/metrics',
	},
	works: {
		/** Full published list, capped at 100 by the backend. */
		list: () => '/api/v1/projects?isPublished=true&pageSize=100',
		/** Single project by slug (the canonical /works/:slug URL). */
		bySlug: (slug: string) => `/api/v1/projects/${slug}`,
	},
	contact: {
		/**
		 * The action target — NOT a SWR key. Exposed so callers can
		 * import one symbol for the contact-domain contract.
		 * `POST /api/v1/contacts` (PLURAL — locked per
		 * `contact-domain` REQ-CON-3; the singular was the original
		 * proposal drift, resolved).
		 */
		submit: () => '/api/v1/contacts',
	},
	admin: {
		projects: {
			list: (filters?: { page?: number; status?: string }) =>
				`/api/v1/admin/projects${toQuery(filters ?? {})}`,
			byId: (id: string) => `/api/v1/admin/projects/${id}`,
			/**
			 * `GET /api/v1/admin/projects/stats` — BLOCKED-ON-BACKEND.
			 * Same disposition as `home.metrics`; the admin overview
			 * uses the hardcoded fallback `{activeWorks: 24, delta:
			 * "+3 this month"}` (REQ-ADM-11).
			 */
			stats: () => '/api/v1/admin/projects/stats',
		},
		reviews: {
			list: (filters?: { published?: boolean; page?: number }) =>
				`/api/v1/admin/reviews${toQuery(filters ?? {})}`,
		},
		contact: {
			list: (filters?: { unread?: boolean; page?: number }) =>
				`/api/v1/admin/contact${toQuery(filters ?? {})}`,
		},
	},
} as const;
