/**
 * `BottomNavDock` — the floating "pill" mobile nav dock at the
 * bottom of the viewport.
 *
 * Per the design: "A floating 'pill' dock at the bottom of the
 * screen. Semi-transparent background with a heavy background
 * blur (20px) and a 1px gold border. Icons should be minimal,
 * thin-stroke (1.5px) weight."
 *
 * The dock is presentational; the active state is computed from
 * the current pathname. The dock hides on desktop (md+).
 *
 * It also slides out of view on scroll-down and back in on
 * scroll-up (this is the only mobile nav affordance now that the
 * header hamburger is gone), tracked via `useScroll` +
 * `useMotionValueEvent` and skipped entirely under
 * `prefers-reduced-motion`.
 */
import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Home, Briefcase, Mail, ShieldCheck } from 'lucide-react';
import { motion, useScroll, useMotionValueEvent, useReducedMotion } from 'motion/react';

import { cn } from '~/shared/lib/cn';

import { useLocaleStore } from '~/shared/stores/locale';

export type BottomNavDockProps = {
	className?: string;
	/** When true, render the admin tab in the dock (admin pages). */
	adminHref?: string;
};

export function BottomNavDock({ className, adminHref }: BottomNavDockProps) {
	const { t } = useTranslation();
	const locale = useLocaleStore((s) => s.locale);
	const { pathname } = useLocation();
	const base = locale === 'es' ? '/es' : '';

	const prefersReducedMotion = useReducedMotion();
	const { scrollY } = useScroll();
	const [hidden, setHidden] = useState(false);

	useMotionValueEvent(scrollY, 'change', (current) => {
		const previous = scrollY.getPrevious() ?? current;
		const delta = current - previous;
		if (current < 48) {
			setHidden(false);
			return;
		}
		if (delta > 4) setHidden(true);
		else if (delta < -4) setHidden(false);
	});

	const items = [
		{ to: `${base}/`, label: t('common.nav.home'), Icon: Home },
		{ to: `${base}/works`, label: t('common.nav.works'), Icon: Briefcase },
		{ to: `${base}/contact`, label: t('common.nav.contact'), Icon: Mail },
	];

	return (
		<motion.nav
			aria-label="Primary mobile"
			data-slot="bottom-nav-dock"
			animate={
				prefersReducedMotion
					? { opacity: 1, y: 0 }
					: { y: hidden ? 96 : 0, opacity: hidden ? 0 : 1 }
			}
			transition={{ duration: 0.25, ease: 'easeOut' }}
			className={cn(
				'fixed inset-x-0 bottom-4 z-50 mx-auto flex w-fit items-center gap-1 rounded-full border border-primary/40 bg-surface-container-low/60 px-2 py-2 backdrop-blur-xl md:hidden',
				'stroke-1.5',
				className,
			)}
		>
			{items.map(({ to, label, Icon }) => {
				const active =
					to === `${base}/` ? pathname === to : pathname.startsWith(to);
				return (
					<Link
						key={to}
						to={to}
						aria-current={active ? 'page' : undefined}
						className={cn(
							'inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors',
							active
								? 'bg-primary text-primary-foreground'
								: 'text-muted-foreground hover:text-primary',
						)}
					>
						<Icon className="size-[18px] stroke-[1.5]" aria-hidden="true" />
						<span className="sr-only">{label}</span>
					</Link>
				);
			})}
			{adminHref ? (
				<Link
					to={adminHref}
					className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-primary"
				>
					<ShieldCheck className="size-[18px] stroke-[1.5]" aria-hidden="true" />
					<span className="sr-only">{t('common.nav.admin')}</span>
				</Link>
			) : null}
		</motion.nav>
	);
}
