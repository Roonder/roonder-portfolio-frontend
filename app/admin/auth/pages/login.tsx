/**
 * Login page — presentational, with `react-hook-form` for state
 * management and a tiny inline zod resolver (the project does not
 * depend on `@hookform/resolvers`).
 *
 * The form posts to the React Router server action at
 * `/admin/auth` (the action itself lives in
 * `~/admin/auth/api/login`). On success, the action
 * `redirect()`s to the `next` URL with the new `access` + `rt`
 * cookies attached. On failure, the action returns
 * `data({ error }, { status })` and the form pattern-matches on
 * `fetcher.data.error.kind` to render the right surface.
 *
 * The form is in English (admin is English-only, locked decision
 * D8) and uses the shadcn `Button` / `Input` / `Label` / `Field`
 * primitives from `app/components/ui/`.
 */

import { useEffect } from 'react';
import { useFetcher, useSearchParams } from 'react-router';
import { useForm, type Resolver } from 'react-hook-form';

import { Button } from '~/components/ui/button';
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from '~/components/ui/field';
import { Input } from '~/components/ui/input';
import { cn } from '~/shared/lib/cn';

import { API_ERROR_KIND, type ApiError } from '~/shared/lib/fetch-client/errors';
import { useSessionStore } from '~/shared/stores/session';
import { loginSchema, type LoginInput } from '~/admin/auth/schema';

type LoginActionError = {
	error: ReturnType<ApiError['toJSON']>;
};

export function meta() {
	return [{ title: 'Sign in — Admin' }];
}

const zodResolver: Resolver<LoginInput> = async (values) => {
	const result = loginSchema.safeParse(values);
	if (result.success) {
		return { values: result.data, errors: {} };
	}
	const errors: Record<string, { type: string; message: string }> = {};
	for (const issue of result.error.issues) {
		const key = issue.path.join('.') || '_';
		if (!errors[key]) {
			errors[key] = { type: issue.code, message: issue.message };
		}
	}
	return {
		values: {} as Record<string, never>,
		errors,
	};
};

export default function LoginPage() {
	const [searchParams] = useSearchParams();
	const next = searchParams.get('next') ?? '';
	const fetcher = useFetcher<LoginActionError>();
	const user = useSessionStore((s) => s.user);

	const isSubmitting = fetcher.state !== 'idle';
	const error = fetcher.data?.error;

	const {
		register,
		handleSubmit,
		formState: { errors },
		setError,
	} = useForm<LoginInput>({
		resolver: zodResolver,
		defaultValues: { email: '', password: '' },
	});

	// Apply server-side field errors (from the action's 400 response
	// or the backend's 400 ValidationPipe) to the form so the same
	// `<FieldError>` surfaces render for both client- and server-side
	// validation. Runs only when the fetcher returns new data.
	useEffect(() => {
		if (!error) return;
		if (error.kind === API_ERROR_KIND.validation && error.fieldErrors) {
			for (const [field, messages] of Object.entries(error.fieldErrors)) {
				if ((field === 'email' || field === 'password') && messages?.length) {
					setError(field, { type: 'server', message: messages[0] });
				}
			}
		}
	}, [error, setError]);

	const onSubmit = handleSubmit((values) => {
		fetcher.submit(values, { method: 'post', action: '/admin/auth' });
	});

	return (
		<main className="flex min-h-svh items-center justify-center bg-background px-4 py-12">
			<form
				method="post"
				action="/admin/auth"
				onSubmit={onSubmit}
				className="w-full max-w-sm space-y-6 rounded-2xl border border-outline-variant/40 bg-surface-container-low p-8 shadow-[0_0_30px_rgba(212,175,55,0.04)]"
				noValidate
			>
				<header className="space-y-1 text-center">
					<h1 className="font-display text-2xl font-semibold tracking-tight text-on-surface">
						Sign in
					</h1>
					<p className="text-sm text-muted-foreground">
						Admin access to the portfolio.
					</p>
				</header>

				<input type="hidden" name="next" value={next} />

				{user ? (
					<FieldGroup>
						<Field>
							<FieldDescription>
								You are already signed in as {user.email}.
							</FieldDescription>
						</Field>
					</FieldGroup>
				) : null}

				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="email">Email</FieldLabel>
						<Input
							id="email"
							type="email"
							autoComplete="email"
							placeholder="you@example.com"
							aria-invalid={errors.email ? true : undefined}
							{...register('email')}
						/>
						<FieldError
							errors={
								errors.email ? [{ message: errors.email.message }] : undefined
							}
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor="password">Password</FieldLabel>
						<Input
							id="password"
							type="password"
							autoComplete="current-password"
							aria-invalid={errors.password ? true : undefined}
							{...register('password')}
						/>
						<FieldError
							errors={
								errors.password
									? [{ message: errors.password.message }]
									: undefined
							}
						/>
					</Field>
				</FieldGroup>

				{error && error.kind !== API_ERROR_KIND.validation ? (
					<FormError error={error} />
				) : null}

				<Button
					type="submit"
					size="lg"
					disabled={isSubmitting}
					className={cn('w-full font-semibold tracking-wide')}
				>
					{isSubmitting ? 'Signing in…' : 'Sign in'}
				</Button>
			</form>
		</main>
	);
}

/**
 * Render a non-validation error above the submit button. The four
 * surfaced kinds (REQ-LOG-4):
 *   - `unauthorized` → "Invalid credentials"
 *   - `throttled`    → "Too many attempts. Try in Ns."
 *   - `network`      → "You appear to be offline."
 *   - everything else → generic "Sign in failed" + the message.
 */
function FormError({ error }: { error: ReturnType<ApiError['toJSON']> }) {
	let title = 'Sign in failed';
	let detail = error.message;

	switch (error.kind) {
		case API_ERROR_KIND.unauthorized:
			title = 'Invalid credentials';
			detail = 'The email or password is incorrect.';
			break;
		case API_ERROR_KIND.throttled:
			title = 'Too many attempts';
			detail =
				typeof error.retryAfter === 'number'
					? `Try again in ${error.retryAfter} seconds.`
					: 'Try again in a moment.';
			break;
		case API_ERROR_KIND.network:
			title = 'You appear to be offline';
			break;
		default:
			break;
	}

	return (
		<div
			role="alert"
			className="border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
		>
			<p className="font-medium text-destructive">{title}</p>
			{title !== detail ? (
				<p className="mt-1 text-muted-foreground">{detail}</p>
			) : null}
		</div>
	);
}
