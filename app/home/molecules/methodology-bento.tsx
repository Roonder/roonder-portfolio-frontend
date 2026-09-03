/**
 * `MethodologyBento` — the 3-step "Understand, Plan, Act" method that
 * frames how the site owner works with clients.
 *
 * `MethodologyParticleField` is an ambient particle background filling the
 * whole card; the active phase's text floats centered on top of it in a
 * scrim card (autoplay + prev/next/dots). The particle field runs
 * continuously and independently of the active phase — it does not react to
 * navigation, it's purely decorative.
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '~/shared/lib/cn';

import { BentoCell } from '~/shared/ui/atoms/bento-cell';
import { MicroLabel } from '~/shared/ui/atoms/micro-label';
import { IconButton } from '~/shared/ui/atoms/icon-button';
import { prefersReducedMotion } from '~/shared/animation/prefers-reduced-motion';

import { MethodologyParticleField } from '~/home/molecules/methodology-particle-field';

export type MethodologyBentoProps = {
	className?: string;
};

const STEPS = ['understand', 'plan', 'act'] as const;
const AUTOPLAY_MS = 5000;

export function MethodologyBento({ className }: MethodologyBentoProps) {
	const { t } = useTranslation();
	const [reduced, setReduced] = useState(false);
	const [activeIndex, setActiveIndex] = useState(0);
	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => {
		setReduced(prefersReducedMotion());
	}, []);

	useEffect(() => {
		if (reduced) return;
		timerRef.current = setInterval(() => {
			setActiveIndex((i) => (i + 1) % STEPS.length);
		}, AUTOPLAY_MS);
		return () => {
			if (timerRef.current) clearInterval(timerRef.current);
		};
	}, [reduced]);

	const goTo = (index: number) => {
		if (timerRef.current) clearInterval(timerRef.current);
		setActiveIndex(((index % STEPS.length) + STEPS.length) % STEPS.length);
		if (!reduced) {
			timerRef.current = setInterval(() => {
				setActiveIndex((i) => (i + 1) % STEPS.length);
			}, AUTOPLAY_MS);
		}
	};

	return (
		<BentoCell
			variant="elevated"
			className={cn('flex flex-col gap-6 p-8 md:p-10', className)}
		>
			<header className="flex flex-col gap-2">
				<MicroLabel label="[ Methodology ]" />
				<h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
					{t('home.sections.methodology.title')}
				</h2>
				<p className="text-sm text-muted-foreground">
					{t('home.sections.methodology.subtitle')}
				</p>
			</header>

			<div className="relative h-[220px] overflow-hidden rounded-2xl">
				<MethodologyParticleField
					reduced={reduced}
					className="absolute inset-0"
				/>

				<div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
					<AnimatePresence mode="wait">
						<motion.div
							key={activeIndex}
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -8 }}
							transition={{ duration: 0.35, ease: 'easeOut' }}
							className="pointer-events-auto flex max-w-md flex-col items-center gap-2 rounded-2xl border border-outline-variant/40 bg-background/70 p-6 text-center backdrop-blur-md"
						>
							<span className="font-display text-lg font-semibold text-primary">
								{String(activeIndex + 1).padStart(2, '0')}
							</span>
							<h3 className="text-base font-semibold uppercase tracking-wide text-on-surface">
								{t(`home.sections.methodology.${STEPS[activeIndex]}.title`)}
							</h3>
							<p className="text-sm text-muted-foreground">
								{t(`home.sections.methodology.${STEPS[activeIndex]}.body`)}
							</p>
						</motion.div>
					</AnimatePresence>
				</div>
			</div>

			<div className="flex items-center justify-center gap-3">
				<IconButton
					label="Previous phase"
					variant="ghost"
					className="size-9"
					onClick={() => goTo(activeIndex - 1)}
				>
					<ChevronLeft className="size-4" aria-hidden="true" />
				</IconButton>

				<div className="flex items-center gap-2">
					{STEPS.map((step, index) => (
						<button
							key={step}
							type="button"
							aria-label={t(`home.sections.methodology.${step}.title`)}
							aria-current={index === activeIndex ? 'true' : undefined}
							onClick={() => goTo(index)}
							className={cn(
								'size-2 rounded-full transition-colors',
								index === activeIndex
									? 'bg-primary'
									: 'bg-outline-variant/50 hover:bg-outline-variant',
							)}
						/>
					))}
				</div>

				<IconButton
					label="Next phase"
					variant="ghost"
					className="size-9"
					onClick={() => goTo(activeIndex + 1)}
				>
					<ChevronRight className="size-4" aria-hidden="true" />
				</IconButton>
			</div>
		</BentoCell>
	);
}
