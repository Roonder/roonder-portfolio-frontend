/**
 * `ExpandedAboutBento` — the expanded About section per Q-4
 * (REQ-HOME-3). Renders the brand micro-label, a heading, and the
 * body paragraph (with `{{brand}}` interpolated from
 * `t('common.brand.name')`). The secondary stat row was removed —
 * it duplicated the numbers already shown in `MetricsBento`
 * directly above this section on the home page.
 *
 * BRAND FLOURISH — "SOBRE MÍ" / "About" micro-label stays fixed
 * per ADR-6 (Spanish brand flourish is part of the visual
 * identity); the heading + body copy is i18n-translated.
 */
import { useTranslation } from 'react-i18next';

import { cn } from '~/shared/lib/cn';

import { BentoCell } from '~/shared/ui/atoms/bento-cell';
import { MicroLabel } from '~/shared/ui/atoms/micro-label';

export type ExpandedAboutBentoProps = {
	className?: string;
};

export function ExpandedAboutBento({ className }: ExpandedAboutBentoProps) {
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

			<p className="max-w-prose text-base text-muted-foreground md:text-lg">
				{t('home.about.body', { brand })}
			</p>
		</BentoCell>
	);
}
