/**
 * `ReviewStarRating` — read-only star rating display.
 *
 * Mirrors the interactive star pattern from
 * `app/home/molecules/review-form.tsx` (same `Star` icon,
 * `fill-primary text-primary` for filled stars), but rendered as a
 * static row for the admin moderation cards.
 */
import { Star } from 'lucide-react';

import { cn } from '~/shared/lib/cn';

export type ReviewStarRatingProps = {
	rating: number;
	className?: string;
};

export function ReviewStarRating({ rating, className }: ReviewStarRatingProps) {
	return (
		<div
			className={cn('flex items-center gap-0.5', className)}
			role="img"
			aria-label={`${rating} out of 5 stars`}
		>
			{[1, 2, 3, 4, 5].map((value) => (
				<Star
					key={value}
					className={cn(
						'size-4',
						value <= rating ? 'fill-primary text-primary' : 'text-muted-foreground',
					)}
					aria-hidden="true"
				/>
			))}
		</div>
	);
}
