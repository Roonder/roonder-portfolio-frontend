/**
 * `AdminHeader` — the desktop admin header.
 *
 * Re-skinned to Aurelian; carries the same `BrandMark` as the public
 * header (REQ: reuse the public brand identity in admin) followed by
 * the section label. The right side carries the user pill (the
 * locked `useSessionStore` user email is rendered when present). The
 * header is presentational — the user pill data comes from the
 * parent.
 */
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

import { cn } from '~/shared/lib/cn';

import { Avatar } from '~/shared/ui/atoms/avatar';
import { BrandMark } from '~/shared/ui/atoms/brand-mark';

export type AdminHeaderProps = {
	user?: { email: string } | null;
	className?: string;
};

export function AdminHeader({ user, className }: AdminHeaderProps) {
	const { t } = useTranslation();
	return (
		<header
			data-slot="admin-header"
			className={cn(
				'flex w-full items-center justify-between border-b border-outline-variant/40 bg-background/80 px-6 py-3 backdrop-blur-md',
				className,
			)}
		>
			<div className="flex items-center gap-3">
				<Link
					to="/administration-panel"
					aria-label={t('common.brand.name')}
					className="text-primary"
				>
					<BrandMark className="h-7 w-auto md:h-8" />
				</Link>
				<span className="hidden text-sm text-muted-foreground md:inline">
					{t('common.nav.admin')}
				</span>
			</div>
			{user ? (
				<div className="flex items-center gap-2">
					<Avatar name={user.email} size="sm" />
					<span className="text-sm text-on-surface">{user.email}</span>
				</div>
			) : null}
		</header>
	);
}
