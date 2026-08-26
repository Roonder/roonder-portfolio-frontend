/**
 * `SectionHeading` — a section title with an optional right-side
 * badge (e.g. `[ Precision Metrics ]` MicroLabel on the home
 * metrics bento). The eyebrow is a MicroLabel; the heading is
 * `text-2xl md:text-3xl`; the description is `text-muted-foreground`.
 */
import type { HTMLAttributes } from 'react';

import { cn } from '~/shared/lib/cn';

import { MicroLabel } from '~/shared/ui/atoms/micro-label';

export type SectionHeadingProps = HTMLAttributes<HTMLDivElement> & {
	eyebrow?: string;
	title: string;
	description?: string;
};

export function SectionHeading({
	eyebrow,
	title,
	description,
	className,
	...props
}: SectionHeadingProps) {
	return (
		<header
			data-slot="section-heading"
			className={cn('flex flex-col gap-2', className)}
			{...props}
		>
			{eyebrow ? <MicroLabel label={eyebrow} /> : null}
			<h2 className="text-2xl font-semibold tracking-tight md:text-3xl text-on-surface">
				{title}
			</h2>
			{description ? (
				<p className="text-sm text-muted-foreground md:text-base">{description}</p>
			) : null}
		</header>
	);
}
