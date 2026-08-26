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
 * The backend does NOT yet expose `GET /api/v1/home/metrics`
 * (REQ-HOME-8 BLOCKED-ON-BACKEND). The home loader uses the
 * design-time fallback `{ activeWorks: 124, retainedClients: 48,
 * deliveredProjects: 92 }`; when the backend ships the endpoint,
 * swap the fallback for the live fetch.
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
