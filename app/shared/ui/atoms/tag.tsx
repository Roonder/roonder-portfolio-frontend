/**
 * `Tag` — a small inline label used for project categories and
 * status. Defaults to a sage outlined chip; the `variant` prop
 * picks a different palette.
 */
import type { HTMLAttributes } from 'react';

import { cn } from '~/shared/lib/cn';

export type TagVariant = 'default' | 'primary' | 'secondary' | 'destructive';

export type TagProps = HTMLAttributes<HTMLSpanElement> & {
	variant?: TagVariant;
};

const variantClasses: Record<TagVariant, string> = {
	default:
		'border-outline-variant/60 bg-surface-container text-on-surface',
	primary:
		'border-primary/40 bg-primary/10 text-primary',
	secondary:
		'border-secondary/40 bg-secondary/10 text-secondary',
	destructive:
		'border-destructive/40 bg-destructive/10 text-destructive',
};

export function Tag({
	variant = 'default',
	className,
	children,
	...props
}: TagProps) {
	return (
		<span
			data-slot="tag"
			data-variant={variant}
			className={cn(
				'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-widest',
				variantClasses[variant],
				className,
			)}
			{...props}
		>
			{children}
		</span>
	);
}
