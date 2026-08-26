/**
 * `drawerSlide` — `motion` preset for the works detail drawer
 * (REQ-WORKS-4). The panel slides in from the right
 * (`x: 100%` → `x: 0`) with the design's cubic-bezier
 * (0.16, 1, 0.3, 1) ease over 500ms.
 *
 * Honors `prefers-reduced-motion`: when reduce is on, the duration
 * collapses to 0ms and the panel just appears.
 */
import type { Variants, Transition } from 'motion/react';

import { prefersReducedMotion } from '~/shared/animation/prefers-reduced-motion';

const reduced = prefersReducedMotion();

export const drawerSlideVariants: Variants = {
	initial: { x: '100%' },
	animate: { x: 0 },
	exit: { x: '100%' },
};

export const drawerSlideTransition: Transition = reduced
	? { duration: 0 }
	: { ease: [0.16, 1, 0.3, 1] as const, duration: 0.5 };
