/**
 * `MetricsBento` — the 3-cell metrics row from the home
 * `homeMetrics` payload. Falls back to the design-time values
 * 124 / 48 / 92 per REQ-HOME-8 (BLOCKED-ON-BACKEND).
 *
 * BRAND FLOURISH — "[ Precision Metrics ]" micro-label is fixed.
 */
import { useTranslation } from 'react-i18next';

import { cn } from '~/shared/lib/cn';

import { BentoCell } from '~/shared/ui/atoms/bento-cell';
import { MicroLabel } from '~/shared/ui/atoms/micro-label';

import type { HomeMetrics } from '~/home/schema';

export type MetricsBentoProps = {
	metrics: HomeMetrics;
	className?: string;
};

export function MetricsBento({ metrics, className }: MetricsBentoProps) {
	const { t } = useTranslation();

	return (
		<section
			data-slot="metrics-bento"
			className={cn('grid gap-3 md:grid-cols-3', className)}
		>
			<BentoCell className="flex flex-col gap-2">
				<MicroLabel label="[ Precision Metrics ]" />
				<span className="font-display text-3xl font-semibold tracking-tight text-on-surface md:text-4xl">
					{metrics.activeWorks}
				</span>
				<p className="text-sm text-muted-foreground">
					{t('home.metrics.activeWorks')}
				</p>
			</BentoCell>
			<BentoCell className="flex flex-col gap-2">
				<MicroLabel label="[ Precision Metrics ]" />
				<span className="font-display text-3xl font-semibold tracking-tight text-on-surface md:text-4xl">
					{metrics.retainedClients}
				</span>
				<p className="text-sm text-muted-foreground">
					{t('home.metrics.retainedClients')}
				</p>
			</BentoCell>
			<BentoCell className="flex flex-col gap-2">
				<MicroLabel label="[ Precision Metrics ]" />
				<span className="font-display text-3xl font-semibold tracking-tight text-on-surface md:text-4xl">
					{metrics.deliveredProjects}
				</span>
				<p className="text-sm text-muted-foreground">
					{t('home.metrics.deliveredProjects')}
				</p>
			</BentoCell>
		</section>
	);
}
