/**
 * Admin projects API module.
 *
 * Contains the loader helpers and action functions for the admin
 * projects subdomain (list, new, edit, delete). Each function
 * uses `serverFetch` (loader context) or `clientFetch` (action
 * context) from the locked `http-client` spec.
 *
 * REQ-ADM-1, REQ-ADM-2, REQ-ADM-3, REQ-ADM-5.
 */
import { redirect } from 'react-router';
import { mutate } from 'swr';
import { z } from 'zod';

import { serverFetch } from '~/shared/lib/fetch-client/server';
import { clientFetch } from '~/shared/lib/fetch-client/client';
import { ApiError, API_ERROR_KIND } from '~/shared/lib/fetch-client/errors';
import { swrKeys } from '~/shared/swr/keys';
import { projectSchema } from '~/home/schema';
import { adminProjectSchema } from '~/admin/projects/schema';

// --- Response schemas -------------------------------------------------------

export const adminProjectSchema_ = projectSchema.extend({
	content: z.string().nullable().optional(),
	urls: z
		.array(z.object({ id: z.string().optional(), title: z.string(), url: z.string() }))
		.default([]),
});

export type AdminProject = z.infer<typeof adminProjectSchema_>;

export const adminProjectsListResponseSchema = z.object({
	data: z.array(adminProjectSchema_),
	total: z.number().int().nonnegative(),
	page: z.number().int().positive(),
	pageSize: z.number().int().positive(),
});

export type AdminProjectsListResponse = z.infer<typeof adminProjectsListResponseSchema>;

// --- Loader helpers ---------------------------------------------------------

/**
 * Fetch the admin projects list. Used by the list route's loader.
 * REQ-ADM-1.
 */
export async function getAdminProjects(
	request: Request,
	filters: { page?: number; status?: string; pageSize?: number },
) {
	const result = await serverFetch(request, {
		url: swrKeys.admin.projects.list(filters),
		method: 'GET',
		schema: adminProjectsListResponseSchema,
	});
	return { data: result.data, setCookies: result.setCookies };
}

/**
 * Fetch a single admin project by id. Used by the edit route's loader.
 * REQ-ADM-3.
 */
export async function getAdminProjectById(request: Request, id: string) {
	const result = await serverFetch(request, {
		url: swrKeys.admin.projects.byId(id),
		method: 'GET',
		schema: adminProjectSchema_,
	});
	return { data: result.data, setCookies: result.setCookies };
}

// --- Action helpers ---------------------------------------------------------

type ActionResult =
	| { ok: true; data?: unknown }
	| { ok: false; error: ReturnType<ApiError['toJSON']> };

/**
 * Create a new project. REQ-ADM-2.
 *
 * On 201: invalidate the list SWR key and redirect to the edit page.
 * On 409: return the conflict error (duplicate slug).
 * On 400: return the validation error (per-field).
 */
export async function createProjectAction(request: Request): Promise<ActionResult> {
	const form = await request.formData();
	const parsed = parseProjectForm(form);

	if (!parsed.success) {
		return {
			ok: false,
			error: new ApiError({
				kind: API_ERROR_KIND.validation,
				status: 400,
				message: 'Invalid form input',
				fieldErrors: zodFieldErrors(parsed.error),
			}).toJSON(),
		};
	}

	try {
		const result = await clientFetch({
			url: swrKeys.admin.projects.list(),
			method: 'POST',
			body: parsed.data,
		});
		const data = result.data as { id: string };
		await mutate(swrKeys.admin.projects.list());
		return redirect(`/admin/projects/${data.id}`) as unknown as ActionResult;
	} catch (err) {
		if (err instanceof ApiError) {
			return { ok: false, error: err.toJSON() };
		}
		return {
			ok: false,
			error: new ApiError({
				kind: API_ERROR_KIND.server,
				status: 500,
				message: err instanceof Error ? err.message : 'Create failed',
			}).toJSON(),
		};
	}
}

/**
 * Update an existing project. REQ-ADM-3.
 *
 * On 200: invalidate both the list and the item SWR keys.
 * On 404: return the not-found error.
 * On 409: return the conflict error (duplicate slug).
 */
export async function updateProjectAction(
	request: Request,
	id: string,
): Promise<ActionResult> {
	const form = await request.formData();
	const parsed = parseProjectForm(form);

	if (!parsed.success) {
		return {
			ok: false,
			error: new ApiError({
				kind: API_ERROR_KIND.validation,
				status: 400,
				message: 'Invalid form input',
				fieldErrors: zodFieldErrors(parsed.error),
			}).toJSON(),
		};
	}

	try {
		await clientFetch({
			url: swrKeys.admin.projects.byId(id),
			method: 'PATCH',
			body: parsed.data,
		});
		await mutate(swrKeys.admin.projects.list());
		await mutate(swrKeys.admin.projects.byId(id));
		return { ok: true };
	} catch (err) {
		if (err instanceof ApiError) {
			return { ok: false, error: err.toJSON() };
		}
		return {
			ok: false,
			error: new ApiError({
				kind: API_ERROR_KIND.server,
				status: 500,
				message: err instanceof Error ? err.message : 'Update failed',
			}).toJSON(),
		};
	}
}

/**
 * Delete a project. REQ-ADM-3.
 *
 * On 204: invalidate the list SWR key.
 */
export async function deleteProjectAction(
	_request: Request,
	id: string,
): Promise<ActionResult> {
	try {
		await clientFetch({
			url: swrKeys.admin.projects.byId(id),
			method: 'DELETE',
		});
		await mutate(swrKeys.admin.projects.list());
		return { ok: true };
	} catch (err) {
		if (err instanceof ApiError) {
			return { ok: false, error: err.toJSON() };
		}
		return {
			ok: false,
			error: new ApiError({
				kind: API_ERROR_KIND.server,
				status: 500,
				message: err instanceof Error ? err.message : 'Delete failed',
			}).toJSON(),
		};
	}
}

// --- Internal helpers -------------------------------------------------------

/**
 * Parse the FormData from the admin project form into the schema
 * input shape. The form serializes tags as a comma-separated string
 * and urls as a JSON string.
 */
function parseProjectForm(form: FormData) {
	const tagsRaw = form.get('tags');
	const urlsRaw = form.get('urls');

	const tags =
		typeof tagsRaw === 'string' && tagsRaw.trim()
			? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
			: [];

	let urls: { title: string; url: string }[] = [];
	if (typeof urlsRaw === 'string' && urlsRaw.trim()) {
		try {
			urls = JSON.parse(urlsRaw);
		} catch {
			// Invalid JSON — let the schema catch it
		}
	}

	return adminProjectSchema.safeParse({
		title: form.get('title'),
		slug: form.get('slug'),
		description: form.get('description'),
		content: form.get('content') ?? '',
		coverImage: form.get('coverImage') ?? '',
		tags,
		isPublished: form.get('isPublished') === 'true',
		urls,
	});
}

function zodFieldErrors(
	err: z.ZodError,
): Record<string, string[]> {
	const out: Record<string, string[]> = {};
	for (const issue of err.issues) {
		const key = issue.path.join('.') || '_';
		const existing = out[key];
		if (existing) existing.push(issue.message);
		else out[key] = [issue.message];
	}
	return out;
}
