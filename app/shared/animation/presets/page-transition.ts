/**
 * `pageTransition` — `motion` preset for layout-level route
 * transitions.
 *
 * Usage: wrap the layout's `<Outlet />` in an
 * `<AnimatePresence mode="wait">` and apply
 * `variants={pageTransitionVariants}` + `transition={pageTransitionTransition}`
 * to the motion-wrapped Outlet. P1 wires this into `_public.tsx`.
 *
 * Honors `prefers-reduced-motion`: when reduce is on, the duration
 * collapses to 0ms.
 */
import type { Variants, Transition } from 'motion/react';

import { prefersReducedMotion } from '~/shared/animation/prefers-reduced-motion';

const reduced = prefersReducedMotion();

export const pageTransitionVariants: Variants = {
	initial: { opacity: 0, y: 8 },
	animate: { opacity: 1, y: 0 },
	exit: { opacity: 0, y: -4 },
};

export const pageTransitionTransition: Transition = reduced
	? { duration: 0 }
	: { ease: 'easeOut', duration: 0.25 };
