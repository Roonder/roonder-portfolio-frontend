/**
 * `MobileTabBar` — the admin mobile tab bar.
 *
 * Three tabs: Projects / Reviews / Inbox. Per locked decision
 * Q-3/Q-20, only Projects is wired in v1; Reviews and Inbox are
 * placeholders that read a TODO comment in the verify report.
 */
import { Folder, Mail, Star } from 'lucide-react';

import { cn } from '~/shared/lib/cn';

import { useUIStore, type AdminTab } from '~/shared/stores/ui';

export type MobileTabBarProps = {
	className?: string;
};

type TabDef = {
	id: AdminTab;
	label: string;
	Icon: typeof Folder;
};

const TABS: TabDef[] = [
	{ id: 'projects', label: 'Projects', Icon: Folder },
	{ id: 'reviews', label: 'Reviews', Icon: Star },
	{ id: 'inbox', label: 'Inbox', Icon: Mail },
];

export function MobileTabBar({ className }: MobileTabBarProps) {
	const active = useUIStore((s) => s.activeAdminTab);
	const setActive = useUIStore((s) => s.setActiveAdminTab);
	return (
		<nav
			aria-label="Admin sections"
			data-slot="mobile-tab-bar"
			className={cn(
				'fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-outline-variant/40 bg-background/95 px-2 py-2 backdrop-blur-md md:hidden',
				className,
			)}
		>
			{TABS.map(({ id, label, Icon }) => {
				const isActive = active === id;
				return (
					<button
						key={id}
						type="button"
						onClick={() => setActive(id)}
						aria-pressed={isActive}
						className={cn(
							'inline-flex h-12 w-full flex-col items-center justify-center gap-0.5 text-xs font-semibold uppercase tracking-widest transition-colors',
							isActive
								? 'text-primary'
								: 'text-muted-foreground hover:text-primary',
						)}
					>
						<Icon className="size-5" aria-hidden="true" />
						<span>{label}</span>
					</button>
				);
			})}
		</nav>
	);
}
