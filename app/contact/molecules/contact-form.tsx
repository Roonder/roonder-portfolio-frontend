/**
 * `ContactForm` — the canonical contact form molecule.
 *
 * Reused by `/contact` (REQ-CON-2) and the home contact form
 * (REQ-HOME-6). Wires `react-hook-form` + `zodResolver(contactSchema)`,
 * renders 4 `Field` rows (name, email, subject, message), submits
 * via `useFetcher().submit(values, { method: 'post', action: '/contact' })`,
 * pushes a localized success toast on `{ ok: true }`, and renders
 * the typed `ApiError` inline via `FormError`.
 *
 * The 429 case renders a 12-second countdown (or the supplied
 * `Retry-After` value) inline + disables the submit button until
 * the countdown elapses. The 400 case surfaces per-field errors
 * under each `Field` via the typed `error.fieldErrors` map.
 *
 * NO `useMemo` / `useCallback` / `React.memo` (React Compiler era).
 */
import { useEffect, useState } from 'react';
import { useFetcher } from 'react-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

import { cn } from '~/shared/lib/cn';

import {
	contactSchema,
	type ContactFormValues,
} from '~/contact/schema';
import { FormError } from '~/contact/atoms/form-error';
import { useToastStore } from '~/shared/stores/toasts';
import { API_ERROR_KIND, ApiError } from '~/shared/lib/fetch-client/errors';

import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from '~/components/ui/field';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Button } from '~/components/ui/button';

export type ContactFormProps = {
	/** Optional className applied to the wrapping `<form>` element. */
	className?: string;
	/** Optional override for the submit button label (defaults to i18n). */
	submitLabel?: string;
};

export function ContactForm({ className, submitLabel }: ContactFormProps) {
	const { t } = useTranslation();
	const fetcher = useFetcher();
	const pushToast = useToastStore((s) => s.push);

	const isSubmitting = fetcher.state !== 'idle';
	const data = fetcher.data as
		| { ok: boolean; error?: ApiError }
		| undefined;
	const actionError =
		data && !data.ok && data.error instanceof ApiError ? data.error : null;

	const [countdown, setCountdown] = useState<number | null>(null);

	const {
		control,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<ContactFormValues>({
		resolver: zodResolver(contactSchema),
		defaultValues: { name: '', email: '', subject: '', message: '' },
		mode: 'onBlur',
	});

	// Throttling countdown — when the action returns a 429 with
	// `retryAfter`, start a 1-second tick down to 0; the submit
	// button is disabled until the countdown completes.
	useEffect(() => {
		if (
			actionError?.kind === API_ERROR_KIND.throttled &&
			typeof actionError.retryAfter === 'number'
		) {
			setCountdown(actionError.retryAfter);
			const interval = window.setInterval(() => {
				setCountdown((prev) => {
					if (prev === null) return null;
					if (prev <= 1) {
						window.clearInterval(interval);
						return null;
					}
					return prev - 1;
				});
			}, 1000);
			return () => window.clearInterval(interval);
		}
		return () => undefined;
	}, [actionError]);

	// Success toast + form reset when the action returns 201.
	useEffect(() => {
		if (data?.ok) {
			pushToast({ kind: 'success', message: t('contact.form.success') });
			reset();
		}
	}, [data, pushToast, reset, t]);

	const fieldErrors =
		actionError?.kind === API_ERROR_KIND.validation
			? actionError.fieldErrors
			: undefined;

	const submitDisabled = isSubmitting || countdown !== null;

	function onSubmit(values: ContactFormValues) {
		const fd = new FormData();
		fd.set('name', values.name);
		fd.set('email', values.email);
		fd.set('subject', values.subject);
		fd.set('message', values.message);
		fetcher.submit(fd, {
			method: 'post',
			action: '/contact',
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
					name="name"
					render={({ field }) => (
						<Field>
							<FieldLabel htmlFor="contact-name">
								{t('contact.form.name')}
							</FieldLabel>
							<Input
								{...field}
								id="contact-name"
								type="text"
								autoComplete="name"
								placeholder={t('contact.form.name')}
								aria-invalid={Boolean(errors.name)}
								disabled={isSubmitting}
							/>
							<FieldError
								errors={
									errors.name
										? [{ message: t(errors.name.message ?? '') }]
										: fieldErrors?.name?.map((m) => ({ message: m }))
								}
							/>
						</Field>
					)}
				/>

				<Controller
					control={control}
					name="email"
					render={({ field }) => (
						<Field>
							<FieldLabel htmlFor="contact-email">
								{t('contact.form.email')}
							</FieldLabel>
							<Input
								{...field}
								id="contact-email"
								type="email"
								autoComplete="email"
								placeholder={t('contact.form.email')}
								aria-invalid={Boolean(errors.email)}
								disabled={isSubmitting}
							/>
							<FieldError
								errors={
									errors.email
										? [{ message: t(errors.email.message ?? '') }]
										: fieldErrors?.email?.map((m) => ({ message: m }))
								}
							/>
						</Field>
					)}
				/>

				<Controller
					control={control}
					name="subject"
					render={({ field }) => (
						<Field>
							<FieldLabel htmlFor="contact-subject">
								{t('contact.form.subject')}
							</FieldLabel>
							<Input
								{...field}
								id="contact-subject"
								type="text"
								placeholder={t('contact.form.subject')}
								aria-invalid={Boolean(errors.subject)}
								disabled={isSubmitting}
							/>
							<FieldError
								errors={
									errors.subject
										? [{ message: t(errors.subject.message ?? '') }]
										: fieldErrors?.subject?.map((m) => ({ message: m }))
								}
							/>
						</Field>
					)}
				/>

				<Controller
					control={control}
					name="message"
					render={({ field }) => (
						<Field>
							<FieldLabel htmlFor="contact-message">
								{t('contact.form.body')}
							</FieldLabel>
							<Textarea
								{...field}
								id="contact-message"
								rows={6}
								placeholder={t('contact.form.body')}
								aria-invalid={Boolean(errors.message)}
								disabled={isSubmitting}
							/>
							<FieldError
								errors={
									errors.message
										? [{ message: t(errors.message.message ?? '') }]
										: fieldErrors?.message?.map((m) => ({ message: m }))
								}
							/>
						</Field>
					)}
				/>
			</FieldGroup>

			<div className="flex flex-col gap-2">
				<Button
					type="submit"
					size="lg"
					disabled={submitDisabled}
					className="self-start"
				>
					{countdown !== null
						? t('contact.form.submitting', { seconds: countdown })
						: isSubmitting
							? t('contact.form.submittingShort')
							: (submitLabel ?? t('contact.form.submit'))}
				</Button>

				<FormError
					error={actionError}
					fieldErrors={fieldErrors}
					isSubmitting={isSubmitting}
				/>
			</div>
		</form>
	);
}
