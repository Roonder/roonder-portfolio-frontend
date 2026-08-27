/**
 * `BentoCell` — a single cell in the Aurelian bento grid.
 *
 * The base surface is `bg-surface-container-low`; the bento cell can
 * be elevated via `variant="elevated"`. Hover lifts the cell with
 * the design's `hover:-translate-y-1` plus a subtle gold glow on
 * primary surfaces. The hover effect is CSS-only (no JS state) and
 * is suppressed by `prefers-reduced-motion` per the design system.
 */
import type { HTMLAttributes } from 'react';

import { cn } from '~/shared/lib/cn';

export type BentoCellVariant = 'default' | 'elevated' | 'glass' | 'primary';

export type BentoCellProps = HTMLAttributes<HTMLDivElement> & {
	variant?: BentoCellVariant;
	as?: 'div' | 'section' | 'article' | 'aside';
};

const variantClasses: Record<BentoCellVariant, string> = {
	default:
		'bg-surface-container-low border border-outline-variant/40 text-on-surface',
	elevated:
		'bg-surface-container border border-outline-variant/40 text-on-surface shadow-[0_0_20px_rgba(212,175,55,0.05)]',
	glass:
		'bg-surface-container-low/60 backdrop-blur-sm border border-outline-variant/30 text-on-surface',
	primary:
		'bg-primary text-primary-foreground border border-primary',
};

export function BentoCell({
	className,
	variant = 'default',
	as: As = 'div',
	...props
}: BentoCellProps) {
	return (
		<As
			data-slot="bento-cell"
			data-variant={variant}
			className={cn(
				'group/bento-cell relative rounded-2xl p-6 transition-all duration-300',
				'hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
				variantClasses[variant],
				className,
			)}
			{...props}
		/>
	);
}
