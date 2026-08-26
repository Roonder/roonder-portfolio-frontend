/**
 * `AdminHeader` — the desktop admin header.
 *
 * Re-skinned to Aurelian; the right side carries the user pill
 * (the locked `useSessionStore` user email is rendered when
 * present). The header is presentational — the user pill data
 * comes from the parent.
 */
import { useTranslation } from 'react-i18next';

import { cn } from '~/shared/lib/cn';

import { Avatar } from '~/shared/ui/atoms/avatar';

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
			<div className="text-sm text-muted-foreground">
				{t('common.nav.admin')}
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
