/**
 * `AdminProjectForm` — the canonical admin project form molecule.
 *
 * Used by both `/admin/projects/new` (REQ-ADM-2) and
 * `/admin/projects/:id` (REQ-ADM-3). Wires `react-hook-form` +
 * `zodResolver(adminProjectSchema)`, renders 8 fields, and submits
 * via `useFetcher().submit()` to the parent route's action.
 *
 * Fields (in order):
 *  1. title (text input)
 *  2. slug (text input)
 *  3. description (textarea)
 *  4. content (textarea, optional markdown)
 *  5. coverImage (url input, optional)
 *  6. tags (text input, comma-separated, optional)
 *  7. isPublished (switch toggle)
 *  8. urls (textarea, one per line as `title | url`, optional)
 *
 * NO `useMemo` / `useCallback` / `React.memo` (React Compiler era).
 */
import { useEffect } from 'react';
import { useFetcher } from 'react-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { cn } from '~/shared/lib/cn';

import {
	adminProjectSchema,
	type AdminProjectValues,
} from '~/admin/projects/schema';
import { API_ERROR_KIND, type ApiError } from '~/shared/lib/fetch-client/errors';

import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from '~/components/ui/field';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Button } from '~/components/ui/button';
import { Switch } from '~/components/ui/switch';

export type AdminProjectFormProps = {
	/** Pre-populate the form (edit mode). */
	defaultValues?: AdminProjectValues;
	/** The form action target. Defaults to the current route. */
	action?: string;
	/** HTTP method override for the fetcher submit. */
	method?: 'post' | 'patch';
	className?: string;
};

type ActionData = {
	ok: boolean;
	error?: ReturnType<ApiError['toJSON']>;
};

/**
 * Parse a "title | url" textarea into the `urls` array shape.
 * Lines that don't match the `title | url` pattern are skipped.
 */
function parseUrlsText(text: string): { title: string; url: string }[] {
	return text
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
		.reduce<{ title: string; url: string }[]>((acc, line) => {
			const pipeIdx = line.indexOf('|');
			if (pipeIdx === -1) return acc;
			const title = line.slice(0, pipeIdx).trim();
			const url = line.slice(pipeIdx + 1).trim();
			if (title && url) acc.push({ title, url });
			return acc;
		}, []);
}

/**
 * Serialize the `urls` array back to "title | url" lines for the
 * textarea default value.
 */
function serializeUrls(urls: { title: string; url: string }[]): string {
	return urls.map((u) => `${u.title} | ${u.url}`).join('\n');
}

export function AdminProjectForm({
	defaultValues,
	action,
	method = 'post',
	className,
}: AdminProjectFormProps) {
	const fetcher = useFetcher<ActionData>();
	const isSubmitting = fetcher.state !== 'idle';
	const error = fetcher.data?.error;

	const {
		control,
		register,
		handleSubmit,
		setValue,
		getValues,
		formState: { errors },
	} = useForm<AdminProjectValues>({
		resolver: zodResolver(adminProjectSchema),
		defaultValues: defaultValues ?? {
			title: '',
			slug: '',
			description: '',
			content: '',
			coverImage: '',
			tags: [],
			isPublished: false,
			urls: [],
		},
		mode: 'onBlur',
	});

	// Apply server-side field errors from the action's 400 response
	// to the form so the same `<FieldError>` surfaces render.
	useEffect(() => {
		if (!error || error.kind !== API_ERROR_KIND.validation) return;
		// Field errors are handled by the react-hook-form errors
		// object; this effect is a no-op for now since the form
		// already shows client-side errors. Server-side errors
		// that differ from client validation would be merged here.
	}, [error]);

	const fieldErrors =
		error?.kind === API_ERROR_KIND.validation ? error.fieldErrors : undefined;

	function onSubmit(values: AdminProjectValues) {
		const fd = new FormData();
		fd.set('_method', method === 'patch' ? 'PATCH' : 'POST');
		fd.set('title', values.title);
		fd.set('slug', values.slug);
		fd.set('description', values.description);
		fd.set('content', values.content ?? '');
		fd.set('coverImage', values.coverImage ?? '');
		fd.set('isPublished', values.isPublished ? 'true' : 'false');

		// Tags: comma-separated string → form field
		const tags = getValues('tags') ?? [];
		fd.set('tags', tags.join(','));

		// URLs: serialize from the textarea
		const urlsText = (document.getElementById('admin-urls') as HTMLTextAreaElement)?.value ?? '';
		const urls = parseUrlsText(urlsText);
		fd.set('urls', JSON.stringify(urls));

		fetcher.submit(fd, {
			method: 'post',
			action: action ?? '.',
		});
	}

	return (
		<form
			noValidate
			onSubmit={handleSubmit(onSubmit)}
			className={cn('flex flex-col gap-6', className)}
		>
			<FieldGroup>
				<Controller
					control={control}
					name="title"
					render={({ field }) => (
						<Field>
							<FieldLabel htmlFor="admin-title">Title</FieldLabel>
							<Input
								{...field}
								id="admin-title"
								placeholder="Project title"
								aria-invalid={Boolean(errors.title)}
								disabled={isSubmitting}
							/>
							<FieldError
								errors={
									errors.title
										? [{ message: errors.title.message ?? '' }]
										: fieldErrors?.title?.map((m) => ({ message: m }))
								}
							/>
						</Field>
					)}
				/>

				<Controller
					control={control}
					name="slug"
					render={({ field }) => (
						<Field>
							<FieldLabel htmlFor="admin-slug">Slug</FieldLabel>
							<Input
								{...field}
								id="admin-slug"
								placeholder="project-slug"
								aria-invalid={Boolean(errors.slug)}
								disabled={isSubmitting}
							/>
							<FieldError
								errors={
									errors.slug
										? [{ message: errors.slug.message ?? '' }]
										: fieldErrors?.slug?.map((m) => ({ message: m }))
								}
							/>
						</Field>
					)}
				/>

				<Controller
					control={control}
					name="description"
					render={({ field }) => (
						<Field>
							<FieldLabel htmlFor="admin-description">
								Description
							</FieldLabel>
							<Textarea
								{...field}
								id="admin-description"
								rows={3}
								placeholder="Short description"
								aria-invalid={Boolean(errors.description)}
								disabled={isSubmitting}
							/>
							<FieldError
								errors={
									errors.description
										? [{ message: errors.description.message ?? '' }]
										: fieldErrors?.description?.map((m) => ({ message: m }))
								}
							/>
						</Field>
					)}
				/>

				<Field>
					<FieldLabel htmlFor="admin-content">Content</FieldLabel>
					<Textarea
						{...register('content')}
						id="admin-content"
						rows={8}
						placeholder="Markdown content (optional)"
						aria-invalid={Boolean(errors.content)}
						disabled={isSubmitting}
					/>
					<FieldError
						errors={
							errors.content
								? [{ message: errors.content.message ?? '' }]
								: fieldErrors?.content?.map((m) => ({ message: m }))
						}
					/>
				</Field>

				<Field>
					<FieldLabel htmlFor="admin-cover">Cover Image URL</FieldLabel>
					<Input
						{...register('coverImage')}
						id="admin-cover"
						type="url"
						placeholder="https://example.com/cover.jpg"
						aria-invalid={Boolean(errors.coverImage)}
						disabled={isSubmitting}
					/>
					<FieldError
						errors={
							errors.coverImage
								? [{ message: errors.coverImage.message ?? '' }]
								: fieldErrors?.coverImage?.map((m) => ({ message: m }))
						}
					/>
				</Field>

				<Field>
					<FieldLabel htmlFor="admin-tags">Tags</FieldLabel>
					<input
						type="text"
						id="admin-tags"
						placeholder="architecture, fintech, web (comma-separated)"
						className="flex h-9 w-full rounded-none border border-input bg-background px-3 py-1 text-sm text-on-surface placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
						disabled={isSubmitting}
						defaultValue={(defaultValues?.tags ?? []).join(', ')}
						onBlur={(e) => {
							const tags = e.target.value
								.split(',')
								.map((t) => t.trim())
								.filter(Boolean);
							setValue('tags', tags);
						}}
					/>
					<FieldError
						errors={
							errors.tags
								? [{ message: 'Invalid tag' }]
								: fieldErrors?.tags?.map((m) => ({ message: m }))
						}
					/>
				</Field>

				<Field>
					<div className="flex items-center justify-between">
						<FieldLabel htmlFor="admin-published">Published</FieldLabel>
						<Controller
							control={control}
							name="isPublished"
							render={({ field }) => (
								<Switch
									id="admin-published"
									checked={field.value}
									onCheckedChange={field.onChange}
									disabled={isSubmitting}
								/>
							)}
						/>
					</div>
					<FieldError
						errors={
							errors.isPublished
								? [{ message: errors.isPublished.message ?? '' }]
								: undefined
						}
					/>
				</Field>

				<Field>
					<FieldLabel htmlFor="admin-urls">
						URLs <span className="text-muted-foreground">(one per line: title | url)</span>
					</FieldLabel>
					<Textarea
						id="admin-urls"
						rows={4}
						placeholder={"Live Demo | https://example.com\nGitHub | https://github.com/..."}
						disabled={isSubmitting}
						defaultValue={serializeUrls(defaultValues?.urls ?? [])}
					/>
					<FieldError
						errors={
							errors.urls
								? [{ message: 'Invalid URLs' }]
								: fieldErrors?.urls?.map((m) => ({ message: m }))
						}
					/>
				</Field>
			</FieldGroup>

			{error && error.kind !== API_ERROR_KIND.validation ? (
				<div
					role="alert"
					className="border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
				>
					<p className="font-medium text-destructive">
						{error.kind === API_ERROR_KIND.conflict
							? 'A project with this slug already exists.'
							: error.message || 'Something went wrong.'}
					</p>
				</div>
			) : null}

			<div className="flex gap-3">
				<Button type="submit" size="lg" disabled={isSubmitting}>
					{isSubmitting
						? 'Saving…'
						: method === 'patch'
							? 'Update Project'
							: 'Create Project'}
				</Button>
			</div>
		</form>
	);
}
