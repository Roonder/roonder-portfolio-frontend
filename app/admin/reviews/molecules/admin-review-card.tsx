/**
 * `AdminReviewCard` — the admin review card for the moderation list.
 *
 * Shows author name + role, star rating, content, an approval
 * status badge, and approve/unapprove + delete actions.
 */
import { useEffect, useRef } from 'react';
import { useFetcher } from 'react-router';
import { toast } from 'sonner';

import { cn } from '~/shared/lib/cn';

import { BentoCell } from '~/shared/ui/atoms/bento-cell';
import { StatusBadge } from '~/shared/ui/atoms/status-badge';
import { Button } from '~/components/ui/button';
import { Check, Trash2, Undo2 } from 'lucide-react';

import { ReviewStarRating } from '~/admin/reviews/molecules/review-star-rating';
import type { AdminReview } from '~/admin/reviews/api/reviews';

type FetcherResult =
	| { ok: true }
	| { ok: false; error?: { message?: string } };

export type AdminReviewCardProps = {
	review: AdminReview;
	onDelete: (id: string, authorName: string) => void;
	className?: string;
};

export function AdminReviewCard({
	review,
	onDelete,
	className,
}: AdminReviewCardProps) {
	const approveFetcher = useFetcher();
	const isToggling = approveFetcher.state !== 'idle';
	const prevState = useRef(approveFetcher.state);

	useEffect(() => {
		if (prevState.current !== 'idle' && approveFetcher.state === 'idle') {
			const result = approveFetcher.data as FetcherResult | undefined;
			if (result?.ok) {
				toast.success(
					review.isApproved ? 'Review unapproved' : 'Review approved',
				);
			} else if (result && !result.ok) {
				toast.error(result.error?.message ?? 'Failed to update review');
			}
		}
		prevState.current = approveFetcher.state;
	}, [approveFetcher.state, approveFetcher.data, review.isApproved]);

	function handleToggleApprove() {
		const fd = new FormData();
		fd.set('_method', 'PATCH');
		approveFetcher.submit(fd, {
			method: 'post',
			action: `/administration-panel/reviews/${review.id}`,
		});
	}

	return (
		<BentoCell as="article" className={cn('flex flex-col gap-3', className)}>
			<div className="flex items-start justify-between gap-2">
				<div>
					<h3 className="text-sm font-semibold text-on-surface">
						{review.authorName}
					</h3>
					{review.authorRole ? (
						<p className="text-xs text-muted-foreground">{review.authorRole}</p>
					) : null}
				</div>
				<StatusBadge variant={review.isApproved ? 'published' : 'draft'}>
					{review.isApproved ? 'Approved' : 'Pending'}
				</StatusBadge>
			</div>

			<ReviewStarRating rating={review.rating} />

			<p className="text-sm text-muted-foreground line-clamp-4">
				{review.content}
			</p>

			<div className="mt-auto flex gap-2">
				<Button
					variant="outline"
					size="sm"
					className="flex-1"
					onClick={handleToggleApprove}
					disabled={isToggling}
				>
					{review.isApproved ? (
						<>
							<Undo2 className="mr-1.5 size-3.5" aria-hidden="true" />
							Unapprove
						</>
					) : (
						<>
							<Check className="mr-1.5 size-3.5" aria-hidden="true" />
							Approve
						</>
					)}
				</Button>
				<Button
					variant="outline"
					size="sm"
					className="flex-1"
					onClick={() => onDelete(review.id, review.authorName)}
				>
					<Trash2 className="mr-1.5 size-3.5" aria-hidden="true" />
					Delete
				</Button>
			</div>
		</BentoCell>
	);
}
