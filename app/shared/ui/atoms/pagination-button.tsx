/**
 * `PaginationButton` — a single page button in the works catalog
 * or admin pagination. `variant="active"` paints the current page
 * in primary; `variant="ghost"` paints the rest; `variant="nav"`
 * paints prev/next chevrons.
 */
import type { ButtonHTMLAttributes } from 'react';
import { forwardRef } from 'react';

import { cn } from '~/shared/lib/cn';

export type PaginationButtonVariant = 'active' | 'default' | 'nav';

export type PaginationButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: PaginationButtonVariant;
};

const variantClasses: Record<PaginationButtonVariant, string> = {
	active: 'border-primary bg-primary text-primary-foreground',
	default:
		'border-outline-variant/60 bg-surface-container text-on-surface hover:border-primary/60 hover:text-primary',
	nav: 'border-outline-variant/60 bg-surface-container text-on-surface hover:border-primary/60 hover:text-primary',
};

export const PaginationButton = forwardRef<
	HTMLButtonElement,
	PaginationButtonProps
>(function PaginationButton(
	{ variant = 'default', className, type = 'button', children, ...props },
	ref,
) {
	return (
		<button
			ref={ref}
			type={type}
			data-slot="pagination-button"
			data-variant={variant}
			aria-current={variant === 'active' ? 'page' : undefined}
			className={cn(
				'inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-3 text-xs font-semibold uppercase tracking-widest transition-colors',
				variantClasses[variant],
				className,
			)}
			{...props}
		>
			{children}
		</button>
	);
});
