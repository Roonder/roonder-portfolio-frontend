/**
 * `EmptyState` — a presentational empty state for the admin
 * reviews, admin contact inbox, and the works filter "no
 * matches" view. The icon is a `lucide-react` element; the title
 * + body are caller-supplied (typically from i18n).
 */
import type { ReactNode } from 'react';

import { cn } from '~/shared/lib/cn';

import { MicroLabel } from '~/shared/ui/atoms/micro-label';

export type EmptyStateProps = {
	title: string;
	body?: string;
	icon?: ReactNode;
	eyebrow?: string;
	action?: ReactNode;
	className?: string;
};

export function EmptyState({
	title,
	body,
	icon,
	eyebrow,
	action,
	className,
}: EmptyStateProps) {
	return (
		<div
			data-slot="empty-state"
			className={cn(
				'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-outline-variant/60 bg-surface-container-low p-10 text-center',
				className,
			)}
		>
			{eyebrow ? <MicroLabel label={eyebrow} /> : null}
			{icon ? (
				<div className="text-muted-foreground" aria-hidden="true">
					{icon}
				</div>
			) : null}
			<h3 className="text-lg font-semibold text-on-surface">{title}</h3>
			{body ? (
				<p className="max-w-md text-sm text-muted-foreground">{body}</p>
			) : null}
			{action ? <div className="mt-2">{action}</div> : null}
		</div>
	);
}
