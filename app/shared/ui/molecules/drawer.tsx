/**
 * `Drawer` — a right-side slide-in drawer.
 *
 * Reads `useUIStore` for `drawerOpen` + `drawerSlug`; closes via
 * the store's `closeDrawer()`. The animation is a `motion`
 * preset (cubic-bezier(0.16, 1, 0.3, 1), 500ms) wrapped in an
 * `AnimatePresence`. ESC + backdrop click close the drawer; the
 * `motion-reduce` media query shortens the animation to 0ms
 * (handled inside the preset).
 *
 * The drawer is intentionally presentational: the per-area page
 * decides when to open it and what content to render inside.
 */
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

import { cn } from '~/shared/lib/cn';

import { useUIStore } from '~/shared/stores/ui';
import { IconButton } from '~/shared/ui/atoms/icon-button';

export type DrawerProps = {
	children?: React.ReactNode;
	className?: string;
};

const panelVariants = {
	initial: { x: '100%' },
	animate: { x: 0 },
	exit: { x: '100%' },
} as const;

const backdropVariants = {
	initial: { opacity: 0 },
	animate: { opacity: 1 },
	exit: { opacity: 0 },
} as const;

export function Drawer({ children, className }: DrawerProps) {
	const open = useUIStore((s) => s.drawerOpen);
	const close = useUIStore((s) => s.closeDrawer);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') close();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open, close]);

	return (
		<AnimatePresence>
			{open ? (
				<motion.div
					key="drawer"
					className="fixed inset-0 z-50"
					initial="initial"
					animate="animate"
					exit="exit"
				>
					<motion.button
						type="button"
						aria-label="Close drawer"
						onClick={close}
						variants={backdropVariants}
						transition={{ duration: 0.2 }}
						className="absolute inset-0 bg-surface-container-lowest/80 backdrop-blur-sm"
					/>
					<motion.aside
						role="dialog"
						aria-modal="true"
						variants={panelVariants}
						transition={{ ease: [0.16, 1, 0.3, 1] as const, duration: 0.5 }}
						className={cn(
							'absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col border-l border-outline-variant/40 bg-surface-container shadow-2xl',
							className,
						)}
					>
						<div className="flex items-center justify-end border-b border-outline-variant/30 p-3">
							<IconButton label="Close" onClick={close} variant="ghost">
								<X className="size-4" aria-hidden="true" />
							</IconButton>
						</div>
						<div className="flex-1 overflow-y-auto p-6">{children}</div>
					</motion.aside>
				</motion.div>
			) : null}
		</AnimatePresence>
	);
}
