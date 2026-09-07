/**
 * `MobileTabBar` — the admin mobile tab bar.
 *
 * Three tabs: Projects / Reviews / Inbox. Per locked decision
 * Q-3/Q-20, only Projects was wired in v1; Reviews is now a real
 * moderation UI, so it navigates too. Inbox remains a placeholder
 * that pushes a "Coming soon" toast (REQ-ADM-6) until it ships.
 */
import { Folder, Mail, Star } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';

import { cn } from '~/shared/lib/cn';

import { useUIStore, type AdminTab } from '~/shared/stores/ui';
import { toast } from 'sonner';

export type MobileTabBarProps = {
	className?: string;
};

type TabDef = {
	id: AdminTab;
	label: string;
	Icon: typeof Folder;
	to: string;
};

const TABS: TabDef[] = [
	{ id: 'projects', label: 'Projects', Icon: Folder, to: '/administration-panel/projects' },
	{ id: 'reviews', label: 'Reviews', Icon: Star, to: '/administration-panel/reviews' },
	{ id: 'inbox', label: 'Inbox', Icon: Mail, to: '/administration-panel/contact' },
];

export function MobileTabBar({ className }: MobileTabBarProps) {
	const active = useUIStore((s) => s.activeAdminTab);
	const setActive = useUIStore((s) => s.setActiveAdminTab);
	const navigate = useNavigate();
	const { t } = useTranslation();

	function handleTabClick(tab: TabDef) {
		setActive(tab.id);
		if (tab.id === 'projects' || tab.id === 'reviews') {
			navigate(tab.to);
		} else {
			// Inbox is still a placeholder (Q-3 / Q-20)
			toast.info(t('admin.comingSoon'));
		}
	}

	return (
		<nav
			aria-label="Admin sections"
			data-slot="mobile-tab-bar"
			className={cn(
				'fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-outline-variant/40 bg-background/95 px-2 py-2 backdrop-blur-md md:hidden',
				className,
			)}
		>
			{TABS.map((tab) => {
				const isActive = active === tab.id;
				return (
					<button
						key={tab.id}
						type="button"
						onClick={() => handleTabClick(tab)}
						aria-pressed={isActive}
						className={cn(
							'inline-flex h-12 w-full flex-col items-center justify-center gap-0.5 text-xs font-semibold uppercase tracking-widest transition-colors',
							isActive
								? 'text-primary'
								: 'text-muted-foreground hover:text-primary',
						)}
					>
						<tab.Icon className="size-5" aria-hidden="true" />
						<span>{tab.label}</span>
					</button>
				);
			})}
		</nav>
	);
}
