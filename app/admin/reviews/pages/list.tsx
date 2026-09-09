/**
 * `AdminReviewsListPage` — the admin reviews moderation page module.
 *
 * Composes the page title + filter row (approval-status chips) +
 * grid of `AdminReviewCard`s + pagination. Mirrors
 * `app/admin/projects/pages/list.tsx`.
 *
 * The filter row uses `<Link>` for server-side navigation (the
 * loader re-runs with the new `?status=` query param). The delete
 * action opens the confirm modal via local state.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useFetcher } from 'react-router';
import { toast } from 'sonner';

import { cn } from '~/shared/lib/cn';

import { EmptyState } from '~/shared/ui/atoms/empty-state';
import { Pagination } from '~/shared/ui/molecules/pagination';
import { AdminReviewCard } from '~/admin/reviews/molecules/admin-review-card';
import { AdminReviewConfirmModal } from '~/admin/reviews/molecules/admin-review-confirm-modal';
import type { AdminReview } from '~/admin/reviews/api/reviews';

export type AdminReviewsListPageProps = {
	reviews: AdminReview[];
	total: number;
	page: number;
	pageSize: number;
	currentStatus: 'all' | 'pending' | 'approved';
};

type StatusFilter = 'all' | 'pending' | 'approved';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
	{ value: 'all', label: 'All' },
	{ value: 'pending', label: 'Pending' },
	{ value: 'approved', label: 'Approved' },
];

type FetcherResult =
	| { ok: true }
	| { ok: false; error?: { message?: string } };

export default function AdminReviewsListPage({
	reviews,
	total,
	page,
	pageSize,
	currentStatus,
}: AdminReviewsListPageProps) {
	const totalPages = Math.ceil(total / pageSize);
	const deleteFetcher = useFetcher();
	const prevDeleteState = useRef(deleteFetcher.state);

	const [deleteTarget, setDeleteTarget] = useState<{
		id: string;
		authorName: string;
	} | null>(null);

	useEffect(() => {
		if (
			prevDeleteState.current !== 'idle' &&
			deleteFetcher.state === 'idle' &&
			deleteFetcher.data
		) {
			const result = deleteFetcher.data as FetcherResult;
			if (result.ok) {
				toast.success('Review deleted');
			} else {
				toast.error(result.error?.message ?? 'Failed to delete review');
			}
		}
		prevDeleteState.current = deleteFetcher.state;
	}, [deleteFetcher.state, deleteFetcher.data]);

	function handleDeleteConfirm() {
		if (!deleteTarget) return;
		const fd = new FormData();
		fd.set('_method', 'DELETE');
		deleteFetcher.submit(fd, {
			method: 'post',
			action: `/administration-panel/reviews/${deleteTarget.id}`,
		});
		setDeleteTarget(null);
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<h1 className="font-display text-xl font-semibold text-on-surface">
					Reviews
				</h1>
			</div>

			{/* Filter row */}
			<div className="flex gap-2" role="tablist" aria-label="Filter by status">
				{STATUS_FILTERS.map(({ value, label }) => (
					<Link
						key={value}
						to={
							value === 'all'
								? '/administration-panel/reviews'
								: `/administration-panel/reviews?status=${value}`
						}
						role="tab"
						aria-selected={currentStatus === value}
						className={cn(
							'rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-widest transition-colors',
							currentStatus === value
								? 'border-primary/50 bg-primary/10 text-primary'
								: 'border-outline-variant/60 bg-surface-container text-muted-foreground hover:text-primary',
						)}
					>
						{label}
					</Link>
				))}
			</div>

			{/* Reviews grid */}
			{reviews.length === 0 ? (
				<EmptyState
					title="No reviews yet"
					body="Reviews submitted from the public site will show up here."
				/>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{reviews.map((review) => (
						<AdminReviewCard
							key={review.id}
							review={review}
							onDelete={(id, authorName) => setDeleteTarget({ id, authorName })}
						/>
					))}
				</div>
			)}

			{/* Pagination */}
			{totalPages > 1 ? (
				<Pagination
					page={page}
					totalPages={totalPages}
					onPageChange={(next) => {
						const params = new URLSearchParams();
						if (currentStatus !== 'all') params.set('status', currentStatus);
						params.set('page', String(next));
						window.location.href = `/administration-panel/reviews?${params.toString()}`;
					}}
				/>
			) : null}

			{/* Delete confirmation modal */}
			<AdminReviewConfirmModal
				authorName={deleteTarget?.authorName ?? ''}
				open={deleteTarget !== null}
				onOpenChange={(open) => {
					if (!open) setDeleteTarget(null);
				}}
				onConfirm={handleDeleteConfirm}
				isDeleting={deleteFetcher.state !== 'idle'}
			/>
		</div>
	);
}
