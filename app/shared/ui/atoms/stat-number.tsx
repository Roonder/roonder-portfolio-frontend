/**
 * `StatNumber` — a large numeric display for the home metrics
 * bento and the admin overview stat card. The label sits below
 * the number in a MicroLabel; the delta is optional.
 */
import type { HTMLAttributes } from 'react';

import { cn } from '~/shared/lib/cn';

import { MicroLabel } from '~/shared/ui/atoms/micro-label';

export type StatNumberProps = HTMLAttributes<HTMLDivElement> & {
	value: string | number;
	label: string;
	delta?: string;
};

export function StatNumber({
	value,
	label,
	delta,
	className,
	...props
}: StatNumberProps) {
	return (
		<div
			data-slot="stat-number"
			className={cn('flex flex-col gap-1', className)}
			{...props}
		>
			<span className="text-3xl font-semibold tracking-tight text-on-surface md:text-4xl">
				{value}
			</span>
			<MicroLabel label={label} />
			{delta ? (
				<span className="text-xs text-primary">{delta}</span>
			) : null}
		</div>
	);
}
