/**
 * `ProgressBar` — a horizontal progress bar used by the home
 * metrics, the works cards, and the admin project card. The
 * `value` is 0-100; the bar fills in primary gold.
 */
import type { HTMLAttributes } from 'react';

import { cn } from '~/shared/lib/cn';

export type ProgressBarProps = HTMLAttributes<HTMLDivElement> & {
	value: number;
	label?: string;
	/** Override the height in Tailwind classes (default `h-1.5`). */
	heightClassName?: string;
};

export function ProgressBar({
	value,
	label,
	className,
	heightClassName = 'h-1.5',
	...props
}: ProgressBarProps) {
	const clamped = Math.max(0, Math.min(100, value));
	return (
		<div
			data-slot="progress-bar"
			role="progressbar"
			aria-valuenow={clamped}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-label={label}
			className={cn(
				'w-full overflow-hidden rounded-full bg-surface-container-high',
				heightClassName,
				className,
			)}
			{...props}
		>
			<div
				className={cn('h-full bg-primary transition-all duration-500')}
				style={{ width: `${clamped}%` }}
			/>
		</div>
	);
}
