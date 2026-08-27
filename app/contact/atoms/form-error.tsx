/**
 * `FormError` — a small presentational renderer for the discriminated
 * `ApiError` returned by the contact action (and any future form
 * action). Pattern-matches on `error.kind` per the locked
 * `http-client` REQ-CORE-2 contract:
 *
 *   - `validation` → renders per-field errors via the supplied
 *     `renderFieldErrors` callback (the form knows where each
 *     field's error lives)
 *   - `throttled` → inline countdown + `Retry-After` message
 *   - `network` → inline error + retry button
 *   - `server` → generic error + retry button
 *   - the rest → generic error
 *
 * The component is presentational: it does NOT mutate state. The
 * parent decides whether to show the retry button (the contact
 * form uses the action's `state` to gate the retry).
 */
import { useTranslation } from 'react-i18next';

import { cn } from '~/shared/lib/cn';

import { API_ERROR_KIND, type ApiError } from '~/shared/lib/fetch-client/errors';

export type FormErrorProps = {
	error?: ApiError | null;
	/** Optional per-field error map; merged into `error.fieldErrors`. */
	fieldErrors?: Record<string, string[]>;
	/** Optional retry handler (the parent owns the retry trigger). */
	onRetry?: () => void;
	/** Whether the submit is in flight (gates the retry button). */
	isSubmitting?: boolean;
	className?: string;
};

export function FormError({
	error,
	fieldErrors,
	onRetry,
	isSubmitting = false,
	className,
}: FormErrorProps) {
	const { t } = useTranslation();

	if (!error) return null;

	const mergedFieldErrors: Record<string, string[]> = {
		...(error.fieldErrors ?? {}),
		...(fieldErrors ?? {}),
	};
	const hasFieldErrors = Object.values(mergedFieldErrors).some(
		(arr) => arr && arr.length > 0,
	);

	switch (error.kind) {
		case API_ERROR_KIND.validation:
			if (!hasFieldErrors) {
				return (
					<p
						role="alert"
						className={cn(
							'text-sm font-medium text-destructive',
							className,
						)}
					>
						{t('contact.form.error')}
					</p>
				);
			}
			return null;
		case API_ERROR_KIND.throttled: {
			const seconds =
				typeof error.retryAfter === 'number' ? error.retryAfter : undefined;
			const message =
				seconds !== undefined
					? t('contact.form.throttled', { seconds })
					: t('contact.form.throttledGeneric');
			return (
				<p
					role="alert"
					className={cn(
						'text-sm font-medium text-destructive',
						className,
					)}
				>
					{message}
				</p>
			);
		}
		case API_ERROR_KIND.network:
			return (
				<div
					role="alert"
					className={cn('flex flex-col gap-2', className)}
				>
					<p className="text-sm font-medium text-destructive">
						{t('contact.form.network')}
					</p>
					{onRetry ? (
						<button
							type="button"
							onClick={onRetry}
							disabled={isSubmitting}
							className="self-start text-xs font-semibold uppercase tracking-widest text-primary underline-offset-4 hover:underline disabled:opacity-50"
						>
							{t('common.error.retry')}
						</button>
					) : null}
				</div>
			);
		case API_ERROR_KIND.server:
		case API_ERROR_KIND.unauthorized:
		case API_ERROR_KIND.forbidden:
		case API_ERROR_KIND.notFound:
		case API_ERROR_KIND.conflict:
		default:
			return (
				<div
					role="alert"
					className={cn('flex flex-col gap-2', className)}
				>
					<p className="text-sm font-medium text-destructive">
						{t('contact.form.error')}
					</p>
					{onRetry ? (
						<button
							type="button"
							onClick={onRetry}
							disabled={isSubmitting}
							className="self-start text-xs font-semibold uppercase tracking-widest text-primary underline-offset-4 hover:underline disabled:opacity-50"
						>
							{t('common.error.retry')}
						</button>
					) : null}
				</div>
			);
	}
}
