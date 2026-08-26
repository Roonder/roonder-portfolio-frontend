/**
 * `works` schema — zod schemas for the public works catalog and
 * detail payloads. Mirrors the backend's `projects-domain` spec
 * (`GET /api/v1/projects?isPublished=true&pageSize=100` and
 * `GET /api/v1/projects/:slug`).
 */
import { z } from 'zod';

import { projectSchema, type Project } from '~/home/schema';

export { projectSchema, type Project };

export const projectUrlSchema = z.object({
	id: z.string().optional(),
	title: z.string(),
	url: z.string().url(),
});

export const projectDetailSchema = projectSchema.extend({
	content: z.string().nullable().optional(),
	urls: z.array(projectUrlSchema).default([]),
});

export type ProjectUrl = z.infer<typeof projectUrlSchema>;
export type ProjectDetail = z.infer<typeof projectDetailSchema>;

export const projectsListResponseSchema = z.object({
	data: z.array(projectSchema),
	total: z.number().int().nonnegative(),
	page: z.number().int().positive(),
	pageSize: z.number().int().positive(),
});

export type ProjectsListResponse = z.infer<typeof projectsListResponseSchema>;

export type Category =
	| 'all'
	| 'architecture'
	| 'fintech'
	| 'data'
	| 'web'
	| 'editorial'
	| 'brand';

export const CATEGORIES: Category[] = [
	'all',
	'architecture',
	'fintech',
	'data',
	'web',
	'editorial',
	'brand',
];
