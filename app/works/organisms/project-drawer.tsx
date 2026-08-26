/**
 * `ProjectDrawer` — the works catalog side drawer (desktop)
 * and bottom sheet (mobile) per REQ-WORKS-4.
 *
 * On desktop (≥ 768px) the panel slides in from the right (the
 * existing shared `Drawer` molecule). On mobile (< 768px) the
 * panel slides up from the bottom with a `rounded-t-[32px]` card.
 * Both render the SAME in-page preview content (hero image +
 * title + meta + body + Launch Live Experience button); the
 * button navigates to the canonical `/works/:slug` URL.
 *
 * The drawer reads `useUIStore.drawerSlug`; the page sets it via
 * `useUIStore.setDrawer(true, slug)` when a card is clicked.
 */
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

import { cn } from '~/shared/lib/cn';

import { useUIStore } from '~/shared/stores/ui';
import { useToastStore } from '~/shared/stores/toasts';
import { IconButton } from '~/shared/ui/atoms/icon-button';
import { MicroLabel } from '~/shared/ui/atoms/micro-label';
import { ProjectMeta } from '~/works/molecules/project-meta';

import type { Project } from '~/home/schema';

export type ProjectDrawerProps = {
	/** Map of slug → Project for the in-page preview. */
	projectsBySlug: Record<string, Project>;
	className?: string;
};

const DESKTOP_TRANSITION = {
	ease: [0.16, 1, 0.3, 1] as const,
	duration: 0.5,
};
const MOBILE_TRANSITION = {
	ease: [0.32, 0.72, 0, 1] as const,
	duration: 0.5,
};

export function ProjectDrawer({
	projectsBySlug,
	className,
}: ProjectDrawerProps) {
	const { t } = useTranslation();
	const open = useUIStore((s) => s.drawerOpen);
	const slug = useUIStore((s) => s.drawerSlug);
	const close = useUIStore((s) => s.closeDrawer);
	const pushToast = useToastStore((s) => s.push);

	const project = slug ? projectsBySlug[slug] : null;

	const handleLiveLaunch = () => {
		if (!project) return;
		close();
		pushToast({
			kind: 'info',
			message: t('works.drawer.launching', { title: project.title }),
		});
	};

	return (
		<AnimatePresence>
			{open && project ? (
				<motion.div
					key="project-drawer"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className={cn('fixed inset-0 z-50', className)}
				>
					<motion.button
						type="button"
						aria-label={t('works.drawer.close')}
						onClick={close}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
						className="absolute inset-0 bg-surface-container-lowest/80 backdrop-blur-sm"
					/>

					{/* Desktop: side drawer (right) */}
					<motion.aside
						role="dialog"
						aria-modal="true"
						aria-label={t('works.drawer.title')}
						initial={{ x: '100%' }}
						animate={{ x: 0 }}
						exit={{ x: '100%' }}
						transition={DESKTOP_TRANSITION}
						className="absolute top-0 right-0 hidden h-full w-full max-w-2xl flex-col overflow-y-auto border-l border-outline-variant/40 bg-surface-container shadow-2xl md:flex"
					>
						<DrawerContent
							project={project}
							onClose={close}
							onLaunch={handleLiveLaunch}
						/>
					</motion.aside>

					{/* Mobile: bottom sheet (slides up, rounded top) */}
					<motion.aside
						role="dialog"
						aria-modal="true"
						aria-label={t('works.drawer.title')}
						initial={{ y: '100%' }}
						animate={{ y: 0 }}
						exit={{ y: '100%' }}
						transition={MOBILE_TRANSITION}
						className="absolute inset-x-0 bottom-0 flex max-h-[90vh] flex-col overflow-hidden rounded-t-[32px] border-t border-outline-variant/40 bg-surface-container shadow-2xl md:hidden"
					>
						<DrawerContent
							project={project}
							onClose={close}
							onLaunch={handleLiveLaunch}
							bottomSheet
						/>
					</motion.aside>
				</motion.div>
			) : null}
		</AnimatePresence>
	);
}

type DrawerContentProps = {
	project: Project;
	onClose: () => void;
	onLaunch: () => void;
	bottomSheet?: boolean;
};

function DrawerContent({
	project,
	onClose,
	onLaunch,
	bottomSheet,
}: DrawerContentProps) {
	const { t } = useTranslation();
	return (
		<>
			{bottomSheet ? (
				<div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-outline-variant/60" />
			) : null}
			<div className="flex items-center justify-end border-b border-outline-variant/30 p-3">
				<IconButton label={t('works.drawer.close')} onClick={onClose}>
					<X className="size-4" aria-hidden="true" />
				</IconButton>
			</div>
			{project.coverImage ? (
				<div
					className={cn(
						'w-full overflow-hidden bg-surface-container',
						bottomSheet ? 'h-[50vh]' : 'aspect-[16/9]',
					)}
				>
					<img
						src={project.coverImage}
						alt={project.title}
						className="size-full object-cover"
					/>
				</div>
			) : null}
			<div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
				<MicroLabel label="[ Project Preview ]" />
				<h2 className="font-display text-2xl font-semibold leading-tight md:text-3xl">
					{project.title}
				</h2>
				<ProjectMeta tags={project.tags} hours={project.hours} />
				<p className="text-sm text-muted-foreground md:text-base">
					{project.description}
				</p>
				{project.content ? (
					<p className="text-sm leading-relaxed text-muted-foreground">
						{project.content}
					</p>
				) : null}
				<Link
					to={`/works/${project.slug}`}
					onClick={onLaunch}
					className="mt-4 inline-flex h-11 w-fit items-center justify-center rounded-md bg-primary px-6 text-sm font-semibold uppercase tracking-widest text-primary-foreground transition-colors hover:bg-primary/90"
				>
					{t('works.drawer.launch')}
				</Link>
			</div>
		</>
	);
}
