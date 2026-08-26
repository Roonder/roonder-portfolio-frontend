/**
 * `ProjectMeta` — category + hours stat row used by every
 * project card variant.
 */
import { useTranslation } from 'react-i18next';

import { cn } from '~/shared/lib/cn';

export type ProjectMetaProps = {
	tags: string[];
	hours?: number;
	className?: string;
};

export function ProjectMeta({ tags, hours, className }: ProjectMetaProps) {
	const { t } = useTranslation();
	const primary = tags[0];

	return (
		<div
			data-slot="project-meta"
			className={cn(
				'flex flex-wrap items-center gap-2 text-xs',
				className,
			)}
		>
			{primary ? (
				<span className="rounded-full border border-outline-variant/40 bg-surface-container-high px-2 py-0.5 font-semibold uppercase tracking-widest text-on-surface">
					{primary}
				</span>
			) : null}
			{hours !== undefined ? (
				<span className="text-muted-foreground">
					{t('works.card.hours', { count: hours })}
				</span>
			) : null}
		</div>
	);
}
