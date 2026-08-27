/**
 * `AdminSidebar` — the desktop admin sidebar.
 *
 * Re-skinned to the Aurelian palette in P0 (token swap, no
 * behavior change — the locked `admin-auth` spec is untouched).
 * The sidebar renders the brand + nav items + the sign-out
 * action; the active item is computed from the current pathname.
 */
import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Folder, Home, LogOut, Mail, Star } from 'lucide-react';

import { cn } from '~/shared/lib/cn';

import { MicroLabel } from '~/shared/ui/atoms/micro-label';

export type AdminSidebarProps = {
	className?: string;
};

type NavItem = { to: string; label: string; Icon: typeof Home };

const NAV: NavItem[] = [
	{ to: '/admin', label: 'Overview', Icon: Home },
	{ to: '/admin/projects', label: 'Projects', Icon: Folder },
	{ to: '/admin/reviews', label: 'Reviews', Icon: Star },
	{ to: '/admin/contact', label: 'Inbox', Icon: Mail },
];

export function AdminSidebar({ className }: AdminSidebarProps) {
	const { t } = useTranslation();
	return (
		<aside
			data-slot="admin-sidebar"
			className={cn(
				'hidden w-60 shrink-0 flex-col border-r border-outline-variant/40 bg-background px-4 py-6 md:flex',
				className,
			)}
		>
			<div className="flex items-center gap-2 px-2 pb-6">
				<span className="text-base font-semibold text-primary">
					{t('common.brand.name')}
				</span>
				<MicroLabel label="Admin" />
			</div>

			<nav aria-label="Admin" className="flex flex-col gap-1">
				{NAV.map(({ to, label, Icon }) => (
					<NavLink
						key={to}
						to={to}
						end={to === '/admin'}
						className={({ isActive }) =>
							cn(
								'inline-flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
								isActive
									? 'bg-surface-container-high text-primary'
									: 'text-muted-foreground hover:bg-surface-container hover:text-primary',
							)
						}
					>
						<Icon className="size-4" aria-hidden="true" />
						{label}
					</NavLink>
				))}
			</nav>

			<div className="mt-auto pt-6">
				<form method="post" action="/admin/auth/logout">
					<button
						type="submit"
						className="inline-flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-container hover:text-primary"
					>
						<LogOut className="size-4" aria-hidden="true" />
						Sign out
					</button>
				</form>
			</div>
		</aside>
	);
}
