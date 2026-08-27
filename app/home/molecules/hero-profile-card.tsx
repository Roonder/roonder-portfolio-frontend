/**
 * `HeroProfileCard` — the home hero: brand micro-label + headline
 * + subhead + primary CTA. The profile image is rendered as a
 * circular ring that sits on top of the `HeroOrb` decoration.
 *
 * BRAND FLOURISH — the "Technical Strategist" micro-label is
 * fixed visual identity (ADR-6); it does NOT go through i18n.
 */
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

import { cn } from '~/shared/lib/cn';

import { BentoCell } from '~/shared/ui/atoms/bento-cell';
import { MicroLabel } from '~/shared/ui/atoms/micro-label';

export type HeroProfileCardProps = {
	className?: string;
};

export function HeroProfileCard({ className }: HeroProfileCardProps) {
	const { t } = useTranslation(['common', 'home']);

	return (
		<BentoCell
			variant="elevated"
			className={cn(
				'relative flex flex-col gap-4 overflow-hidden p-8 md:p-10',
				className,
			)}
		>
			<div
				aria-hidden="true"
				className="absolute right-6 top-6 hidden size-24 rounded-full border-2 border-primary/40 bg-primary/10 backdrop-blur-md md:block"
			/>
			<MicroLabel label="Technical Strategist" />

			<h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-on-surface md:text-6xl">
				{t('common.brand.name')}
			</h1>

			<p className="max-w-prose text-base text-muted-foreground md:text-lg">
				{t('home.hero.subhead')}
			</p>

			<div className="mt-2 flex flex-wrap items-center gap-3">
				<Link
					to="/contact"
					className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-semibold uppercase tracking-widest text-primary-foreground transition-colors hover:bg-primary/90 motion-reduce:transition-none"
				>
					{t('home.hero.cta')}
				</Link>
				<Link
					to="/works"
					className="inline-flex h-11 items-center justify-center rounded-md border border-outline-variant/60 bg-transparent px-6 text-sm font-semibold uppercase tracking-widest text-on-surface transition-colors hover:border-primary/60 hover:text-primary motion-reduce:transition-none"
				>
					{t('home.hero.ctaSecondary')}
				</Link>
			</div>
		</BentoCell>
	);
}
