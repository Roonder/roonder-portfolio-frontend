/**
 * `AdminStatCard` — a stat card for the admin overview.
 *
 * Wraps the `StatNumber` atom in a `BentoCell` so it shares the
 * Aurelian surface + hover behavior with the home metrics bento.
 * The optional `icon` is rendered top-right.
 */
import type { ReactNode } from 'react';

import { cn } from '~/shared/lib/cn';

import { BentoCell } from '~/shared/ui/atoms/bento-cell';
import { StatNumber } from '~/shared/ui/atoms/stat-number';

export type AdminStatCardProps = {
	value: string | number;
	label: string;
	delta?: string;
	icon?: ReactNode;
	className?: string;
};

export function AdminStatCard({
	value,
	label,
	delta,
	icon,
	className,
}: AdminStatCardProps) {
	return (
		<BentoCell className={cn('flex flex-col gap-3', className)}>
			<div className="flex items-start justify-between">
				{icon ? (
					<div className="text-primary" aria-hidden="true">
						{icon}
					</div>
				) : null}
			</div>
			<StatNumber value={value} label={label} delta={delta} />
		</BentoCell>
	);
}
