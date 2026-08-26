/**
 * `TestimonialsSplit` — the home reviews list per REQ-HOME-2.
 * Q-3 deferred: the review submission form is OUT OF SCOPE for
 * v1, so the split renders a read-only list of featured reviews
 * with a "Reviews are coming soon" placeholder for the form side.
 *
 * BRAND FLOURISH — "[ Client Voices ]" micro-label is fixed.
 */
import { useTranslation } from 'react-i18next';

import { cn } from '~/shared/lib/cn';

import { BentoCell } from '~/shared/ui/atoms/bento-cell';
import { MicroLabel } from '~/shared/ui/atoms/micro-label';

import type { Review } from '~/home/schema';

export type TestimonialsSplitProps = {
	reviews: Review[];
	className?: string;
};

export function TestimonialsSplit({
	reviews,
	className,
}: TestimonialsSplitProps) {
	const { t } = useTranslation();

	return (
		<section
			data-slot="testimonials-split"
			className={cn('grid gap-3 md:grid-cols-2', className)}
		>
			<BentoCell className="flex flex-col gap-4 p-6 md:p-8">
				<MicroLabel label="[ Client Voices ]" />
				<h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
					{t('home.sections.reviews.title')}
				</h2>
				<p className="text-sm text-muted-foreground md:text-base">
					{t('home.reviews.comingSoon')}
				</p>
			</BentoCell>

			<div className="flex flex-col gap-3">
				{reviews.slice(0, 2).map((review) => (
					<BentoCell
						key={review.id}
						className="flex flex-col gap-3 p-5 md:p-6"
					>
						<div className="flex items-baseline justify-between gap-2">
							<span className="font-semibold text-on-surface">
								{review.authorName}
							</span>
							<span className="text-xs uppercase tracking-widest text-muted-foreground">
								{'★'.repeat(review.rating)}
							</span>
						</div>
						{review.authorRole ? (
							<span className="text-xs uppercase tracking-widest text-brand-micro-label">
								{review.authorRole}
							</span>
						) : null}
						<blockquote className="text-sm italic text-muted-foreground md:text-base">
							&ldquo;{review.content}&rdquo;
						</blockquote>
					</BentoCell>
				))}
				{reviews.length === 0 ? (
					<BentoCell className="p-5 text-sm text-muted-foreground md:p-6">
						{t('home.reviews.empty')}
					</BentoCell>
				) : null}
			</div>
		</section>
	);
}
