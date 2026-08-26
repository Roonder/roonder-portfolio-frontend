/**
 * `Pagination` — a horizontal pagination control.
 *
 * Pure presentation: the parent owns the `page` state and the
 * `totalPages` count, this molecule renders the row of
 * `PaginationButton` atoms (prev / 1..N / next). The `aria-live`
 * is "polite" on the active page so screen readers announce
 * navigation changes.
 */
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '~/shared/lib/cn';

import { PaginationButton } from '~/shared/ui/atoms/pagination-button';

export type PaginationProps = {
	page: number;
	totalPages: number;
	onPageChange: (next: number) => void;
	className?: string;
	ariaLabel?: string;
};

function buildPageList(current: number, total: number): (number | 'ellipsis')[] {
	if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
	const result: (number | 'ellipsis')[] = [1];
	const start = Math.max(2, current - 1);
	const end = Math.min(total - 1, current + 1);
	if (start > 2) result.push('ellipsis');
	for (let i = start; i <= end; i++) result.push(i);
	if (end < total - 1) result.push('ellipsis');
	result.push(total);
	return result;
}

export function Pagination({
	page,
	totalPages,
	onPageChange,
	className,
	ariaLabel = 'Pagination',
}: PaginationProps) {
	if (totalPages <= 1) return null;
	const pages = buildPageList(page, totalPages);
	return (
		<nav
			aria-label={ariaLabel}
			data-slot="pagination"
			className={cn('flex items-center gap-2', className)}
		>
			<PaginationButton
				variant="nav"
				aria-label="Previous page"
				disabled={page <= 1}
				onClick={() => onPageChange(page - 1)}
			>
				<ChevronLeft className="size-4" aria-hidden="true" />
			</PaginationButton>
			{pages.map((p, i) =>
				p === 'ellipsis' ? (
					<span
						key={`ellipsis-${i}`}
						aria-hidden="true"
						className="px-1 text-muted-foreground"
					>
						…
					</span>
				) : (
					<PaginationButton
						key={p}
						variant={p === page ? 'active' : 'default'}
						aria-label={`Page ${p}`}
						onClick={() => onPageChange(p)}
					>
						{p}
					</PaginationButton>
				),
			)}
			<PaginationButton
				variant="nav"
				aria-label="Next page"
				disabled={page >= totalPages}
				onClick={() => onPageChange(page + 1)}
			>
				<ChevronRight className="size-4" aria-hidden="true" />
			</PaginationButton>
		</nav>
	);
}
