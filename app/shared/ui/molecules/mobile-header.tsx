/**
 * `MobileHeader` — the public mobile header (md-).
 *
 * Slimmer than the desktop `PublicHeader`: brand mark only.
 * Mobile navigation lives entirely in `BottomNavDock`, so there is
 * no hamburger/menu toggle here.
 */
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

import { cn } from '~/shared/lib/cn';

import { useLocaleStore } from '~/shared/stores/locale';

import { BrandMark } from '~/shared/ui/atoms/brand-mark';

export type MobileHeaderProps = {
	className?: string;
};

export function MobileHeader({ className }: MobileHeaderProps) {
	const { t } = useTranslation();
	const locale = useLocaleStore((s) => s.locale);
	const base = locale === 'es' ? '/es' : '';

	return (
		<header
			data-slot="mobile-header"
			className={cn(
				'sticky top-0 z-40 flex w-full items-center justify-between border-b border-outline-variant/40 bg-background/80 px-4 py-3 backdrop-blur-md md:hidden',
				className,
			)}
		>
			<Link to={`${base}/`} aria-label={t('common.brand.name')} className="text-primary">
				<BrandMark className="h-7 w-auto" />
			</Link>
		</header>
	);
}
