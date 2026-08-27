/**
 * `adminProjectSchema` — the canonical zod schema for the admin
 * project form (create + edit).
 *
 * Source of truth for both the client-side form (via `zodResolver`)
 * and the server action's input validation. Mirrors the backend's
 * `CreateProjectDto` / `UpdateProjectDto` per the locked
 * `projects-domain` spec.
 *
 * Fields:
 *  - `title` (1–200 chars)
 *  - `slug` (1–120 chars, lowercase + hyphens only, regex `^[a-z0-9-]+$`)
 *  - `description` (1–500 chars)
 *  - `content` (optional, free-form markdown)
 *  - `coverImage` (optional, URL with http/https protocol)
 *  - `tags` (optional, array of non-empty strings; normalized via
 *    trim + lowercase + dedupe in the transform)
 *  - `isPublished` (boolean, default false)
 *  - `urls` (optional, array of `{ title, url }`; intra-array dedupe
 *    on `url` in the transform)
 *
 * REQ-ADM-4.
 */
import { z } from 'zod';

const SLUG_REGEX = /^[a-z0-9-]+$/;
const URL_REGEX = /^https?:\/\/.+/;

export const projectUrlInputSchema = z.object({
	title: z.string().trim().min(1, 'Title is required'),
	url: z.string().trim().min(1, 'URL is required'),
});

export const adminProjectSchema = z
	.object({
		title: z
			.string()
			.trim()
			.min(1, 'Title is required')
			.max(200, 'Title must be 200 characters or less'),
		slug: z
			.string()
			.trim()
			.min(1, 'Slug is required')
			.max(120, 'Slug must be 120 characters or less')
			.regex(
				SLUG_REGEX,
				'Slug must contain only lowercase letters, numbers, and hyphens',
			),
		description: z
			.string()
			.trim()
			.min(1, 'Description is required')
			.max(500, 'Description must be 500 characters or less'),
		content: z.string().trim().optional().default(''),
		coverImage: z
			.string()
			.trim()
			.optional()
			.default('')
			.refine(
				(val) => val === '' || URL_REGEX.test(val),
				'Cover image must be a valid URL (http or https)',
			),
		tags: z
			.array(z.string().trim().min(1, 'Tag cannot be empty'))
			.optional()
			.default([])
			.transform((tags) =>
				[...new Set(tags.map((t) => t.toLowerCase()).filter(Boolean))],
			),
		isPublished: z.boolean().default(false),
		urls: z
			.array(projectUrlInputSchema)
			.optional()
			.default([])
			.superRefine((urls, ctx) => {
				const seen = new Set<string>();
				for (let i = 0; i < urls.length; i++) {
					const key = urls[i].url.trim().toLowerCase();
					if (seen.has(key)) {
						ctx.addIssue({
							code: z.ZodIssueCode.custom,
							message: 'Duplicate URL',
							path: [i, 'url'],
						});
					}
					seen.add(key);
				}
			}),
	})
	.transform((data) => ({
		...data,
		// Normalize coverImage: empty string → undefined (not sent)
		coverImage: data.coverImage === '' ? undefined : data.coverImage,
		// Normalize content: empty string → undefined
		content: data.content === '' ? undefined : data.content,
	}));

export type AdminProjectValues = z.input<typeof adminProjectSchema>;
export type AdminProjectOutput = z.output<typeof adminProjectSchema>;
