/**
 * `ReviewForm` — the public review-submission form rendered on
 * the home testimonials split. Posts to `POST /api/v1/reviews`
 * (public, unauthenticated) via `submitReview`; new reviews
 * persist with `isApproved=false` and only appear on the site
 * once an admin approves them, so the form always thanks the
 * visitor rather than showing the review immediately.
 *
 * Same stack as `ContactForm`: `react-hook-form` +
 * `zodResolver(createReviewSchema)`, typed `ApiError` rendered via
 * `FormError`. No `useMemo` / `useCallback` / `React.memo`.
 */
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';

import { cn } from '~/shared/lib/cn';

import {
	createReviewSchema,
	type CreateReviewValues,
} from '~/home/schema';
import { submitReview } from '~/home/api/reviews';
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

export type ReviewFormProps = {
	className?: string;
};

export function ReviewForm({ className }: ReviewFormProps) {
	const { t } = useTranslation();
	const pushToast = useToastStore((s) => s.push);

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [actionError, setActionError] = useState<ApiError | null>(null);
	const [countdown, setCountdown] = useState<number | null>(null);

	const {
		control,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<CreateReviewValues>({
		resolver: zodResolver(createReviewSchema),
		defaultValues: { authorName: '', authorRole: '', content: '', rating: 5 },
		mode: 'onBlur',
	});

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

	const fieldErrors =
		actionError?.kind === API_ERROR_KIND.validation
			? actionError.fieldErrors
			: undefined;

	const submitDisabled = isSubmitting || countdown !== null;

	async function onSubmit(values: CreateReviewValues) {
		setIsSubmitting(true);
		setActionError(null);
		const result = await submitReview(values);
		setIsSubmitting(false);
		if (result.ok) {
			pushToast({ kind: 'success', message: t('home.reviews.form.success') });
			reset();
			return;
		}
		setActionError(result.error);
	}

	return (
		<form
			noValidate
			onSubmit={handleSubmit(onSubmit)}
			className={cn('flex flex-col gap-4', className)}
		>
			<FieldGroup>
				<Controller
					control={control}
					name="rating"
					render={({ field }) => (
						<Field>
							<FieldLabel htmlFor="review-rating">
								{t('home.reviews.form.rating')}
							</FieldLabel>
							<div
								id="review-rating"
								role="radiogroup"
								aria-label={t('home.reviews.form.rating')}
								className="flex items-center gap-1"
							>
								{[1, 2, 3, 4, 5].map((value) => (
									<button
										key={value}
										type="button"
										role="radio"
										aria-checked={field.value === value}
										aria-label={t('home.reviews.form.ratingValue', { value })}
										onClick={() => field.onChange(value)}
										disabled={isSubmitting}
										className="rounded-sm p-0.5 transition-colors disabled:opacity-50"
									>
										<Star
											className={cn(
												'size-6',
												value <= field.value
													? 'fill-primary text-primary'
													: 'text-muted-foreground',
											)}
										/>
									</button>
								))}
							</div>
						</Field>
					)}
				/>

				<Controller
					control={control}
					name="content"
					render={({ field }) => (
						<Field>
							<FieldLabel htmlFor="review-content">
								{t('home.reviews.form.content')}
							</FieldLabel>
							<Textarea
								{...field}
								id="review-content"
								rows={4}
								placeholder={t('home.reviews.form.contentPlaceholder')}
								aria-invalid={Boolean(errors.content)}
								disabled={isSubmitting}
							/>
							<FieldError
								errors={
									errors.content
										? [{ message: t(errors.content.message ?? '') }]
										: fieldErrors?.content?.map((m) => ({ message: m }))
								}
							/>
						</Field>
					)}
				/>

				<div className="grid gap-4 sm:grid-cols-2">
					<Controller
						control={control}
						name="authorName"
						render={({ field }) => (
							<Field>
								<FieldLabel htmlFor="review-author-name">
									{t('home.reviews.form.authorName')}
								</FieldLabel>
								<Input
									{...field}
									id="review-author-name"
									type="text"
									autoComplete="name"
									placeholder={t('home.reviews.form.authorNamePlaceholder')}
									aria-invalid={Boolean(errors.authorName)}
									disabled={isSubmitting}
								/>
								<FieldError
									errors={
										errors.authorName
											? [{ message: t(errors.authorName.message ?? '') }]
											: fieldErrors?.authorName?.map((m) => ({ message: m }))
									}
								/>
							</Field>
						)}
					/>

					<Controller
						control={control}
						name="authorRole"
						render={({ field }) => (
							<Field>
								<FieldLabel htmlFor="review-author-role">
									{t('home.reviews.form.authorRole')}
								</FieldLabel>
								<Input
									{...field}
									id="review-author-role"
									type="text"
									placeholder={t('home.reviews.form.authorRolePlaceholder')}
									aria-invalid={Boolean(errors.authorRole)}
									disabled={isSubmitting}
								/>
								<FieldError
									errors={
										errors.authorRole
											? [{ message: t(errors.authorRole.message ?? '') }]
											: fieldErrors?.authorRole?.map((m) => ({ message: m }))
									}
								/>
							</Field>
						)}
					/>
				</div>
			</FieldGroup>

			<div className="flex flex-col gap-2">
				<Button
					type="submit"
					disabled={submitDisabled}
					className="self-start"
				>
					{countdown !== null
						? t('home.reviews.form.submitting', { seconds: countdown })
						: isSubmitting
							? t('home.reviews.form.submittingShort')
							: t('home.reviews.form.submit')}
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
