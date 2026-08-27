/**
 * `PublicHeader` — the public site header.
 *
 * Layout: brand pill on the left (the canonical
 * `common.brand.name`), nav links in the middle (Home, Works,
 * Contact), locale switcher + admin CTA on the right. The header
 * is a `flex` row; mobile collapses the nav into a menu button
 * (wired by the mobile menu slice in `useUIStore` in P1).
 */
import { Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';

import { cn } from '~/shared/lib/cn';

import { LocaleSwitcher } from '~/shared/ui/molecules/locale-switcher';
import { useLocaleStore } from '~/shared/stores/locale';

export type PublicHeaderProps = {
	className?: string;
};

export function PublicHeader({ className }: PublicHeaderProps) {
	const { t } = useTranslation();
	const locale = useLocaleStore((s) => s.locale);
	const { pathname } = useLocation();
	const base = locale === 'es' ? '/es' : '';

	const nav = [
		{ to: `${base}/`, label: t('common.nav.home') },
		{ to: `${base}/works`, label: t('common.nav.works') },
		{ to: `${base}/contact`, label: t('common.nav.contact') },
	];

	return (
		<header
			data-slot="public-header"
			className={cn(
				'sticky top-0 z-40 flex w-full items-center justify-between gap-4 border-b border-outline-variant/40 bg-background/80 px-6 py-3.5 backdrop-blur-md',
				className,
			)}
		>
			<Link
				to={`${base}/`}
				aria-label={t('common.brand.name')}
				className="text-lg font-semibold tracking-tight text-primary md:text-xl"
			>
				{t('common.brand.name')}
			</Link>

			<nav
				aria-label="Primary"
				className="hidden items-center gap-6 text-sm font-medium text-on-surface md:flex"
			>
				{nav.map((item) => {
					const active =
						item.to === `${base}/`
							? pathname === item.to
							: pathname.startsWith(item.to);
					return (
						<Link
							key={item.to}
							to={item.to}
							aria-current={active ? 'page' : undefined}
							className={cn(
								'transition-colors hover:text-primary',
								active ? 'text-primary' : 'text-muted-foreground',
							)}
						>
							{item.label}
						</Link>
					);
				})}
			</nav>

			<div className="flex items-center gap-2">
				<LocaleSwitcher currentPathname={pathname} />
				<Link
					to="/admin/auth"
					className="hidden text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary md:inline-flex"
				>
					{t('common.nav.admin')}
				</Link>
			</div>
		</header>
	);
}
