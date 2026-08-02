/**
 * `loginAction` — the React Router server action for admin login.
 *
 * Called by the login form's `fetcher.submit(values, { method: 'post',
 * action: '/admin/auth' })`. The route at `app/routes/admin.auth.tsx`
 * re-exports this as its `action` so the framework can dispatch it.
 *
 * Flow (per design §4.1):
 *  1. Parse the form's `FormData`, validate with `loginSchema` (the
 *     same schema the client uses — single source of truth).
 *  2. POST credentials via `serverFetch` (which forwards the
 *     incoming `Cookie` header, reads the `access` cookie as the
 *     bearer fallback, and captures the backend's `Set-Cookie`).
 *  3. On 200: redirect to `next` (or `/admin` if missing/invalid)
 *     and forward the new `access` + `rt` cookies on the response
 *     so the browser stores them. `data({}, { headers })` is the
 *     React Router 8 mechanism for this.
 *  4. On 401 / 400 / 5xx: return `data({ error }, { status })` so
 *     the form can pattern-match on `fetcher.data.error`.
 *
 * The action is a separate module from the page so the screaming
 * architecture stays clean: the route file just re-exports both.
 */

import { data, redirect } from 'react-router';

import { safeNext } from '~/shared/lib/fetch-client/get-session';
import { serverFetch } from '~/shared/lib/fetch-client/server';
import { ApiError, API_ERROR_KIND } from '~/shared/lib/fetch-client/errors';
import { authResponseSchema, loginSchema } from '~/admin/auth/schema';

export type LoginActionResult =
	| { ok: true; user: { id: string; email: string } }
	| { ok: false; error: ApiError };

/**
 * React Router 8 server action. Returns either a `redirect()`
 * (success, with the new `access` + `rt` cookies) or a
 * `data({ error }, { status })` envelope (failure, so the form
 * can pattern-match on `fetcher.data.error`). The framework
 * accepts any return value here (the inferred return is the
 * union of both branches).
 */
export async function loginAction({ request }: { request: Request }) {
	const form = await request.formData();
	const parsed = loginSchema.safeParse({
		email: form.get('email'),
		password: form.get('password'),
	});

	if (!parsed.success) {
		return data(
			{
				error: new ApiError({
					kind: API_ERROR_KIND.validation,
					status: 400,
					message: 'Invalid form input',
					fieldErrors: zodFieldErrors(parsed.error),
				}),
			},
			{ status: 400 },
		);
	}

	const url = new URL(request.url);
	const next = safeNext(url.searchParams.get('next'), url.pathname);

	try {
		const result = await serverFetch(request, {
			url: '/api/v1/auth/login',
			method: 'POST',
			body: { email: parsed.data.email, password: parsed.data.password },
			schema: authResponseSchema,
		});

		// Success — redirect to the safe next URL with both new cookies
		// (`access` and `rt`) attached to the outgoing response.
		// `setCookies` is the Set-Cookie array captured by `serverFetch`
		// from the internal backend response. React Router 8 merges
		// these into the child response so the browser stores them.
		const headers = new Headers();
		for (const c of result.setCookies) {
			headers.append('Set-Cookie', c);
		}
		return redirect(next, { headers });
	} catch (err) {
		if (err instanceof ApiError) {
			// Pass through the typed error to the form. The form
			// pattern-matches on `err.kind` to render the right
			// surface (`unauthorized` → "Invalid credentials",
			// `validation` → per-field messages, etc.).
			const status =
				err.kind === API_ERROR_KIND.unauthorized
					? 401
					: err.status && err.status >= 400 && err.status < 600
						? err.status
						: 500;
			return data({ error: err.toJSON() }, { status });
		}
		// Network / unexpected — surface as a server error so the
		// form can show a generic "try again" message.
		const apiErr = new ApiError({
			kind: API_ERROR_KIND.server,
			status: 500,
			message: err instanceof Error ? err.message : 'Login failed',
		});
		return data({ error: apiErr.toJSON() }, { status: 500 });
	}
}

/**
 * Flatten zod's `ZodError` into the per-field `Record<string,
 * string[]>` shape the form layer already understands (matches
 * `ApiError.fieldErrors` from `errors.ts`).
 */
function zodFieldErrors(
	err: import('zod').ZodError,
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
