/**
 * `Toggle` — a small label + shadcn Switch pair, used for the
 * publish/unpublish action on admin project cards and review
 * rows. The component is presentational; the parent owns the
 * checked state.
 */
import type { HTMLAttributes } from 'react';

import { cn } from '~/shared/lib/cn';

import { Switch } from '~/components/ui/switch';

export type ToggleProps = Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> & {
	label: string;
	checked: boolean;
	onCheckedChange: (next: boolean) => void;
	disabled?: boolean;
};

export function Toggle({
	label,
	checked,
	onCheckedChange,
	disabled,
	className,
	...props
}: ToggleProps) {
	return (
		<div
			data-slot="toggle"
			className={cn(
				'inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground',
				className,
			)}
			{...props}
		>
			<Switch
				checked={checked}
				onCheckedChange={onCheckedChange}
				disabled={disabled}
				aria-label={label}
			/>
			<span>{label}</span>
		</div>
	);
}
