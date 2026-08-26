/**
 * `FilterChip` — a toggleable chip used by the works catalog
 * filter row. The active state is `bg-primary text-primary-foreground`;
 * the rest state is `bg-surface-container-high text-on-surface`.
 */
import type { ButtonHTMLAttributes } from 'react';
import { forwardRef } from 'react';

import { cn } from '~/shared/lib/cn';

export type FilterChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	active?: boolean;
};

export const FilterChip = forwardRef<HTMLButtonElement, FilterChipProps>(
	function FilterChip(
		{ active = false, className, type = 'button', children, ...props },
		ref,
	) {
		return (
			<button
				ref={ref}
				type={type}
				aria-pressed={active}
				data-slot="filter-chip"
				data-active={active}
				className={cn(
					'inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold uppercase tracking-widest transition-colors',
					active
						? 'border-primary bg-primary text-primary-foreground'
						: 'border-outline-variant bg-surface-container-high text-on-surface hover:border-primary/60 hover:text-primary',
					className,
				)}
				{...props}
			>
				{children}
			</button>
		);
	},
);
