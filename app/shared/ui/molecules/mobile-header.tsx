/**
 * `MobileHeader` — the public mobile header (md-).
 *
 * Slimmer than the desktop `PublicHeader`: brand on the left,
 * hamburger toggle on the right. The hamburger opens the mobile
 * menu (slice in `useUIStore.mobileMenuOpen`) in P1.
 */
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Menu } from 'lucide-react';

import { cn } from '~/shared/lib/cn';

import { useLocaleStore } from '~/shared/stores/locale';
import { useUIStore } from '~/shared/stores/ui';

import { IconButton } from '~/shared/ui/atoms/icon-button';

export type MobileHeaderProps = {
	className?: string;
};

export function MobileHeader({ className }: MobileHeaderProps) {
	const { t } = useTranslation();
	const locale = useLocaleStore((s) => s.locale);
	const toggleMobileMenu = useUIStore((s) => s.toggleMobileMenu);
	const base = locale === 'es' ? '/es' : '';

	return (
		<header
			data-slot="mobile-header"
			className={cn(
				'sticky top-0 z-40 flex w-full items-center justify-between border-b border-outline-variant/40 bg-background/80 px-4 py-3 backdrop-blur-md md:hidden',
				className,
			)}
		>
			<Link
				to={`${base}/`}
				aria-label={t('common.brand.name')}
				className="text-base font-semibold text-primary"
			>
				{t('common.brand.name')}
			</Link>
			<IconButton
				label="Open menu"
				variant="ghost"
				onClick={toggleMobileMenu}
				className="size-10"
			>
				<Menu className="size-5" aria-hidden="true" />
			</IconButton>
		</header>
	);
}
