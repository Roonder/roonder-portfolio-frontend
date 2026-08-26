/**
 * `ExpandedAboutBento` — the expanded About section per Q-4
 * (REQ-HOME-3). Renders the brand micro-label, a heading, the
 * body paragraph (with `{{brand}}` interpolated from
 * `t('common.brand.name')`), and an optional 2-3 column
 * secondary stat row sourced from the home metrics.
 *
 * BRAND FLOURISH — "SOBRE MÍ" / "About" micro-label stays fixed
 * per ADR-6 (Spanish brand flourish is part of the visual
 * identity); the heading + body copy is i18n-translated.
 */
import { useTranslation } from 'react-i18next';

import { cn } from '~/shared/lib/cn';

import { BentoCell } from '~/shared/ui/atoms/bento-cell';
import { MicroLabel } from '~/shared/ui/atoms/micro-label';

import type { HomeMetrics } from '~/home/schema';

export type ExpandedAboutBentoProps = {
	metrics: HomeMetrics;
	className?: string;
};

export function ExpandedAboutBento({
	metrics,
	className,
}: ExpandedAboutBentoProps) {
	const { t } = useTranslation();
	const brand = t('common.brand.name');

	return (
		<BentoCell
			variant="elevated"
			className={cn(
				'flex flex-col gap-6 p-8 md:p-10',
				className,
			)}
		>
			<header className="flex flex-col gap-2">
				<MicroLabel label="SOBRE MÍ" />
				<h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
					{t('home.about.title', { brand })}
				</h2>
			</header>

			<div className="grid gap-6 md:grid-cols-3">
				<p className="md:col-span-2 text-base text-muted-foreground md:text-lg">
					{t('home.about.body', { brand })}
				</p>
				<div className="grid grid-cols-3 gap-4 md:flex md:flex-col md:gap-3">
					<div className="flex flex-col gap-1 border-l border-outline-variant/40 pl-3 md:border-l-0 md:border-t md:pl-0 md:pt-3">
						<span className="font-display text-2xl font-semibold text-on-surface">
							{metrics.activeWorks}
						</span>
						<span className="text-xs uppercase tracking-widest text-muted-foreground">
							{t('home.about.stat1')}
						</span>
					</div>
					<div className="flex flex-col gap-1 border-l border-outline-variant/40 pl-3 md:border-l-0 md:border-t md:pl-0 md:pt-3">
						<span className="font-display text-2xl font-semibold text-on-surface">
							{metrics.retainedClients}
						</span>
						<span className="text-xs uppercase tracking-widest text-muted-foreground">
							{t('home.about.stat2')}
						</span>
					</div>
					<div className="flex flex-col gap-1 border-l border-outline-variant/40 pl-3 md:border-l-0 md:border-t md:pl-0 md:pt-3">
						<span className="font-display text-2xl font-semibold text-on-surface">
							{metrics.deliveredProjects}
						</span>
						<span className="text-xs uppercase tracking-widest text-muted-foreground">
							{t('home.about.stat3')}
						</span>
					</div>
				</div>
			</div>
		</BentoCell>
	);
}
