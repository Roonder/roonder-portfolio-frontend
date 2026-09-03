/**
 * `home` schema — zod schemas for the three home payloads.
 *
 * Mirrors the backend's `projects-domain` and `reviews-domain`
 * shapes (see `../roonder-portfolio-backend/openspec/specs/`) for
 * the fields the home page consumes. The `featured=true` query is
 * a client-side filter the backend applies on the public list.
 */
import { z } from 'zod';

export const projectSchema = z.object({
	id: z.string(),
	title: z.string(),
	slug: z.string(),
	description: z.string(),
	content: z.string().nullable().optional(),
	coverImage: z.string().nullable().optional(),
	tags: z.array(z.string()).default([]),
	hours: z.number().int().nonnegative().optional(),
	isPublished: z.boolean().default(true),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional(),
});

export type Project = z.infer<typeof projectSchema>;

export const reviewSchema = z.object({
	id: z.string(),
	authorName: z.string().default('Anonymous'),
	authorRole: z.string().nullable().optional(),
	content: z.string(),
	rating: z.number().int().min(1).max(5),
	isApproved: z.boolean().default(true),
	createdAt: z.string().optional(),
});

export type Review = z.infer<typeof reviewSchema>;

/**
 * Home metrics — three numbers + labels per the Aurelian design.
 * The backend has no `/metrics` endpoint: `activeWorks` and
 * `retainedClients` are manually maintained constants (see
 * `HOME_METRICS_MANUAL` in `~/home/api/featured`), while
 * `deliveredProjects` is derived live from the published project
 * count.
 */
export const homeMetricsSchema = z.object({
	activeWorks: z.number().int().nonnegative(),
	retainedClients: z.number().int().nonnegative(),
	deliveredProjects: z.number().int().nonnegative(),
});

export type HomeMetrics = z.infer<typeof homeMetricsSchema>;

export const featuredProjectsResponseSchema = z.object({
	data: z.array(projectSchema),
	total: z.number().int().nonnegative(),
	page: z.number().int().positive(),
	pageSize: z.number().int().positive(),
});

export const featuredReviewsResponseSchema = z.object({
	data: z.array(reviewSchema),
	total: z.number().int().nonnegative(),
	page: z.number().int().positive(),
	pageSize: z.number().int().positive(),
});

/**
 * `createReviewSchema` — mirrors the backend's locked
 * `CreateReviewDto` (`POST /api/v1/reviews`, public): `authorName`
 * optional max 100, `authorRole` optional max 120, `content`
 * required 10-2000, `rating` required int 1-5. The backend's
 * `forbidNonWhitelisted` pipe rejects any extra field.
 */
export const createReviewSchema = z.object({
	authorName: z
		.string()
		.trim()
		.max(100, 'home.reviews.form.validation.authorNameMax')
		.optional()
		.or(z.literal('')),
	authorRole: z
		.string()
		.trim()
		.max(120, 'home.reviews.form.validation.authorRoleMax')
		.optional()
		.or(z.literal('')),
	content: z
		.string()
		.trim()
		.min(10, 'home.reviews.form.validation.contentMin')
		.max(2_000, 'home.reviews.form.validation.contentMax'),
	rating: z
		.number()
		.int()
		.min(1, 'home.reviews.form.validation.ratingRequired')
		.max(5, 'home.reviews.form.validation.ratingRequired'),
});

export type CreateReviewValues = z.infer<typeof createReviewSchema>;
