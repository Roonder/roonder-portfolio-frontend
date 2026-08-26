/**
 * `StatusBadge` — a small badge for published / draft / archived
 * status on the admin project cards and review list.
 */
import type { HTMLAttributes } from 'react';

import { cn } from '~/shared/lib/cn';

export type StatusVariant = 'published' | 'draft' | 'archived' | 'throttled';

export type StatusBadgeProps = HTMLAttributes<HTMLSpanElement> & {
	variant?: StatusVariant;
};

const variantClasses: Record<StatusVariant, string> = {
	published: 'border-primary/50 bg-primary/10 text-primary',
	draft: 'border-outline-variant/60 bg-surface-container text-muted-foreground',
	archived: 'border-outline-variant/40 bg-surface-container-low text-muted-foreground',
	throttled: 'border-destructive/50 bg-destructive/10 text-destructive',
};

const variantLabels: Record<StatusVariant, string> = {
	published: 'Published',
	draft: 'Draft',
	archived: 'Archived',
	throttled: 'Throttled',
};

export function StatusBadge({
	variant = 'draft',
	className,
	children,
	...props
}: StatusBadgeProps) {
	return (
		<span
			data-slot="status-badge"
			data-variant={variant}
			className={cn(
				'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-widest',
				variantClasses[variant],
				className,
			)}
			{...props}
		>
			{children ?? variantLabels[variant]}
		</span>
	);
}
